import AppShell from "../app/layout/AppShell";
import AuthenticatedSessionPanel from "../features/auth/ui/AuthenticatedSessionPanel";
import { BillingOverviewPanel } from "../features/billing/index.ts";
import { NotesWorkspace } from "../features/notes/index.ts";
import SignOutForm from "../features/auth/ui/SignOutForm";
import { ThemeSelector } from "../features/settings/index.ts";

export default function AppPage() {
  return (
    <AppShell
      brand="Teamspace"
      headerActions={
        <div className="app-shell__header-controls">
          <ThemeSelector />
          <SignOutForm />
        </div>
      }
    >
      <AuthenticatedSessionPanel />
      <BillingOverviewPanel />
      <NotesWorkspace />
    </AppShell>
  );
}
