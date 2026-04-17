import {
  decodeSignedCookieValue,
  encodeSignedCookieValue,
  parseCookieHeader,
  serializeCookie,
} from "./cookies.ts";
import {
  getOAuthProviderConfig,
  getProviderCallbackPath,
  OAUTH_COOKIE_NAME,
  type OAuthProviderConfig,
  type OAuthProviderId,
} from "./providers.ts";
import { createSessionCookie, type WorkerSession } from "./session.ts";

type OAuthStatePayload = {
  provider: OAuthProviderId;
  redirectTo: string;
  state: string;
};

type OAuthTokenResponse = {
  access_token: string;
};

type OAuthWorkerEnv = Pick<Env, never> & {
  AUTH_COOKIE_SECRET: string;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  KAKAO_OAUTH_CLIENT_ID: string;
  KAKAO_OAUTH_CLIENT_SECRET: string;
  NAVER_OAUTH_CLIENT_ID: string;
  NAVER_OAUTH_CLIENT_SECRET: string;
};

type OAuthWorkerEnvKey = keyof Pick<
  OAuthWorkerEnv,
  | "AUTH_COOKIE_SECRET"
  | "GOOGLE_OAUTH_CLIENT_ID"
  | "GOOGLE_OAUTH_CLIENT_SECRET"
  | "KAKAO_OAUTH_CLIENT_ID"
  | "KAKAO_OAUTH_CLIENT_SECRET"
  | "NAVER_OAUTH_CLIENT_ID"
  | "NAVER_OAUTH_CLIENT_SECRET"
>;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function createStateToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function isSecureRequest(url: URL) {
  return url.protocol === "https:";
}

function getClientId(env: OAuthWorkerEnv, provider: OAuthProviderConfig) {
  return env[provider.clientIdEnv as OAuthWorkerEnvKey];
}

function getClientSecret(env: OAuthWorkerEnv, provider: OAuthProviderConfig) {
  return env[provider.clientSecretEnv as OAuthWorkerEnvKey];
}

function normalizeRedirectTarget(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  return value;
}

function buildProviderFailureLocation(
  provider: OAuthProviderId,
  reason: string,
) {
  const params = new URLSearchParams({
    authError: reason,
    authProvider: provider,
  });

  return `/?${params.toString()}`;
}

function appendSetCookie(headers: Headers, value: string) {
  headers.append("set-cookie", value);
}

function redirectWithCookies(location: string, cookies: string[]) {
  const headers = new Headers({
    location,
  });

  for (const cookie of cookies) {
    appendSetCookie(headers, cookie);
  }

  return new Response(null, {
    status: 302,
    headers,
  });
}

async function exchangeAuthorizationCode(
  provider: OAuthProviderConfig,
  env: OAuthWorkerEnv,
  requestUrl: URL,
  code: string,
) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getClientId(env, provider),
    client_secret: getClientSecret(env, provider),
    code,
    redirect_uri: `${requestUrl.origin}${getProviderCallbackPath(provider.id)}`,
  });

  if (provider.id === "naver") {
    body.set("state", requestUrl.searchParams.get("state") ?? "");
  }

  const response = await fetch(provider.tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed for ${provider.id}`);
  }

  return (await response.json()) as OAuthTokenResponse;
}

function mapGoogleProfile(profile: Record<string, unknown>): WorkerSession {
  const subject = typeof profile.sub === "string" ? profile.sub : "";
  const name =
    typeof profile.name === "string" && profile.name
      ? profile.name
      : "Google User";
  const email = typeof profile.email === "string" ? profile.email : undefined;

  return {
    user: {
      id: `google:${subject}`,
      name,
      email,
      provider: "google",
    },
  };
}

function mapKakaoProfile(profile: Record<string, unknown>): WorkerSession {
  const account =
    profile.kakao_account && typeof profile.kakao_account === "object"
      ? (profile.kakao_account as Record<string, unknown>)
      : {};
  const nestedProfile =
    account.profile && typeof account.profile === "object"
      ? (account.profile as Record<string, unknown>)
      : {};
  const id = profile.id;
  const nickname =
    typeof nestedProfile.nickname === "string" && nestedProfile.nickname
      ? nestedProfile.nickname
      : "Kakao User";
  const email = typeof account.email === "string" ? account.email : undefined;

  return {
    user: {
      id: `kakao:${String(id ?? "")}`,
      name: nickname,
      email,
      provider: "kakao",
    },
  };
}

function mapNaverProfile(profile: Record<string, unknown>): WorkerSession {
  const response =
    profile.response && typeof profile.response === "object"
      ? (profile.response as Record<string, unknown>)
      : {};
  const id = typeof response.id === "string" ? response.id : "";
  const name =
    typeof response.name === "string" && response.name
      ? response.name
      : "Naver User";
  const email = typeof response.email === "string" ? response.email : undefined;

  return {
    user: {
      id: `naver:${id}`,
      name,
      email,
      provider: "naver",
    },
  };
}

async function fetchProviderSession(
  provider: OAuthProviderConfig,
  accessToken: string,
) {
  const response = await fetch(provider.userInfoEndpoint, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`User profile request failed for ${provider.id}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;

  switch (provider.id) {
    case "google":
      return mapGoogleProfile(payload);
    case "kakao":
      return mapKakaoProfile(payload);
    case "naver":
      return mapNaverProfile(payload);
  }
}

