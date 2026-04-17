import AppShell from "../app/layout/AppShell";
import AuthenticatedSessionPanel from "../features/auth/ui/AuthenticatedSessionPanel";
import SignOutForm from "../features/auth/ui/SignOutForm";
import EmptyState from "../shared/ui/EmptyState";

export default function AppPage() {
  return (
    <AppShell
      brand="Teamspace"
      title="Signed-in workspace"
      subtitle="This protected area is intentionally minimal: confirm the current session, preserve the Worker-based auth boundary, and leave real product modules for later stages."
      navigationItems={[
        {
          label: "Module Slot A",
          description: "Reserved for a future protected feature module.",
        },
        {
          label: "Module Slot B",
          description: "Keeps the app shell shape stable before product work.",
        },
        {
          label: "Module Slot C",
          description: "Another future feature area, intentionally empty now.",
        },
      ]}
      headerActions={<SignOutForm />}
    >
      <AuthenticatedSessionPanel />
      <EmptyState
        eyebrow="Main Content"
        title="Protected app base"
        description="The protected route boundary is active, the signed-in user is visible, and no real domain feature module has been started yet."
      />
    </AppShell>
  );
}
