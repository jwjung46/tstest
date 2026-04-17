import type {
  BillingCustomerRecord,
  BillingEventInput,
  BillingEventProcessingStatus,
  BillingEventRecord,
  EntitlementRecord,
  ManualEntitlementOverrideRecord,
  SubscriptionCycleRecord,
  SubscriptionPlanRecord,
  SubscriptionRecord,
  SubscriptionStatus,
  SubscriptionWithPlanRecord,
} from "./types.ts";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function findBillingCustomerByUserId(
  db: D1Database,
  userId: string,
): Promise<BillingCustomerRecord | null> {
  return (
    (await db
      .prepare(
        "SELECT id, user_id, provider, customer_key, created_at, updated_at FROM billing_customers WHERE user_id = ?",
      )
      .bind(userId)
      .first<BillingCustomerRecord>()) ?? null
  );
}

export async function createBillingCustomer(
  db: D1Database,
  {
    userId,
    provider,
    customerKey,
    now,
  }: {
    userId: string;
    provider: BillingCustomerRecord["provider"];
    customerKey: string;
    now: string;
  },
): Promise<BillingCustomerRecord> {
  const id = createId("bcus");

  await db
    .prepare(
      "INSERT INTO billing_customers (id, user_id, provider, customer_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(id, userId, provider, customerKey, now, now)
    .run();

  return {
    id,
    user_id: userId,
    provider,
    customer_key: customerKey,
    created_at: now,
    updated_at: now,
  };
}

export async function listActivePlans(
  db: D1Database,
): Promise<SubscriptionPlanRecord[]> {
  const result = await db
    .prepare(
      "SELECT id, plan_code, name, billing_interval, currency, amount, is_active, created_at, updated_at FROM subscription_plans WHERE is_active = 1 ORDER BY amount ASC, created_at ASC",
    )
    .all<SubscriptionPlanRecord>();

  return result.results;
}

export async function findPlanByCode(
  db: D1Database,
  planCode: string,
): Promise<SubscriptionPlanRecord | null> {
  return (
    (await db
      .prepare(
        "SELECT id, plan_code, name, billing_interval, currency, amount, is_active, created_at, updated_at FROM subscription_plans WHERE plan_code = ?",
      )
      .bind(planCode)
      .first<SubscriptionPlanRecord>()) ?? null
  );
}

export async function findLatestSubscriptionForUser(
  db: D1Database,
  userId: string,
): Promise<SubscriptionWithPlanRecord | null> {
  return (
    (await db
      .prepare(
        "SELECT s.id, s.user_id, s.billing_customer_id, s.plan_id, s.status, s.current_period_start, s.current_period_end, s.cancel_at_period_end, s.canceled_at, s.ended_at, s.trial_start, s.trial_end, s.billing_anchor_at, s.latest_payment_method_id, s.created_at, s.updated_at, p.id AS plan_id_alias, p.plan_code, p.name, p.billing_interval, p.currency, p.amount, p.is_active, p.created_at AS plan_created_at, p.updated_at AS plan_updated_at FROM subscriptions s INNER JOIN subscription_plans p ON p.id = s.plan_id WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1",
      )
      .bind(userId)
      .first<SubscriptionWithPlanRecord>()) ?? null
  );
}

export async function findSubscriptionById(
  db: D1Database,
  subscriptionId: string,
): Promise<SubscriptionWithPlanRecord | null> {
  return (
    (await db
      .prepare(
        "SELECT s.id, s.user_id, s.billing_customer_id, s.plan_id, s.status, s.current_period_start, s.current_period_end, s.cancel_at_period_end, s.canceled_at, s.ended_at, s.trial_start, s.trial_end, s.billing_anchor_at, s.latest_payment_method_id, s.created_at, s.updated_at, p.id AS plan_id_alias, p.plan_code, p.name, p.billing_interval, p.currency, p.amount, p.is_active, p.created_at AS plan_created_at, p.updated_at AS plan_updated_at FROM subscriptions s INNER JOIN subscription_plans p ON p.id = s.plan_id WHERE s.id = ?",
      )
      .bind(subscriptionId)
      .first<SubscriptionWithPlanRecord>()) ?? null
  );
}

export async function createSubscription(
  db: D1Database,
  {
    userId,
    billingCustomerId,
    planId,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    billingAnchorAt,
    now,
  }: {
    userId: string;
    billingCustomerId: string;
    planId: string;
    status: SubscriptionStatus;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    billingAnchorAt: string | null;
    now: string;
  },
): Promise<SubscriptionRecord> {
  const id = createId("sub");

  await db
    .prepare(
      "INSERT INTO subscriptions (id, user_id, billing_customer_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at, ended_at, trial_start, trial_end, billing_anchor_at, latest_payment_method_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      userId,
      billingCustomerId,
      planId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      0,
      null,
      null,
      null,
      null,
      billingAnchorAt,
      null,
      now,
      now,
    )
    .run();

  return {
    id,
    user_id: userId,
    billing_customer_id: billingCustomerId,
    plan_id: planId,
    status,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: 0,
    canceled_at: null,
    ended_at: null,
    trial_start: null,
    trial_end: null,
    billing_anchor_at: billingAnchorAt,
    latest_payment_method_id: null,
    created_at: now,
    updated_at: now,
  };
}

export async function markSubscriptionCanceled(
  db: D1Database,
  {
    subscriptionId,
    now,
  }: {
    subscriptionId: string;
    now: string;
  },
) {
  await db
    .prepare(
      "UPDATE subscriptions SET status = ?, cancel_at_period_end = ?, canceled_at = ?, ended_at = ?, updated_at = ? WHERE id = ?",
    )
    .bind("canceled", 1, now, now, now, subscriptionId)
    .run();
}

export async function createSubscriptionCycle(
  db: D1Database,
  {
    subscriptionId,
    cycleIndex,
    periodStart,
    periodEnd,
    status,
    scheduledAmount,
    currency,
    tossOrderId,
    chargedAt,
    failedAt,
    failureCode,
    failureMessage,
    now,
  }: {
    subscriptionId: string;
    cycleIndex: number;
    periodStart: string;
    periodEnd: string;
    status: SubscriptionCycleRecord["status"];
    scheduledAmount: number;
    currency: string;
    tossOrderId: string;
    chargedAt: string | null;
    failedAt: string | null;
    failureCode: string | null;
    failureMessage: string | null;
    now: string;
  },
): Promise<SubscriptionCycleRecord> {
  const id = createId("scyc");

  await db
    .prepare(
      "INSERT INTO subscription_cycles (id, subscription_id, cycle_index, period_start, period_end, status, scheduled_amount, currency, payment_method_id, toss_payment_key, toss_order_id, charged_at, failed_at, failure_code, failure_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      subscriptionId,
      cycleIndex,
      periodStart,
      periodEnd,
      status,
      scheduledAmount,
      currency,
      null,
      null,
      tossOrderId,
      chargedAt,
      failedAt,
      failureCode,
      failureMessage,
      now,
      now,
    )
    .run();

  return {
    id,
    subscription_id: subscriptionId,
    cycle_index: cycleIndex,
    period_start: periodStart,
    period_end: periodEnd,
    status,
    scheduled_amount: scheduledAmount,
    currency,
    payment_method_id: null,
    toss_payment_key: null,
    toss_order_id: tossOrderId,
    charged_at: chargedAt,
    failed_at: failedAt,
    failure_code: failureCode,
    failure_message: failureMessage,
    created_at: now,
    updated_at: now,
  };
}

export async function listCyclesBySubscriptionId(
  db: D1Database,
  subscriptionId: string,
): Promise<SubscriptionCycleRecord[]> {
  const result = await db
    .prepare(
      "SELECT id, subscription_id, cycle_index, period_start, period_end, status, scheduled_amount, currency, payment_method_id, toss_payment_key, toss_order_id, charged_at, failed_at, failure_code, failure_message, created_at, updated_at FROM subscription_cycles WHERE subscription_id = ? ORDER BY cycle_index DESC",
    )
    .bind(subscriptionId)
    .all<SubscriptionCycleRecord>();

  return result.results;
}

export async function findBillingEventByKey(
  db: D1Database,
  eventKey: string,
): Promise<BillingEventRecord | null> {
  return (
    (await db
      .prepare(
        "SELECT id, provider, event_key, event_type, source_type, related_user_id, related_subscription_id, related_cycle_id, payload_json, processing_status, processing_attempts, last_error_message, received_at, processed_at FROM billing_events WHERE event_key = ?",
      )
      .bind(eventKey)
      .first<BillingEventRecord>()) ?? null
  );
}

export async function listBillingEventsByUserId(
  db: D1Database,
  userId: string,
): Promise<BillingEventRecord[]> {
  const result = await db
    .prepare(
      "SELECT id, provider, event_key, event_type, source_type, related_user_id, related_subscription_id, related_cycle_id, payload_json, processing_status, processing_attempts, last_error_message, received_at, processed_at FROM billing_events WHERE related_user_id = ? ORDER BY received_at DESC",
    )
    .bind(userId)
    .all<BillingEventRecord>();

  return result.results;
}

export async function createBillingEvent(
  db: D1Database,
  input: BillingEventInput,
): Promise<BillingEventRecord> {
  const id = createId("bevt");

  await db
    .prepare(
      "INSERT INTO billing_events (id, provider, event_key, event_type, source_type, related_user_id, related_subscription_id, related_cycle_id, payload_json, processing_status, processing_attempts, last_error_message, received_at, processed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      input.provider,
      input.eventKey,
      input.eventType,
      input.sourceType,
      input.relatedUserId,
      input.relatedSubscriptionId,
      input.relatedCycleId,
      JSON.stringify(input.payload ?? {}),
      "pending",
      0,
      null,
      input.receivedAt,
      null,
    )
    .run();

  return {
    id,
    provider: input.provider,
    event_key: input.eventKey,
    event_type: input.eventType,
    source_type: input.sourceType,
    related_user_id: input.relatedUserId,
    related_subscription_id: input.relatedSubscriptionId,
    related_cycle_id: input.relatedCycleId,
    payload_json: JSON.stringify(input.payload ?? {}),
    processing_status: "pending",
    processing_attempts: 0,
    last_error_message: null,
    received_at: input.receivedAt,
    processed_at: null,
  };
}

export async function updateBillingEventProcessing(
  db: D1Database,
  {
    eventId,
    processingStatus,
    processingAttempts,
    lastErrorMessage,
    processedAt,
  }: {
    eventId: string;
    processingStatus: BillingEventProcessingStatus;
    processingAttempts: number;
    lastErrorMessage: string | null;
    processedAt: string | null;
  },
) {
  await db
    .prepare(
      "UPDATE billing_events SET processing_status = ?, processing_attempts = ?, last_error_message = ?, processed_at = ? WHERE id = ?",
    )
    .bind(
      processingStatus,
      processingAttempts,
      lastErrorMessage,
      processedAt,
      eventId,
    )
    .run();
}

export async function deleteEntitlementsForUser(
  db: D1Database,
  userId: string,
) {
  await db
    .prepare("DELETE FROM entitlements WHERE user_id = ?")
    .bind(userId)
    .run();
}

export async function listEntitlementsByUserId(
  db: D1Database,
  userId: string,
): Promise<EntitlementRecord[]> {
  const result = await db
    .prepare(
      "SELECT id, user_id, feature_key, status, effective_from, effective_until, source_type, source_id, created_at, updated_at FROM entitlements WHERE user_id = ? ORDER BY feature_key ASC, created_at ASC",
    )
    .bind(userId)
    .all<EntitlementRecord>();

  return result.results;
}

export async function createEntitlement(
  db: D1Database,
  {
    userId,
    featureKey,
    status,
    effectiveFrom,
    effectiveUntil,
    sourceType,
    sourceId,
    now,
  }: {
    userId: string;
    featureKey: string;
    status: EntitlementRecord["status"];
    effectiveFrom: string;
    effectiveUntil: string | null;
    sourceType: string;
    sourceId: string;
    now: string;
  },
): Promise<EntitlementRecord> {
  const id = createId("ent");

  await db
    .prepare(
      "INSERT INTO entitlements (id, user_id, feature_key, status, effective_from, effective_until, source_type, source_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      userId,
      featureKey,
      status,
      effectiveFrom,
      effectiveUntil,
      sourceType,
      sourceId,
      now,
      now,
    )
    .run();

  return {
    id,
    user_id: userId,
    feature_key: featureKey,
    status,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    source_type: sourceType,
    source_id: sourceId,
    created_at: now,
    updated_at: now,
  };
}

export async function listManualEntitlementOverridesByUserId(
  db: D1Database,
  userId: string,
): Promise<ManualEntitlementOverrideRecord[]> {
  const result = await db
    .prepare(
      "SELECT id, user_id, feature_key, override_status, effective_from, effective_until, reason, created_by, created_at FROM manual_entitlement_overrides WHERE user_id = ? ORDER BY created_at ASC",
    )
    .bind(userId)
    .all<ManualEntitlementOverrideRecord>();

  return result.results;
}
