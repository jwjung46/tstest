import { findUserById } from "../account/repository.ts";
import type { WorkerEnv } from "../env.ts";
import {
  BILLING_PROVIDER_ID,
  type BillingCustomer,
  type BillingCycle,
  type BillingEvent,
  type BillingPlan,
  type BillingSubscription,
  type TossNormalizedPayment,
} from "./types.ts";
import {
  TossBillingError,
  createTossBillingClient,
  getTossPaymentsConfig,
} from "./toss-client.ts";
import {
  createBillingCustomer,
  createBillingEvent,
  createSubscription,
  createSubscriptionCycle,
  findBillingCustomerByUserId,
  findBillingEventByKey,
  findCycleByOrderId,
  findCycleByPaymentKey,
  findLatestSubscriptionForUser,
  findPlanByCode,
  findSubscriptionById,
  listActivePlans,
  listBillingEventsByUserId,
  listCyclesBySubscriptionId,
  listCyclesByUserId,
  listEntitlementsByUserId,
  markSubscriptionCanceled,
  updateBillingCustomerKey,
  updateBillingEventProcessing,
  updateSubscriptionBillingState,
  updateSubscriptionCycleState,
} from "./repository.ts";
import { recomputeEntitlements, listEntitlements } from "./entitlements.ts";

const tossClient = createTossBillingClient();

export class BillingRequestError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "BillingRequestError";
    this.code = code;
    this.status = status;
  }
}

