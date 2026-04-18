import EmptyState from "../../shared/ui/EmptyState";

export function ProtectedHomePageContent() {
  return (
    <EmptyState
      eyebrow="Protected Home"
      title="Protected app home"
      description="This route now exists as the stable entry point for the authenticated app shell."
    />
  );
}

export function AccountPageContent() {
  return (
    <EmptyState
      eyebrow="Account"
      title="Account area"
      description="This route is ready for the existing account summary and linked-provider surfaces in the next step."
    />
  );
}

export function SubscriptionPageContent() {
  return (
    <EmptyState
      eyebrow="Subscription"
      title="Subscription area"
      description="This route is ready for the existing billing overview and checkout flow in the next step."
    />
  );
}
