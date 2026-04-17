import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSession } from "../features/auth/model/auth";

export default function ProtectedRoute() {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