export async function handleOAuthStart(
  providerId: OAuthProviderId,
  env: OAuthWorkerEnv,
  request: Request,
) {
  const requestUrl = new URL(request.url);
  const provider = getOAuthProviderConfig(providerId);
  const state = createStateToken();
  const redirectTo = normalizeRedirectTarget(
    requestUrl.searchParams.get("redirectTo"),
  );
  const callbackUrl = `${requestUrl.origin}${getProviderCallbackPath(providerId)}`;
  const authorizationUrl = new URL(provider.authorizationEndpoint.toString());

  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", getClientId(env, provider));
  authorizationUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizationUrl.searchParams.set("state", state);

  if (provider.scopes.length > 0) {
    authorizationUrl.searchParams.set("scope", provider.scopes.join(" "));
  }

  const stateCookie = await encodeSignedCookieValue(env.AUTH_COOKIE_SECRET, {
    provider: providerId,
    redirectTo,
    state,
  } satisfies OAuthStatePayload);

  return redirectWithCookies(authorizationUrl.toString(), [
    serializeCookie(OAUTH_COOKIE_NAME, stateCookie, {
      secure: isSecureRequest(requestUrl),
    }),
  ]);
}

export async function handleOAuthCallback(
  providerId: OAuthProviderId,
  env: OAuthWorkerEnv,
  request: Request,
) {
  const requestUrl = new URL(request.url);
  const provider = getOAuthProviderConfig(providerId);
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return redirectWithCookies(
      buildProviderFailureLocation(providerId, error),
      [
        serializeCookie(OAUTH_COOKIE_NAME, "", {
          maxAge: 0,
          secure: isSecureRequest(requestUrl),
        }),
      ],
    );
  }

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const statePayload = await decodeSignedCookieValue<OAuthStatePayload>(
    env.AUTH_COOKIE_SECRET,
    cookies.get(OAUTH_COOKIE_NAME) ?? null,
  );

  if (
    !code ||
    !state ||
    !statePayload ||
    statePayload.provider !== providerId ||
    statePayload.state !== state
  ) {
    return redirectWithCookies(
      buildProviderFailureLocation(providerId, "invalid_state"),
      [
        serializeCookie(OAUTH_COOKIE_NAME, "", {
          maxAge: 0,
          secure: isSecureRequest(requestUrl),
        }),
      ],
    );
  }

  const token = await exchangeAuthorizationCode(
    provider,
    env,
    requestUrl,
    code,
  );
  const session = await fetchProviderSession(provider, token.access_token);

  return redirectWithCookies(statePayload.redirectTo, [
    await createSessionCookie(
      env.AUTH_COOKIE_SECRET,
      session,
      isSecureRequest(requestUrl),
    ),
    serializeCookie(OAUTH_COOKIE_NAME, "", {
      maxAge: 0,
      secure: isSecureRequest(requestUrl),
    }),
  ]);
}
