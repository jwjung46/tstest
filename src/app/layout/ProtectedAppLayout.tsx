import { Outlet } from "react-router-dom";
import AppShell from "./AppShell";
import { ThemeSelector } from "../../features/settings/index.ts";
import AppUserMenu from "./AppUserMenu.tsx";

export default function ProtectedAppLayout() {
  return (
    <AppShell
      brand="Teamspace"
      headerActions={
        <div className="app-shell__header-controls">
          <ThemeSelector />
          <AppUserMenu />
        </div>
      }
    >
      <Outlet />
    </AppShell>
  );
}
