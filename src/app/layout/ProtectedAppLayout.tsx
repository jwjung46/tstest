import { Outlet } from "react-router-dom";
import AppShell from "./AppShell";
import { ThemeSelector } from "../../features/settings/index.ts";
import AppUserMenu from "./AppUserMenu.tsx";

export default function ProtectedAppLayout() {
  return (
    <AppShell
      header={
        <div className="app-shell__header-inner">
          <div className="app-shell__brand">Teamspace</div>

          <div className="app-shell__header-controls">
            <ThemeSelector variant="compact" />
            <AppUserMenu />
          </div>
        </div>
      }
    >
      <div className="app-shell__page">
        <Outlet />
      </div>
    </AppShell>
  );
}
