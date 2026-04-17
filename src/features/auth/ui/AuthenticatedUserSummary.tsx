import type { SessionUser } from "../../../platform/session/session.ts";
import { getAuthenticatedUserSummaryDetails } from "../model/account-ui.ts";

type AuthenticatedUserSummaryProps = {
  user: SessionUser;
};

export default function AuthenticatedUserSummary({
  user,
}: AuthenticatedUserSummaryProps) {
  const summary = getAuthenticatedUserSummaryDetails(user);

  return (
    <section className="authenticated-user-summary" aria-label="Signed-in user">
      <div className="authenticated-user-summary__top">
        <div>
          <p className="eyebrow">Signed In</p>
          <strong className="authenticated-user-summary__name">
            {summary.name}
          </strong>
          {summary.email ? (
            <p className="authenticated-user-summary__email">{summary.email}</p>
          ) : null}
        </div>
        <span className="authenticated-user-summary__badge">
          {summary.providerLabel}
        </span>
      </div>

      <div className="authenticated-user-summary__meta">
        <span className="authenticated-user-summary__label">
          Current sign-in provider
        </span>
        <strong>{summary.providerLabel}</strong>
      </div>
    </section>
  );
}
