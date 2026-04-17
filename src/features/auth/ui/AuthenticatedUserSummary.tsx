import type { SessionUser } from "../../../platform/session/session.ts";
import { getAuthProviderLabel } from "../config/providers.ts";

type AuthenticatedUserSummaryProps = {
  user: SessionUser;
};

export default function AuthenticatedUserSummary({
  user,
}: AuthenticatedUserSummaryProps) {
  const providerLabel = getAuthProviderLabel(user.provider) ?? user.provider;

  return (
    <section className="authenticated-user-summary" aria-label="Signed-in user">
      <p className="eyebrow">Signed In</p>
      <div className="authenticated-user-summary__grid">
        <div>
          <span className="authenticated-user-summary__label">
            Display name
          </span>
          <strong>{user.name}</strong>
        </div>
        <div>
          <span className="authenticated-user-summary__label">Provider</span>
          <strong>{providerLabel}</strong>
        </div>
        <div>
          <span className="authenticated-user-summary__label">
            Internal user
          </span>
          <strong>{user.id}</strong>
        </div>
      </div>
    </section>
  );
}
