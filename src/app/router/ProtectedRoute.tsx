import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  buildAuthRedirectTarget,
  requireAuth,
} from "../../features/auth/model/auth";
import { useAuthState } from "../../features/auth/model/useAuthState";

export default function ProtectedRoute() {
  const location = useLocation();
  const authState = useAuthState();
  const authRequirement = requireAuth(authState);

  if (!authRequirement.allowed && authRequirement.reason === "loading") {
    return null;
  }

  if (
    !authRequirement.allowed &&
    authRequirement.reason === "unauthenticated"
  ) {
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
