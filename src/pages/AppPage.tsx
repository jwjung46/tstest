import AppShell from "../app/layout/AppShell";
import { useAuthState } from "../features/auth/model/useAuthState";
import AuthenticatedUserSummary from "../features/auth/ui/AuthenticatedUserSummary";
import SignOutForm from "../features/auth/ui/SignOutForm";
import EmptyState from "../shared/ui/EmptyState";

export default function AppPage() {
  const authState = useAuthState();
  const currentUser =
    authState.status === "authenticated" ? authState.user : null;

  return (
    <AppShell
      brand="Teamspace"
      title="Signed-in workspace"
      subtitle="The first authenticated experience stays small: confirm who is signed in, keep navigation stable, and preserve the existing Worker-based session boundary."
      navigationItems={[
        {
          label: "Dashboard",
          description: "Reserved for the first signed-in overview.",
        },
        {
          label: "Projects",
          description: "Future module area for protected working content.",
        },
        {
          label: "Settings",
          description: "Account and workspace configuration can live here.",
        },
      ]}
      headerActions={<SignOutForm />}
    >
      {currentUser ? <AuthenticatedUserSummary user={currentUser} /> : null}
      <EmptyState
        eyebrow="Main Content"
        title="Protected app page"
        description="The route boundary already exists. This placeholder now confirms the current signed-in session while larger protected modules stay deferred to later phases."
      />
    </AppShell>
  );
}
