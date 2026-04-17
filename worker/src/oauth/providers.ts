export const OAUTH_COOKIE_NAME = "__oauth_state";
export const SESSION_COOKIE_NAME = "__session";

export const oauthProviders = [
  {
    id: "google",
    label: "Google",
    authorizationEndpoint: new URL(
      "https://accounts.google.com/o/oauth2/v2/auth",
    ),
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
    scopes: ["openid", "profile", "email"],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
  },
  {
    id: "kakao",
    label: "Kakao",
    authorizationEndpoint: new URL("https://kauth.kakao.com/oauth/authorize"),
    tokenEndpoint: "https://kauth.kakao.com/oauth/token",
    userInfoEndpoint: "https://kapi.kakao.com/v2/user/me",
    scopes: ["profile_nickname", "account_email"],
    clientIdEnv: "KAKAO_OAUTH_CLIENT_ID",
    clientSecretEnv: "KAKAO_OAUTH_CLIENT_SECRET",
  },
  {
    id: "naver",
    label: "Naver",
    authorizationEndpoint: new URL("https://nid.naver.com/oauth2.0/authorize"),
    tokenEndpoint: "https://nid.naver.com/oauth2.0/token",
    userInfoEndpoint: "https://openapi.naver.com/v1/nid/me",
    scopes: ["name", "email"],
    clientIdEnv: "NAVER_OAUTH_CLIENT_ID",
    clientSecretEnv: "NAVER_OAUTH_CLIENT_SECRET",
  },
] as const;

export type OAuthProviderId = (typeof oauthProviders)[number]["id"];
export type OAuthProviderConfig = (typeof oauthProviders)[number];

export function listOAuthProviders() {
  return oauthProviders;
}

export function isOAuthProviderId(value: string): value is OAuthProviderId {
  return oauthProviders.some((provider) => provider.id === value);
}

export function getOAuthProviderConfig(
  providerId: OAuthProviderId,
): OAuthProviderConfig {
  const provider = oauthProviders.find((entry) => entry.id === providerId);

  if (!provider) {
    throw new Error(`Unsupported OAuth provider: ${providerId}`);
  }

  return provider;
}

export function getProviderCallbackPath(providerId: OAuthProviderId) {
  return `/auth/${providerId}/callback`;
}

export function getProviderStartPath(providerId: OAuthProviderId) {
  return `/auth/${providerId}/start`;
}
