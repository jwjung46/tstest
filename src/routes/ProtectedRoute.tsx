import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "../features/auth/model/auth";

export default function ProtectedRoute() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
