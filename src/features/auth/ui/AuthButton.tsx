import type { CSSProperties } from "react";
import { authProviderBrands } from "../config/provider-brands.ts";
import {
  getAuthProviderLabel,
  type AuthProviderId,
} from "../config/providers.ts";

type AuthButtonProps = {
  provider: AuthProviderId;
  label: string;
  href: string;
};

export default function AuthButton({ provider, label, href }: AuthButtonProps) {
  const providerName = getAuthProviderLabel(provider) ?? provider;
  const providerBrand = authProviderBrands[provider];
  const providerStyle = {
    "--auth-provider-background": providerBrand.background,
    "--auth-provider-foreground": providerBrand.foreground,
    "--auth-provider-muted-foreground": providerBrand.mutedForeground,
    "--auth-provider-border": providerBrand.border,
  } as CSSProperties;

  return (
    <a className="auth-button" href={href} style={providerStyle}>
      <span className="auth-button__provider">{providerName}</span>
      <span className="auth-button__label">{label}</span>
    </a>
  );
}
