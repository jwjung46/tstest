export const BILLING_PROVIDER_ID = "toss_payments";

export type BillingProviderId = typeof BILLING_PROVIDER_ID;

export type SubscriptionStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "grace_period"
  | "past_due"
  | "canceled"
  | "ended"
  | "paused";

export type SubscriptionCycleStatus =
  | "pending"
  | "paid"
  | "failed"
  | "canceled";

export type BillingEventProcessingStatus =
  | "pending"
  | "processed"
  | "failed"
  | "ignored";

export type EntitlementStatus = "active" | "inactive";

export type BillingCustomerRecord = {
  id: string;
  user_id: string;
  provider: BillingProviderId;
  customer_key: string;
  created_at: string;
  updated_at: string;
};

export type BillingPaymentMethodRecord = {
  id: string;
  user_id: string;
  billing_customer_id: string;
  provider: BillingProviderId;
  billing_key: string;
  method_type: string;
  card_company: string | null;
  card_number_masked: string | null;
  card_owner_type: string | null;
  is_primary: number;
  status: string;
  issued_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPlanRecord = {
  id: string;
  plan_code: string;
  name: string;
  billing_interval: string;
  currency: string;
  amount: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRecord = {
  id: string;
  user_id: string;
  billing_customer_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
  canceled_at: string | null;
  ended_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  billing_anchor_at: string | null;
  latest_payment_method_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionWithPlanRecord = SubscriptionRecord & {
  plan_id_alias: string;
  plan_code: string;
  name: string;
  billing_interval: string;
  currency: string;
  amount: number;
  is_active: number;
  plan_created_at: string;
  plan_updated_at: string;
};

export type SubscriptionCycleRecord = {
  id: string;
  subscription_id: string;
  cycle_index: number;
  period_start: string;
  period_end: string;
  status: SubscriptionCycleStatus;
  scheduled_amount: number;
  currency: string;
  payment_method_id: string | null;
  toss_payment_key: string | null;
  toss_order_id: string;
  charged_at: string | null;
  failed_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingEventRecord = {
  id: string;
  provider: BillingProviderId;
  event_key: string;
  event_type: string;
  source_type: string;
  related_user_id: string | null;
  related_subscription_id: string | null;
  related_cycle_id: string | null;
  payload_json: string;
  processing_status: BillingEventProcessingStatus;
  processing_attempts: number;
  last_error_message: string | null;
  received_at: string;
  processed_at: string | null;
};

export type EntitlementRecord = {
  id: string;
  user_id: string;
  feature_key: string;
  status: EntitlementStatus;
  effective_from: string;
  effective_until: string | null;
  source_type: string;
  source_id: string;
  created_at: string;
  updated_at: string;
};

export type ManualEntitlementOverrideRecord = {
  id: string;
  user_id: string;
  feature_key: string;
  override_status: EntitlementStatus;
  effective_from: string;
  effective_until: string | null;
  reason: string;
  created_by: string;
  created_at: string;
};

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

export type BillingCustomer = {
  id: string;
  userId: string;
  provider: BillingProviderId;
  customerKey: string;
  createdAt: string;
  updatedAt: string;
};

export type BillingPaymentMethod = {
  id: string;
  userId: string;
  billingCustomerId: string;
  provider: BillingProviderId;
  billingKey: string;
  methodType: string;
  cardCompany: string | null;
  cardNumberMasked: string | null;
  cardOwnerType: string | null;
  isPrimary: boolean;
  status: string;
  issuedAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingSubscription = {
  id: string;
  userId: string;
  billingCustomerId: string;
  status: SubscriptionStatus;
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

export type BillingCycle = {
  id: string;
  subscriptionId: string;
  cycleIndex: number;
  periodStart: string;
  periodEnd: string;
  status: SubscriptionCycleStatus;
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

export type TossEnvironment = "test" | "live";

export type TossConfig = {
  clientKey: string;
  secretKey: string;
  environment: TossEnvironment;
  apiBaseUrl: string;
};

export type TossNormalizedPayment = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  currency: string;
  method: string | null;
  approvedAt: string | null;
  raw: Record<string, unknown>;
};

export type TossNormalizedWebhookEvent = {
  eventKey: string;
  eventType: string;
  createdAt: string;
  receivedAt: string;
  delivery: {
    transmissionId: string | null;
    transmissionTime: string | null;
    retriedCount: number | null;
    headers: Record<string, string>;
    rawBody: string;
  };
  orderId: string | null;
  paymentKey: string | null;
  paymentStatus: string | null;
  totalAmount: number | null;
  approvedAt: string | null;
  customerKey: string | null;
  methodKey: string | null;
  raw: Record<string, unknown>;
};

export type BillingEvent = {
  id: string;
  provider: BillingProviderId;
  eventKey: string;
  eventType: string;
  sourceType: string;
  relatedUserId: string | null;
  relatedSubscriptionId: string | null;
  relatedCycleId: string | null;
  payload: Record<string, unknown> | null;
  processingStatus: BillingEventProcessingStatus;
  processingAttempts: number;
  lastErrorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
};

export type Entitlement = {
  id: string;
  userId: string;
  featureKey: string;
  status: EntitlementStatus;
  effectiveFrom: string;
  effectiveUntil: string | null;
  sourceType: string;
  sourceId: string;
  createdAt: string;
  updatedAt: string;
};

export type BillingEventInput = {
  provider: BillingProviderId;
  eventKey: string;
  eventType: string;
  sourceType: string;
  relatedUserId: string | null;
  relatedSubscriptionId: string | null;
  relatedCycleId: string | null;
  payload: Record<string, unknown> | null;
  receivedAt: string;
};
