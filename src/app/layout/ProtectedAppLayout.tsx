import { Outlet } from "react-router-dom";
import AppShell from "./AppShell";

export default function ProtectedAppLayout() {
  return (
    <AppShell brand="Teamspace">
      <Outlet />
    </AppShell>
  );
}
