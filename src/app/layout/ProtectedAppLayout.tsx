import { Outlet, useLocation } from "react-router-dom";
import AppShell from "./AppShell";
import { ThemeSelector } from "../../features/settings/index.ts";
import AppUserMenu from "./AppUserMenu.tsx";
import { APP_ROUTES } from "../router/paths.ts";

export default function ProtectedAppLayout() {
  const location = useLocation();
  const contentMode =
    location.pathname === APP_ROUTES.home ? "blank" : "default";

  return (
    <AppShell
      brand="Teamspace"
      contentMode={contentMode}
      headerActions={
        <div className="app-shell__header-controls">
          <ThemeSelector variant="compact" />
          <AppUserMenu />
        </div>
      }
    >
      <Outlet />
    </AppShell>
  );
}
