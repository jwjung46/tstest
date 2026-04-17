export const authProviders = [
  {
    id: "google",
    label: "Google",
  },
  {
    id: "kakao",
    label: "Kakao",
  },
  {
    id: "naver",
    label: "Naver",
  },
] as const;

export type AuthProviderId = (typeof authProviders)[number]["id"];

export function isAuthProviderId(value: string): value is AuthProviderId {
  return authProviders.some((provider) => provider.id === value);
}
