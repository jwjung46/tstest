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
import type { WorkerEnv, WorkerEnvKey } from "../env.ts";
import { createSessionCookie, type WorkerSession } from "./session.ts";

type OAuthStatePayload = {
  provider: OAuthProviderId;
  redirectTo: string;
  state: string;
};

type OAuthTokenResponse = {
  access_token: string;
};

type OAuthFailureReason =
  | "access_denied"
  | "invalid_state"
  | "oauth_callback_failed"
  | "token_exchange_failed"
  | "userinfo_fetch_failed";

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

function getClientId(env: WorkerEnv, provider: OAuthProviderConfig) {
  return env[provider.clientIdEnv as WorkerEnvKey];
}

function getClientSecret(env: WorkerEnv, provider: OAuthProviderConfig) {
  return env[provider.clientSecretEnv as WorkerEnvKey];
}

function normalizeRedirectTarget(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  return value;
}

function buildProviderFailureLocation(
  provider: OAuthProviderId,
  reason: OAuthFailureReason,
) {
  const params = new URLSearchParams({
    authError: reason,
    authProvider: provider,
  });

  return `/?${params.toString()}`;
}

function mapProviderCallbackError(error: string): OAuthFailureReason {
  if (error === "access_denied") {
    return "access_denied";
  }

  return "oauth_callback_failed";
}

function buildFailureCookies(requestUrl: URL) {
  return [
    serializeCookie(OAUTH_COOKIE_NAME, "", {
      maxAge: 0,
      secure: isSecureRequest(requestUrl),
    }),
  ];
}

function redirectToProviderFailure(
  providerId: OAuthProviderId,
  reason: OAuthFailureReason,
  requestUrl: URL,
) {
  return redirectWithCookies(
    buildProviderFailureLocation(providerId, reason),
    buildFailureCookies(requestUrl),
  );
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
  env: WorkerEnv,
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
  env: WorkerEnv,
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
  env: WorkerEnv,
  request: Request,
) {
  const requestUrl = new URL(request.url);
  const provider = getOAuthProviderConfig(providerId);
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return redirectToProviderFailure(
      providerId,
      mapProviderCallbackError(error),
      requestUrl,
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
    return redirectToProviderFailure(providerId, "invalid_state", requestUrl);
  }

  let token: OAuthTokenResponse;

  try {
    token = await exchangeAuthorizationCode(provider, env, requestUrl, code);
  } catch {
    return redirectToProviderFailure(
      providerId,
      "token_exchange_failed",
      requestUrl,
    );
  }

  let session: WorkerSession;

  try {
    session = await fetchProviderSession(provider, token.access_token);
  } catch {
    return redirectToProviderFailure(
      providerId,
      "userinfo_fetch_failed",
      requestUrl,
    );
  }

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
