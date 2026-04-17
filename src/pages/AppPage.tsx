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
      title="Signed-in workspace"
      subtitle="The protected auth/session boundary stays intact while billing and notes stay feature-owned inside the app shell."
      navigationItems={[
        {
          label: "Billing",
          description: "Real Toss one-time payment, history, and entitlements.",
        },
        {
          label: "Notes",
          description: "Personal notes module backed by Worker APIs and D1.",
        },
        {
          label: "Future Module",
          description: "Reserved for the next protected feature module.",
        },
        {
          label: "Future Module",
          description: "Keeps the modular app shell shape stable.",
        },
      ]}
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
