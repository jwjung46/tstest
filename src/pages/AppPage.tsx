import AppShell from "../app/layout/AppShell";
import EmptyState from "../shared/ui/EmptyState";

export default function AppPage() {
  return (
    <AppShell
      brand="Teamspace"
      title="App shell placeholder"
      subtitle="This protected route is ready to receive real modules after authentication is implemented."
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
    >
      <EmptyState
        eyebrow="Main Content"
        title="Protected app page"
        description="The route boundary already exists. For now this empty state marks where signed-in features will render inside the shared app shell."
      />
    </AppShell>
  );
}
