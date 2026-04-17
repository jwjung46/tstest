import type { AuthProviderId } from "../config/providers.ts";

type AuthButtonProps = {
  provider: AuthProviderId;
  label: string;
  href: string;
};

export default function AuthButton({ provider, label, href }: AuthButtonProps) {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  return (
    <a className={`auth-button auth-button--${provider}`} href={href}>
      <span className="auth-button__provider">{providerName}</span>
      <span className="auth-button__label">{label}</span>
    </a>
  );
}
