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

export type BillingCycleSummary = {
  id: string;
  subscriptionId: string;
  cycleIndex: number;
  periodStart: string;
  periodEnd: string;
  status: "pending" | "paid" | "failed" | "canceled";
  scheduledAmount: number;
  currency: string;
  paymentMethodId: string | null;
  tossPaymentKey: string | null;
  tossOrderId: string;
  chargedAt: string | null;
  failedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingEventSummary = {
  id: string;
  provider: string;
  eventKey: string;
  eventType: string;
  sourceType: string;
  relatedUserId: string | null;
  relatedSubscriptionId: string | null;
  relatedCycleId: string | null;
  payload: Record<string, unknown> | null;
  processingStatus: "pending" | "processed" | "failed";
  processingAttempts: number;
  lastErrorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
};

export type BillingCheckoutSession = {
  clientKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  currency: string;
  planCode: string;
  successUrl: string;
  failUrl: string;
  customerEmail: string | null;
  customerName: string;
};

export type BillingCheckoutResult =
  | {
      status: "success";
      orderId: string;
      paymentKey: string | null;
    }
  | {
      status: "fail";
      orderId: string | null;
      code: string;
      message: string;
    }
  | {
      status: "pending";
      orderId: string | null;
      code?: string;
      message?: string;
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

export type BillingHistoryResponse = {
  cycles: BillingCycleSummary[];
  events: BillingEventSummary[];
};

export type BillingCheckoutSessionResponse = {
  checkout: BillingCheckoutSession;
  subscription: BillingSubscription;
  cycle: BillingCycleSummary;
};

export type BillingCheckoutConfirmResponse = {
  result: BillingCheckoutResult;
  subscription: BillingSubscription;
  entitlements: EntitlementSummary[];
  cycle: BillingCycleSummary;
};

export type BillingCheckoutResultResponse = {
  result: BillingCheckoutResult;
  subscription: BillingSubscription | null;
  entitlements: EntitlementSummary[];
  cycle?: BillingCycleSummary;
};
