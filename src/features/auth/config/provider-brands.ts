import type { AuthProviderId } from "./providers.ts";

export type AuthProviderBrand = {
  background: string;
  foreground: string;
  mutedForeground: string;
  border: string;
};

export const authProviderBrands: Record<AuthProviderId, AuthProviderBrand> = {
  google: {
    background: "#ffffff",
    foreground: "#132238",
    mutedForeground: "#526277",
    border: "rgba(19, 34, 56, 0.12)",
  },
  kakao: {
    background: "#fee500",
    foreground: "#181600",
    mutedForeground: "rgba(24, 22, 0, 0.72)",
    border: "rgba(24, 22, 0, 0.12)",
  },
  naver: {
    background: "#03c75a",
    foreground: "#ffffff",
    mutedForeground: "rgba(255, 255, 255, 0.82)",
    border: "rgba(3, 199, 90, 0.16)",
  },
};
