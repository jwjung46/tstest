import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { getAuthProviderLabel } from "../config/providers.ts";
import {
  getDefaultPostAuthRedirectTarget,
  getHomeRouteBehavior,
  getPublicAuthFeedback,
} from "../model/auth.ts";
import { useAuthState } from "../model/useAuthState.ts";
import OAuthLoginActions from "./OAuthLoginActions.tsx";
import EmptyState from "../../../shared/ui/EmptyState.tsx";
import PageContainer from "../../../shared/ui/PageContainer.tsx";

export default function PublicAuthEntry() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const authState = useAuthState();
  const authError = searchParams.get("authError");
  const authProvider = searchParams.get("authProvider");
  const authProviderLabel = authProvider
    ? (getAuthProviderLabel(authProvider) ?? authProvider)
    : null;
  const publicAuthFeedback = getPublicAuthFeedback({
    authError,
    authProviderLabel,
  });
  const redirectTo = getDefaultPostAuthRedirectTarget(location.state);
  const homeRouteBehavior = getHomeRouteBehavior(authState);

  if (homeRouteBehavior.kind === "redirect") {
    return <Navigate to={homeRouteBehavior.to} replace />;
  }

  if (homeRouteBehavior.kind === "pending") {
    return (
      <PageContainer className="page-container--landing">
        <EmptyState
          eyebrow="Checking Session"
          title="Checking your session"
          description="The current signed-in state is being confirmed before the public entry is shown."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="page-container--landing">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="eyebrow">Public Route</p>
          <span className="landing-hero__brand">Teamspace</span>
          <h1>One place to enter your protected work area.</h1>
          <p className="page-copy">
            Start from a clear landing page with real OAuth entry already wired
            through the Worker boundary, then add future protected modules later
            without rewriting the route structure.
          </p>
        </div>

        <div className="landing-login-card">
          <div className="landing-login-card__header">
            <p className="eyebrow">Login Entry</p>
            <p className="hint">
              Social login starts real provider authorization while keeping the
              auth/session boundary outside the page layer.
            </p>
          </div>

          {publicAuthFeedback ? (
            <p className="hint" role="status">
              {publicAuthFeedback}
            </p>
          ) : null}

          {authState.recentLoginProvider ? (
            <p className="hint" role="status">
              Recent login:{" "}
              {getAuthProviderLabel(authState.recentLoginProvider) ??
                authState.recentLoginProvider}
            </p>
          ) : null}

          <OAuthLoginActions redirectTo={redirectTo} />
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__heading">
          <p className="eyebrow">After Login</p>
          <h2>What this base app already guarantees</h2>
          <p className="page-copy">
            The protected route, current-session display, and Worker-based
            sign-out are present now. Real product modules still stay out of
            scope until later stages.
          </p>
        </div>

        <div className="capability-grid">
          <article className="capability-card">
            <h3>Enter the protected workspace</h3>
            <p>
              Land inside a stable app shell with clear header, sidebar, and
              content boundaries.
            </p>
          </article>
          <article className="capability-card">
            <h3>Confirm the current signed-in user</h3>
            <p>
              Keep the first authenticated UX intentionally small with session
              visibility and sign-out only.
            </p>
          </article>
          <article className="capability-card">
            <h3>Reuse the base for later apps</h3>
            <p>
              The structure stays intentionally empty so future apps can add
              feature modules without rewriting auth or route boundaries.
            </p>
          </article>
        </div>
      </section>
    </PageContainer>
  );
}
