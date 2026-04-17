import { authProviders } from "../config/providers.ts";
import { buildOAuthStartPath } from "../model/auth.ts";
import AuthButton from "./AuthButton.tsx";

type OAuthLoginActionsProps = {
  redirectTo: string;
};

export default function OAuthLoginActions({
  redirectTo,
}: OAuthLoginActionsProps) {
  return (
    <div className="auth-button-group" aria-label="Social login providers">
      {authProviders.map((provider) => (
        <AuthButton
          key={provider.id}
          provider={provider.id}
          label="Continue"
          href={buildOAuthStartPath(provider.id, redirectTo)}
        />
      ))}
    </div>
  );
}
