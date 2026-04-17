import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import {
  getAuthErrorMessage,
  getHomeRouteBehavior,
} from "../features/auth/model/auth";
import { getAuthProviderLabel } from "../features/auth/config/providers.ts";
import { useAuthState } from "../features/auth/model/useAuthState";
import OAuthLoginActions from "../features/auth/ui/OAuthLoginActions";
import EmptyState from "../shared/ui/EmptyState";
import PageContainer from "../shared/ui/PageContainer";

export default function HomePage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const authState = useAuthState();
  const redirectTo =
    typeof location.state?.from === "string" ? location.state.from : "/app";
  const authError = searchParams.get("authError");
  const authProvider = searchParams.get("authProvider");
  const authProviderLabel = authProvider
    ? (getAuthProviderLabel(authProvider) ?? authProvider)
    : null;
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
            through the Worker boundary, then add real feature modules later
            without rewriting the page structure.
          </p>
        </div>

        <div className="landing-login-card">
          <div className="landing-login-card__header">
            <p className="eyebrow">Login Entry</p>
            <p className="hint">
              Social login now starts real provider authorization while keeping
              the auth/session boundary outside the page layer.
            </p>
          </div>

          {authError ? (
            <p className="hint" role="status">
              {`${getAuthErrorMessage(authError)} ${
                authProviderLabel ? `Provider: ${authProviderLabel}.` : ""
              }`}
            </p>
          ) : null}

          <OAuthLoginActions redirectTo={redirectTo} />
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__heading">
          <p className="eyebrow">After Login</p>
          <h2>What users will be able to do here</h2>
          <p className="page-copy">
            This section stays simple on purpose so future features can replace
            these placeholders without fighting the page structure.
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
            <h3>Use feature modules gradually</h3>
            <p>
              Add dashboard, profile, settings, or other modules later without
              mixing them into the public landing page.
            </p>
          </article>
          <article className="capability-card">
            <h3>Grow the post-login experience later</h3>
            <p>
              Real OAuth login start is already connected, while richer
              post-login UX can arrive later without changing the route boundary
              again.
            </p>
          </article>
        </div>
      </section>
    </PageContainer>
  );
}
