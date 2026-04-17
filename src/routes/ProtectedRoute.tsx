import { Navigate, Outlet, useLocation } from "react-router-dom";
import EmptyState from "../shared/ui/EmptyState";
import PageContainer from "../shared/ui/PageContainer";
import {
  buildAuthRedirectTarget,
  getAuthState,
} from "../features/auth/model/auth";

export default function ProtectedRoute() {
  const location = useLocation();
  const authState = getAuthState();

  if (authState.status === "loading") {
    return (
      <PageContainer className="page-container--landing">
        <EmptyState
          eyebrow="Checking Session"
          title="Checking access"
          description="Authentication state is being resolved before entering the protected app area."
        />
      </PageContainer>
    );
  }

  if (authState.status === "unauthenticated") {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: buildAuthRedirectTarget({
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          }),
        }}
      />
    );
  }

  return <Outlet />;
}