function addDays(isoTimestamp: string, days: number) {
  const date = new Date(isoTimestamp);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function createOrderId(planCode: string) {
  return `toss_${planCode}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function asBillingError(error: unknown) {
  if (error instanceof BillingRequestError) {
    return error;
  }

  if (error instanceof TossBillingError) {
    return new BillingRequestError(error.code, error.message, error.status);
  }

  if (error instanceof Error) {
    return new BillingRequestError("billing_request_failed", error.message);
  }

  return new BillingRequestError(
    "billing_request_failed",
    "The billing request failed.",
  );
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
  status: "pending" | "paid" | "failed" | "canceled";
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
  processing_status: "pending" | "processed" | "failed" | "ignored";
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
    throw new BillingRequestError(
      "billing_request_failed",
      "Active internal user is required for billing.",
    );
  }

  return user;
}

async function requireOwnedCycle(
  db: D1Database,
  userId: string,
  orderId: string,
) {
  const cycle = await findCycleByOrderId(db, orderId);

  if (!cycle) {
    throw new BillingRequestError(
      "billing_request_failed",
      "The pending billing cycle could not be found.",
      404,
    );
  }

  const subscription = await findSubscriptionById(db, cycle.subscription_id);

  if (!subscription || subscription.user_id !== userId) {
    throw new BillingRequestError(
      "billing_request_failed",
      "The pending billing cycle does not belong to the current user.",
      404,
    );
  }

  return { cycle, subscription };
}

async function ensureBillingEvent(
  db: D1Database,
  {
    eventKey,
    eventType,
    sourceType,
    relatedUserId = null,
    relatedSubscriptionId = null,
    relatedCycleId = null,
    payload = null,
    receivedAt,
  }: {
    eventKey: string;
    eventType: string;
    sourceType: string;
    relatedUserId?: string | null;
    relatedSubscriptionId?: string | null;
    relatedCycleId?: string | null;
    payload?: Record<string, unknown> | null;
    receivedAt: string;
  },
) {
  const existing = await findBillingEventByKey(db, eventKey);

  if (existing) {
    return {
      duplicate: true,
      event: existing,
    };
  }

  const created = await createBillingEvent(db, {
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

  return {
    duplicate: false,
    event: created,
  };
}

async function markBillingEventProcessed(
  db: D1Database,
  eventId: string,
  receivedAt: string,
) {
  await updateBillingEventProcessing(db, {
    eventId,
    processingStatus: "processed",
    processingAttempts: 1,
    lastErrorMessage: null,
    processedAt: receivedAt,
  });
}

async function markBillingEventFailed(
  db: D1Database,
  eventId: string,
  receivedAt: string,
  message: string,
) {
  await updateBillingEventProcessing(db, {
    eventId,
    processingStatus: "failed",
    processingAttempts: 1,
    lastErrorMessage: message,
    processedAt: receivedAt,
  });
}

async function markBillingEventIgnored(
  db: D1Database,
  eventId: string,
  receivedAt: string,
  message: string | null = null,
) {
  await updateBillingEventProcessing(db, {
    eventId,
    processingStatus: "ignored",
    processingAttempts: 1,
    lastErrorMessage: message,
    processedAt: receivedAt,
  });
}

async function applySuccessfulPayment(
  db: D1Database,
  {
    subscriptionId,
    cycleId,
    payment,
    now,
  }: {
    subscriptionId: string;
    cycleId: string;
    payment: TossNormalizedPayment;
    now: string;
  },
) {
  const periodStart = payment.approvedAt ?? now;
  const periodEnd = addDays(periodStart, 30);

  await updateSubscriptionCycleState(db, {
    cycleId,
    status: "paid",
    periodStart,
    periodEnd,
    tossPaymentKey: payment.paymentKey,
    chargedAt: periodStart,
    failedAt: null,
    failureCode: null,
    failureMessage: null,
    now,
  });

  await updateSubscriptionBillingState(db, {
    subscriptionId,
    status: "active",
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    billingAnchorAt: periodStart,
    latestPaymentMethodId: null,
    cancelAtPeriodEnd: 0,
    canceledAt: null,
    endedAt: null,
    now,
  });

  const subscription = await findSubscriptionById(db, subscriptionId);

  if (!subscription) {
    throw new BillingRequestError(
      "billing_request_failed",
      "Subscription could not be reloaded.",
    );
  }

  const entitlements = await recomputeEntitlements(db, subscription.user_id, {
    now: periodStart,
  });
  const cycle = await findCycleByOrderId(db, payment.orderId);

  if (!cycle) {
    throw new BillingRequestError(
      "billing_request_failed",
      "Billing cycle could not be reloaded.",
    );
  }

  return {
    subscription: mapSubscription(subscription),
    cycle: mapCycle(cycle),
    entitlements,
  };
}

async function applyFailedPayment(
  db: D1Database,
  {
    subscriptionId,
    cycleId,
    status,
    code,
    message,
    now,
  }: {
    subscriptionId: string;
    cycleId: string;
    status: "failed" | "canceled";
    code: string;
    message: string;
    now: string;
  },
) {
  const existingSubscription = await findSubscriptionById(db, subscriptionId);

  if (!existingSubscription) {
    throw new BillingRequestError(
      "billing_request_failed",
      "Subscription could not be reloaded.",
    );
  }

  await updateSubscriptionCycleState(db, {
    cycleId,
    status,
    periodStart: existingSubscription.current_period_start ?? now,
    periodEnd: existingSubscription.current_period_end ?? addDays(now, 30),
    tossPaymentKey: null,
    chargedAt: null,
    failedAt: now,
    failureCode: code,
    failureMessage: message,
    now,
  });

  if (existingSubscription.status === "incomplete") {
    await updateSubscriptionBillingState(db, {
      subscriptionId,
      status: "incomplete",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      billingAnchorAt: null,
      latestPaymentMethodId: null,
      cancelAtPeriodEnd: existingSubscription.cancel_at_period_end,
      canceledAt: existingSubscription.canceled_at,
      endedAt: existingSubscription.ended_at,
      now,
    });
  }

  const entitlements = await recomputeEntitlements(
    db,
    existingSubscription.user_id,
    {
      now,
    },
  );
  const nextSubscription = await findSubscriptionById(db, subscriptionId);

  if (!nextSubscription) {
    throw new BillingRequestError(
      "billing_request_failed",
      "Subscription could not be reloaded.",
    );
  }

  return {
    subscription: mapSubscription(nextSubscription),
    entitlements,
  };
}

function buildCheckoutUrls(appOrigin: string) {
  return {
    successUrl: `${appOrigin}/app/subscription?billingFlow=success`,
    failUrl: `${appOrigin}/app/subscription?billingFlow=fail`,
  };
}

export async function ensureBillingCustomer(
  db: D1Database,
  userId: string,
  now = new Date().toISOString(),
) {
  await requireActiveInternalUser(db, userId);

  const existingCustomer = await findBillingCustomerByUserId(db, userId);

  if (existingCustomer) {
    const canonicalCustomerKey = tossClient.createOrReuseCustomerKey(userId);

    if (existingCustomer.customer_key !== canonicalCustomerKey) {
      await updateBillingCustomerKey(db, {
        customerId: existingCustomer.id,
        customerKey: canonicalCustomerKey,
        now,
      });

      return mapCustomer({
        ...existingCustomer,
        customer_key: canonicalCustomerKey,
        updated_at: now,
      });
    }

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

export async function createCheckoutSession(
  db: D1Database,
  env: WorkerEnv,
  {
    userId,
    planCode,
    appOrigin,
    now = new Date().toISOString(),
  }: {
    userId: string;
    planCode: string;
    appOrigin: string;
    now?: string;
  },
) {
  const config = getTossPaymentsConfig(env);
  const user = await requireActiveInternalUser(db, userId);
  const customer = await ensureBillingCustomer(db, userId, now);
  const plan = await findPlanByCode(db, planCode);

  if (!plan || plan.is_active !== 1 || plan.amount <= 0) {
    throw new BillingRequestError(
      "billing_request_failed",
      "Requested paid plan is not available.",
    );
  }

  let subscription = await findLatestSubscriptionForUser(db, userId);

  if (!subscription || subscription.plan_code !== planCode) {
    await createSubscription(db, {
      userId,
      billingCustomerId: customer.id,
      planId: plan.id,
      status: "incomplete",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      billingAnchorAt: null,
      now,
    });
    subscription = await findLatestSubscriptionForUser(db, userId);
  }

  if (!subscription) {
    throw new BillingRequestError(
      "billing_request_failed",
      "Subscription could not be created.",
    );
  }

  const previousCycles = await listCyclesBySubscriptionId(db, subscription.id);
  const cycleIndex = (previousCycles[0]?.cycle_index ?? 0) + 1;
  const orderId = createOrderId(planCode);
  const provisionalPeriodStart = now;
  const provisionalPeriodEnd = addDays(now, 30);

  await createSubscriptionCycle(db, {
    subscriptionId: subscription.id,
    cycleIndex,
    periodStart: provisionalPeriodStart,
    periodEnd: provisionalPeriodEnd,
    status: "pending",
    scheduledAmount: plan.amount,
    currency: plan.currency,
    tossOrderId: orderId,
    chargedAt: null,
    failedAt: null,
    failureCode: null,
    failureMessage: null,
    now,
  });

  const urls = buildCheckoutUrls(appOrigin);
  const cycle = await findCycleByOrderId(db, orderId);

  if (!cycle) {
    throw new BillingRequestError(
      "billing_request_failed",
      "Checkout cycle could not be created.",
    );
  }

  return {
    checkout: {
      clientKey: config.clientKey,
      customerKey: customer.customerKey,
      orderId,
      orderName: "Pro Monthly 30-day access",
      amount: plan.amount,
      currency: plan.currency,
      planCode,
      successUrl: urls.successUrl,
      failUrl: urls.failUrl,
      customerEmail: user.primary_email,
      customerName: user.display_name,
    },
    subscription: mapSubscription(subscription),
    cycle: mapCycle(cycle),
  };
}

export async function confirmCheckoutPayment(
  db: D1Database,
  env: WorkerEnv,
  {
    userId,
    paymentKey,
    orderId,
    amount,
    now = new Date().toISOString(),
  }: {
    userId: string;
    paymentKey: string;
    orderId: string;
    amount: number;
    now?: string;
  },
) {
  const { cycle, subscription } = await requireOwnedCycle(db, userId, orderId);

  if (cycle.scheduled_amount !== amount) {
    throw new BillingRequestError(
      "billing_request_failed",
      "The payment amount does not match the pending checkout amount.",
    );
  }

  if (cycle.status === "paid" && cycle.toss_payment_key === paymentKey) {
    const entitlements = await listEntitlements(db, userId);
    return {
      result: {
        status: "success" as const,
        orderId,
        paymentKey,
      },
      subscription: mapSubscription(subscription),
      entitlements,
      cycle: mapCycle(cycle),
    };
  }

  try {
    const payment = await tossClient.confirmOneTimePayment(env, {
      paymentKey,
      orderId,
      amount,
    });

    if (payment.orderId !== orderId || payment.paymentKey !== paymentKey) {
      throw new BillingRequestError(
        "billing_request_failed",
        "Toss Payments returned mismatched payment confirmation data.",
      );
    }

    if (payment.totalAmount !== amount) {
      throw new BillingRequestError(
        "billing_request_failed",
        "Toss Payments returned a mismatched payment amount.",
      );
    }

    const billingEvent = await ensureBillingEvent(db, {
      eventKey: `confirm:${paymentKey}`,
      eventType: "payment.confirmed",
      sourceType: "api",
      relatedUserId: userId,
      relatedSubscriptionId: subscription.id,
      relatedCycleId: cycle.id,
      payload: payment.raw,
      receivedAt: payment.approvedAt ?? now,
    });

    const applied = await applySuccessfulPayment(db, {
      subscriptionId: subscription.id,
      cycleId: cycle.id,
      payment,
      now,
    });

    if (!billingEvent.duplicate) {
      await markBillingEventProcessed(
        db,
        billingEvent.event.id,
        payment.approvedAt ?? now,
      );
    }

    return {
      result: {
        status: "success" as const,
        orderId: payment.orderId,
        paymentKey: payment.paymentKey,
      },
      subscription: applied.subscription,
      entitlements: applied.entitlements,
      cycle: applied.cycle,
    };
  } catch (error) {
    const billingError = asBillingError(error);
    const event = await ensureBillingEvent(db, {
      eventKey: `confirm-failure:${paymentKey}`,
      eventType: "payment.confirm_failed",
      sourceType: "api",
      relatedUserId: userId,
      relatedSubscriptionId: subscription.id,
      relatedCycleId: cycle.id,
      payload: {
        orderId,
        paymentKey,
        amount,
        code: billingError.code,
        message: billingError.message,
      },
      receivedAt: now,
    });

    if (!event.duplicate) {
      await markBillingEventFailed(
        db,
        event.event.id,
        now,
        billingError.message,
      );
    }

    await applyFailedPayment(db, {
      subscriptionId: subscription.id,
      cycleId: cycle.id,
      status: "failed",
      code: billingError.code,
      message: billingError.message,
      now,
    });

    throw billingError;
  }
}

async function buildCheckoutResultPayload(
  db: D1Database,
  userId: string,
  orderId: string | null,
  defaultResult: {
    status: "success" | "fail" | "pending";
    code?: string;
    message?: string;
  },
) {
  const subscription = await getSubscription(db, userId);
  const entitlements = await getEntitlements(db, userId);

  if (!orderId) {
    return {
      result: {
        ...defaultResult,
        orderId: null,
      },
      subscription,
      entitlements,
    };
  }

  const owned = await requireOwnedCycle(db, userId, orderId);

  if (owned.cycle.status === "paid") {
    return {
      result: {
        status: "success" as const,
        orderId,
        paymentKey: owned.cycle.toss_payment_key,
      },
      subscription,
      entitlements,
      cycle: mapCycle(owned.cycle),
    };
  }

  if (owned.cycle.status === "failed" || owned.cycle.status === "canceled") {
    return {
      result: {
        status: "fail" as const,
        code:
          owned.cycle.failure_code ?? defaultResult.code ?? "payment_failed",
        message:
          owned.cycle.failure_message ??
          defaultResult.message ??
          "The payment could not be completed.",
        orderId,
      },
      subscription,
      entitlements,
      cycle: mapCycle(owned.cycle),
    };
  }

  return {
    result: {
      ...defaultResult,
      orderId,
    },
    subscription,
    entitlements,
    cycle: mapCycle(owned.cycle),
  };
}

export async function getCheckoutResult(
  db: D1Database,
  {
    userId,
    orderId,
    flow,
    code,
    message,
    now = new Date().toISOString(),
  }: {
    userId: string;
    orderId: string | null;
    flow: string | null;
    code: string | null;
    message: string | null;
    now?: string;
  },
) {
  if (flow === "fail" && orderId) {
    const { cycle, subscription } = await requireOwnedCycle(
      db,
      userId,
      orderId,
    );

    if (cycle.status === "pending") {
      await applyFailedPayment(db, {
        subscriptionId: subscription.id,
        cycleId: cycle.id,
        status: code === "PAY_PROCESS_CANCELED" ? "canceled" : "failed",
        code: code ?? "payment_failed",
        message: message ?? "The payment could not be completed.",
        now,
      });
    }
  }

  return buildCheckoutResultPayload(db, userId, orderId, {
    status: flow === "fail" ? "fail" : "pending",
    code: code ?? undefined,
    message: message ?? undefined,
  });
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
    throw new BillingRequestError(
      "billing_request_failed",
      "Subscription was not found for the current user.",
    );
  }

  await markSubscriptionCanceled(db, {
    subscriptionId,
    now,
  });

  const nextSubscription = await findSubscriptionById(db, subscriptionId);

  if (!nextSubscription) {
    throw new BillingRequestError(
      "billing_request_failed",
      "Subscription could not be reloaded.",
    );
  }

  const entitlements = await recomputeEntitlements(db, userId, { now });

  return {
    subscription: mapSubscription(nextSubscription),
    entitlements,
  };
}

export async function listBillingHistory(db: D1Database, userId: string) {
  const cycles = (await listCyclesByUserId(db, userId)).map(mapCycle);
  const events = (await listBillingEventsByUserId(db, userId)).map(mapEvent);

  return {
    cycles,
    events,
  };
}

export async function processTossWebhook(
  db: D1Database,
  {
    payload,
    rawBody,
    headers,
    now = new Date().toISOString(),
  }: {
    payload: unknown;
    rawBody: string;
    headers: Headers | Record<string, string>;
    now?: string;
  },
) {
  const normalized = tossClient.normalizeWebhookPayload({
    payload,
    rawBody,
    headers,
    receivedAt: now,
  });
  const relatedCycle =
    (normalized.orderId
      ? await findCycleByOrderId(db, normalized.orderId)
      : null) ??
    (normalized.paymentKey
      ? await findCycleByPaymentKey(db, normalized.paymentKey)
      : null);
  const relatedSubscription = relatedCycle
    ? await findSubscriptionById(db, relatedCycle.subscription_id)
    : null;
  const event = await ensureBillingEvent(db, {
    eventKey: normalized.eventKey,
    eventType: normalized.eventType,
    sourceType: "webhook",
    relatedUserId: relatedSubscription?.user_id ?? null,
    relatedSubscriptionId: relatedSubscription?.id ?? null,
    relatedCycleId: relatedCycle?.id ?? null,
    payload: normalized.raw,
    receivedAt: normalized.receivedAt,
  });

  if (event.duplicate) {
    return {
      duplicate: true,
      event: mapEvent(event.event),
    };
  }

  try {
    const isPaymentStatusChanged =
      normalized.eventType === "PAYMENT_STATUS_CHANGED" &&
      relatedCycle &&
      relatedSubscription;

    if (
      isPaymentStatusChanged &&
      normalized.paymentStatus === "DONE" &&
      normalized.paymentKey &&
      normalized.totalAmount !== null
    ) {
      await applySuccessfulPayment(db, {
        subscriptionId: relatedSubscription.id,
        cycleId: relatedCycle.id,
        payment: {
          paymentKey: normalized.paymentKey,
          orderId: normalized.orderId ?? relatedCycle.toss_order_id,
          status: normalized.paymentStatus,
          totalAmount: normalized.totalAmount,
          currency: "KRW",
          method: null,
          approvedAt: normalized.approvedAt,
          raw: normalized.raw,
        },
        now,
      });
      await markBillingEventProcessed(
        db,
        event.event.id,
        normalized.receivedAt,
      );
    } else if (
      isPaymentStatusChanged &&
      (normalized.paymentStatus === "ABORTED" ||
        normalized.paymentStatus === "EXPIRED" ||
        normalized.paymentStatus === "CANCELED")
    ) {
      await applyFailedPayment(db, {
        subscriptionId: relatedSubscription.id,
        cycleId: relatedCycle.id,
        status: normalized.paymentStatus === "CANCELED" ? "canceled" : "failed",
        code: normalized.paymentStatus,
        message: `Toss Payments reported ${normalized.paymentStatus}.`,
        now,
      });
      await markBillingEventProcessed(
        db,
        event.event.id,
        normalized.receivedAt,
      );
    } else {
      await markBillingEventIgnored(
        db,
        event.event.id,
        normalized.receivedAt,
        isPaymentStatusChanged
          ? `Webhook status ${normalized.paymentStatus ?? "unknown"} is not acted on in Stage 2.`
          : `Webhook event type ${normalized.eventType} is not acted on in Stage 2.`,
      );
    }

    return {
      duplicate: false,
      event: mapEvent({
        ...event.event,
        processing_status:
          isPaymentStatusChanged &&
          (normalized.paymentStatus === "DONE" ||
            normalized.paymentStatus === "ABORTED" ||
            normalized.paymentStatus === "EXPIRED" ||
            normalized.paymentStatus === "CANCELED")
            ? "processed"
            : "ignored",
        processing_attempts: 1,
        last_error_message:
          isPaymentStatusChanged &&
          (normalized.paymentStatus === "DONE" ||
            normalized.paymentStatus === "ABORTED" ||
            normalized.paymentStatus === "EXPIRED" ||
            normalized.paymentStatus === "CANCELED")
            ? null
            : isPaymentStatusChanged
              ? `Webhook status ${normalized.paymentStatus ?? "unknown"} is not acted on in Stage 2.`
              : `Webhook event type ${normalized.eventType} is not acted on in Stage 2.`,
        processed_at: normalized.receivedAt,
      }),
    };
  } catch (error) {
    const billingError = asBillingError(error);
    await markBillingEventFailed(
      db,
      event.event.id,
      normalized.receivedAt,
      billingError.message,
    );
    throw billingError;
  }
}

export async function getEntitlements(
  db: D1Database,
  userId: string,
  now = new Date().toISOString(),
) {
  const existing = (await listEntitlementsByUserId(db, userId)).map(
    (entry) => ({
      id: entry.id,
      userId: entry.user_id,
      featureKey: entry.feature_key,
      status: entry.status,
      effectiveFrom: entry.effective_from,
      effectiveUntil: entry.effective_until,
      sourceType: entry.source_type,
      sourceId: entry.source_id,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    }),
  );

  if (existing.length > 0) {
    return existing;
  }

  return recomputeEntitlements(db, userId, { now });
}
