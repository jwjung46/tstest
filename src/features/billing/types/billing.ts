export type BillingPlan = {
  id: string;
  planCode: string;
  name: string;
  billingInterval: string;
  currency: string;
  amount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BillingSubscription = {
  id: string;
  userId: string;
  billingCustomerId: string;
  status:
    | "incomplete"
    | "trialing"
    | "active"
    | "grace_period"
    | "past_due"
    | "canceled"
    | "ended"
    | "paused";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  endedAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  billingAnchorAt: string | null;
  latestPaymentMethodId: string | null;
  createdAt: string;
  updatedAt: string;
  plan: BillingPlan;
};

export type EntitlementSummary = {
  featureKey: string;
  status: "active" | "inactive";
  sourceType: string;
  sourceId: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
};

export type BillingCustomer = {
  id: string;
  userId: string;
  provider: string;
  customerKey: string;
  createdAt: string;
  updatedAt: string;
};

export type BillingOverviewResponse = {
  customer: BillingCustomer;
  subscription: BillingSubscription | null;
  entitlements: EntitlementSummary[];
  availablePlans: BillingPlan[];
  paymentMethods: [];
};

export type BillingSubscriptionResponse = {
  subscription: BillingSubscription | null;
};

export type BillingEntitlementsResponse = {
  entitlements: EntitlementSummary[];
};
