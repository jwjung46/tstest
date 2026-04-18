import type {
  BillingCheckoutSession,
  BillingCycleSummary,
  BillingEventSummary,
  BillingPlan,
  BillingSubscription,
  EntitlementSummary,
} from "../types/billing.ts";

type BillingOverviewStatus = "loading" | "error" | "ready";
type BillingHistoryStatus = "idle" | "loading" | "ready";

export type BillingOverviewSectionView = {
  state: "loading" | "error" | "ready" | "empty" | "idle";
  title: string;
  description: string;
};

export function getBillingOverviewView(input: {
  status: BillingOverviewStatus;
  historyStatus: BillingHistoryStatus;
  error: string | null;
  historyError: string | null;
  checkoutSession: BillingCheckoutSession | null;
  subscription: BillingSubscription | null;
  entitlements: EntitlementSummary[];
  availablePlans: BillingPlan[];
  cycles: BillingCycleSummary[];
  events: BillingEventSummary[];
}) {
  const summary = resolveSummarySection(input);
  const secondary = resolveSecondarySection(input);

  return {
    summary,
    secondary,
  };
}

function resolveSummarySection(input: {
  status: BillingOverviewStatus;
  error: string | null;
  subscription: BillingSubscription | null;
  entitlements: EntitlementSummary[];
  availablePlans: BillingPlan[];
}) {
  if (input.status === "loading") {
    return {
      state: "loading",
      title: "Loading current billing summary",
      description:
        "Current subscription, entitlements, and available plans are loading.",
    } satisfies BillingOverviewSectionView;
  }

  if (input.status === "error") {
    return {
      state: "error",
      title: "Billing summary unavailable",
      description:
        input.error ?? "Billing details could not be loaded right now.",
    } satisfies BillingOverviewSectionView;
  }

  if (input.subscription) {
    return {
      state: "ready",
      title: input.subscription.plan.name,
      description:
        "Current subscription and entitlement state are ready before billing activity history finishes loading.",
    } satisfies BillingOverviewSectionView;
  }

  if (input.availablePlans.length > 0 || input.entitlements.length > 0) {
    return {
      state: "ready",
      title: "No paid contract yet",
      description:
        "The account is ready for checkout, but no paid subscription period is active yet.",
    } satisfies BillingOverviewSectionView;
  }

  return {
    state: "empty",
    title: "No billing summary yet",
    description: "Billing has not exposed a summary for this account yet.",
  } satisfies BillingOverviewSectionView;
}

function resolveSecondarySection(input: {
  historyStatus: BillingHistoryStatus;
  historyError: string | null;
  checkoutSession: BillingCheckoutSession | null;
  cycles: BillingCycleSummary[];
  events: BillingEventSummary[];
}) {
  if (input.historyStatus === "idle") {
    return {
      state: "idle",
      title: "Billing activity appears after the summary loads",
      description:
        "Cycle history and billing events stay secondary until the summary is available.",
    } satisfies BillingOverviewSectionView;
  }

  if (input.historyStatus === "loading") {
    return {
      state: "loading",
      title: "Loading billing activity",
      description:
        "Cycle history and event logs are fetching independently from the summary cards.",
    } satisfies BillingOverviewSectionView;
  }

  if (input.historyError) {
    return {
      state: "error",
      title: "Billing activity unavailable",
      description: input.historyError,
    } satisfies BillingOverviewSectionView;
  }

  if (input.cycles.length === 0 && input.events.length === 0) {
    return {
      state: "empty",
      title: "No billing activity yet",
      description: input.checkoutSession
        ? "The latest checkout request is recorded. Activity appears after confirm or webhook processing."
        : "Run the first Toss checkout to create cycles and billing events.",
    } satisfies BillingOverviewSectionView;
  }

  return {
    state: "ready",
    title: "Recent billing activity",
    description:
      "Cycle history and billing events stay separate from the primary subscription summary.",
  } satisfies BillingOverviewSectionView;
}
