import AppShell from "../app/layout/AppShell";
import AuthenticatedSessionPanel from "../features/auth/ui/AuthenticatedSessionPanel";
import { NotesWorkspace } from "../features/notes/index.ts";
import SignOutForm from "../features/auth/ui/SignOutForm";

export default function AppPage() {
  return (
    <AppShell
      brand="Teamspace"
      title="Signed-in workspace"
      subtitle="The protected auth/session boundary stays intact while the first modular product feature lives inside the app shell."
      navigationItems={[
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
      headerActions={<SignOutForm />}
    >
      <AuthenticatedSessionPanel />
      <NotesWorkspace />
    </AppShell>
  );
}
