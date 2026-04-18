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
      <div className="landing-login-card">
        <div className="landing-login-card__header">
          <span className="landing-login-card__brand">Teamspace</span>
          <h1 className="landing-login-card__title">Sign in</h1>
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
    </PageContainer>
  );
}
