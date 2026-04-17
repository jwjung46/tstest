import { findUserById } from "../account/repository.ts";
import {
  BILLING_PROVIDER_ID,
  type BillingCustomer,
  type BillingCycle,
  type BillingEvent,
  type BillingPlan,
  type BillingSubscription,
} from "./types.ts";
import { createTossBillingClient } from "./toss-client.ts";
import {
  createBillingCustomer,
  createBillingEvent,
  createSubscription,
  createSubscriptionCycle,
  findBillingCustomerByUserId,
  findBillingEventByKey,
  findLatestSubscriptionForUser,
  findPlanByCode,
  findSubscriptionById,
  listActivePlans,
  listBillingEventsByUserId,
  listCyclesBySubscriptionId,
  markSubscriptionCanceled,
  updateBillingEventProcessing,
} from "./repository.ts";
import { recomputeEntitlements, listEntitlements } from "./entitlements.ts";

const tossClient = createTossBillingClient();

function addMonth(isoTimestamp: string) {
  const date = new Date(isoTimestamp);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

function mapPlan(record: {
  id: string;
  plan_code: string;
  name: string;
  billing_interval: string;
  currency: string;
  amount: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}): BillingPlan {
  return {
    id: record.id,
    planCode: record.plan_code,
    name: record.name,
    billingInterval: record.billing_interval,
    currency: record.currency,
    amount: record.amount,
    isActive: record.is_active === 1,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapCustomer(record: {
  id: string;
  user_id: string;
  provider: "toss_payments";
  customer_key: string;
  created_at: string;
  updated_at: string;
}): BillingCustomer {
  return {
    id: record.id,
    userId: record.user_id,
    provider: record.provider,
    customerKey: record.customer_key,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapSubscription(record: {
  id: string;
  user_id: string;
  billing_customer_id: string;
  status:
    | "incomplete"
    | "trialing"
    | "active"
    | "grace_period"
    | "past_due"
    | "canceled"
    | "ended"
    | "paused";
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
  plan_id_alias: string;
  plan_code: string;
  name: string;
  billing_interval: string;
  currency: string;
  amount: number;
  is_active: number;
  plan_created_at: string;
  plan_updated_at: string;
}): BillingSubscription {
  return {
    id: record.id,
    userId: record.user_id,
    billingCustomerId: record.billing_customer_id,
    status: record.status,
    currentPeriodStart: record.current_period_start,
    currentPeriodEnd: record.current_period_end,
    cancelAtPeriodEnd: record.cancel_at_period_end === 1,
    canceledAt: record.canceled_at,
    endedAt: record.ended_at,
    trialStart: record.trial_start,
    trialEnd: record.trial_end,
    billingAnchorAt: record.billing_anchor_at,
    latestPaymentMethodId: record.latest_payment_method_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    plan: mapPlan({
      id: record.plan_id_alias,
      plan_code: record.plan_code,
      name: record.name,
      billing_interval: record.billing_interval,
      currency: record.currency,
      amount: record.amount,
      is_active: record.is_active,
      created_at: record.plan_created_at,
      updated_at: record.plan_updated_at,
    }),
  };
}

function mapCycle(record: {
  id: string;
  subscription_id: string;
  cycle_index: number;
  period_start: string;
  period_end: string;
  status: "pending" | "charged" | "failed" | "canceled";
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
}): BillingCycle {
  return {
    id: record.id,
    subscriptionId: record.subscription_id,
    cycleIndex: record.cycle_index,
    periodStart: record.period_start,
    periodEnd: record.period_end,
    status: record.status,
    scheduledAmount: record.scheduled_amount,
    currency: record.currency,
    paymentMethodId: record.payment_method_id,
    tossPaymentKey: record.toss_payment_key,
    tossOrderId: record.toss_order_id,
    chargedAt: record.charged_at,
    failedAt: record.failed_at,
    failureCode: record.failure_code,
    failureMessage: record.failure_message,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapEvent(record: {
  id: string;
  provider: "toss_payments";
  event_key: string;
  event_type: string;
  source_type: string;
  related_user_id: string | null;
  related_subscription_id: string | null;
  related_cycle_id: string | null;
  payload_json: string;
  processing_status: "pending" | "processed" | "failed";
  processing_attempts: number;
  last_error_message: string | null;
  received_at: string;
  processed_at: string | null;
}): BillingEvent {
  let payload = null;

  try {
    payload = JSON.parse(record.payload_json);
  } catch {
    payload = null;
  }

  return {
    id: record.id,
    provider: record.provider,
    eventKey: record.event_key,
    eventType: record.event_type,
    sourceType: record.source_type,
    relatedUserId: record.related_user_id,
    relatedSubscriptionId: record.related_subscription_id,
    relatedCycleId: record.related_cycle_id,
    payload,
    processingStatus: record.processing_status,
    processingAttempts: record.processing_attempts,
    lastErrorMessage: record.last_error_message,
    receivedAt: record.received_at,
    processedAt: record.processed_at,
  };
}

async function requireActiveInternalUser(db: D1Database, userId: string) {
  const user = await findUserById(db, userId);

  if (!user || user.status !== "active") {
    throw new Error("Active internal user is required for billing.");
  }

  return user;
}

export async function ensureBillingCustomer(
  db: D1Database,
  userId: string,
  now = new Date().toISOString(),
) {
  await requireActiveInternalUser(db, userId);

  const existingCustomer = await findBillingCustomerByUserId(db, userId);

  if (existingCustomer) {
    return mapCustomer(existingCustomer);
  }

  const externalCustomer = await tossClient.ensureBillingCustomer(userId);
  const customer = await createBillingCustomer(db, {
    userId,
    provider: externalCustomer.provider,
    customerKey: externalCustomer.customerKey,
    now,
  });

  return mapCustomer(customer);
}

export async function getBillingOverview(
  db: D1Database,
  userId: string,
  now = new Date().toISOString(),
) {
  const customer = await ensureBillingCustomer(db, userId, now);
  const currentSubscriptionRecord = await findLatestSubscriptionForUser(
    db,
    userId,
  );
  const entitlements = await recomputeEntitlements(db, userId, { now });
  const availablePlans = (await listActivePlans(db)).map(mapPlan);

  return {
    customer,
    subscription: currentSubscriptionRecord
      ? mapSubscription(currentSubscriptionRecord)
      : null,
    entitlements,
    availablePlans,
    paymentMethods: [],
  };
}

export async function getSubscription(db: D1Database, userId: string) {
  const subscription = await findLatestSubscriptionForUser(db, userId);
  return subscription ? mapSubscription(subscription) : null;
}

export async function createSubscriptionContract(
  db: D1Database,
  {
    userId,
    planCode,
    now = new Date().toISOString(),
  }: {
    userId: string;
    planCode: string;
    now?: string;
  },
) {
  const customer = await ensureBillingCustomer(db, userId, now);
  const plan = await findPlanByCode(db, planCode);

  if (!plan || plan.is_active !== 1) {
    throw new Error("Requested plan is not available.");
  }

  const currentPeriodStart = now;
  const currentPeriodEnd =
    plan.billing_interval === "month" ? addMonth(now) : addMonth(now);
  const status = plan.plan_code === "free" ? "active" : "incomplete";

  const subscription = await createSubscription(db, {
    userId,
    billingCustomerId: customer.id,
    planId: plan.id,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    billingAnchorAt: now,
    now,
  });

  await createSubscriptionCycle(db, {
    subscriptionId: subscription.id,
    cycleIndex: 1,
    periodStart: currentPeriodStart,
    periodEnd: currentPeriodEnd,
    status: plan.amount === 0 ? "charged" : "pending",
    scheduledAmount: plan.amount,
    currency: plan.currency,
    tossOrderId: `order_${subscription.id}_1`,
    chargedAt: plan.amount === 0 ? now : null,
    failedAt: null,
    failureCode: null,
    failureMessage: null,
    now,
  });

  const nextSubscription = await findSubscriptionById(db, subscription.id);

  if (!nextSubscription) {
    throw new Error("Subscription could not be reloaded.");
  }

  const entitlements = await recomputeEntitlements(db, userId, { now });

  return {
    subscription: mapSubscription(nextSubscription),
    entitlements,
  };
}

export async function cancelSubscriptionContract(
  db: D1Database,
  {
    userId,
    subscriptionId,
    now = new Date().toISOString(),
  }: {
    userId: string;
    subscriptionId: string;
    now?: string;
  },
) {
  const subscription = await findSubscriptionById(db, subscriptionId);

  if (!subscription || subscription.user_id !== userId) {
    throw new Error("Subscription was not found for the current user.");
  }

  await markSubscriptionCanceled(db, {
    subscriptionId,
    now,
  });

  const nextSubscription = await findSubscriptionById(db, subscriptionId);

  if (!nextSubscription) {
    throw new Error("Subscription could not be reloaded.");
  }

  const entitlements = await recomputeEntitlements(db, userId, { now });

  return {
    subscription: mapSubscription(nextSubscription),
    entitlements,
  };
}

export async function listBillingHistory(db: D1Database, userId: string) {
  const subscription = await findLatestSubscriptionForUser(db, userId);
  const cycles = subscription
    ? (await listCyclesBySubscriptionId(db, subscription.id)).map(mapCycle)
    : [];
  const events = (await listBillingEventsByUserId(db, userId)).map(mapEvent);

  return {
    cycles,
    events,
  };
}

export async function recordBillingEvent(
  db: D1Database,
  {
    eventKey,
    eventType,
    sourceType,
    relatedUserId = null,
    relatedSubscriptionId = null,
    relatedCycleId = null,
    payload = null,
    receivedAt = new Date().toISOString(),
  }: {
    eventKey: string;
    eventType: string;
    sourceType: string;
    relatedUserId?: string | null;
    relatedSubscriptionId?: string | null;
    relatedCycleId?: string | null;
    payload?: Record<string, unknown> | null;
    receivedAt?: string;
  },
) {
  const existingEvent = await findBillingEventByKey(db, eventKey);

  if (existingEvent) {
    return {
      duplicate: true,
      event: mapEvent(existingEvent),
    };
  }

  const event = await createBillingEvent(db, {
    provider: BILLING_PROVIDER_ID,
    eventKey,
    eventType,
    sourceType,
    relatedUserId,
    relatedSubscriptionId,
    relatedCycleId,
    payload,
    receivedAt,
  });

  await updateBillingEventProcessing(db, {
    eventId: event.id,
    processingStatus: "processed",
    processingAttempts: 1,
    lastErrorMessage: null,
    processedAt: receivedAt,
  });

  const storedEvent = await findBillingEventByKey(db, eventKey);

  if (!storedEvent) {
    throw new Error("Billing event could not be reloaded.");
  }

  return {
    duplicate: false,
    event: mapEvent(storedEvent),
  };
}

export async function getEntitlements(
  db: D1Database,
  userId: string,
  now = new Date().toISOString(),
) {
  const existing = await listEntitlements(db, userId);

  if (existing.length > 0) {
    return existing;
  }

  return recomputeEntitlements(db, userId, { now });
}
