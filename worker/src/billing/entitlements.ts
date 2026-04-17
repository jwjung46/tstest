import {
  createEntitlement,
  deleteEntitlementsForUser,
  findLatestSubscriptionForUser,
  findPlanByCode,
  listEntitlementsByUserId,
  listManualEntitlementOverridesByUserId,
} from "./repository.ts";
import type { Entitlement } from "./types.ts";

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["notes.basic"],
  pro_monthly: ["notes.basic", "notes.premium"],
};

const ACCESS_GRANTING_STATUSES = new Set([
  "trialing",
  "active",
  "grace_period",
]);

function mapEntitlement(record: {
  id: string;
  user_id: string;
  feature_key: string;
  status: "active" | "inactive";
  effective_from: string;
  effective_until: string | null;
  source_type: string;
  source_id: string;
  created_at: string;
  updated_at: string;
}): Entitlement {
  return {
    id: record.id,
    userId: record.user_id,
    featureKey: record.feature_key,
    status: record.status,
    effectiveFrom: record.effective_from,
    effectiveUntil: record.effective_until,
    sourceType: record.source_type,
    sourceId: record.source_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function recomputeEntitlements(
  db: D1Database,
  userId: string,
  {
    now = new Date().toISOString(),
  }: {
    now?: string;
  } = {},
) {
  const activeSubscription = await findLatestSubscriptionForUser(db, userId);
  const freePlan = await findPlanByCode(db, "free");

  await deleteEntitlementsForUser(db, userId);

  const effectivePlanCode =
    activeSubscription &&
    ACCESS_GRANTING_STATUSES.has(activeSubscription.status)
      ? activeSubscription.plan_code
      : "free";
  const sourceType =
    effectivePlanCode === "free" ? "plan_default" : "subscription_plan";
  const sourceId =
    effectivePlanCode === "free"
      ? "free"
      : (activeSubscription?.id ?? effectivePlanCode);
  const effectiveFrom =
    effectivePlanCode === "free"
      ? (freePlan?.created_at ?? now)
      : (activeSubscription?.current_period_start ?? now);
  const effectiveUntil =
    effectivePlanCode === "free"
      ? null
      : (activeSubscription?.current_period_end ?? null);

  const entries = new Map(
    (PLAN_FEATURES[effectivePlanCode] ?? PLAN_FEATURES.free).map(
      (featureKey) => [
        featureKey,
        {
          status: "active" as "active" | "inactive",
          effectiveFrom,
          effectiveUntil,
          sourceType,
          sourceId,
        },
      ],
    ),
  );

  const overrides = await listManualEntitlementOverridesByUserId(db, userId);

  for (const override of overrides) {
    const withinWindow =
      override.effective_from <= now &&
      (override.effective_until === null || override.effective_until >= now);

    if (!withinWindow) {
      continue;
    }

    entries.set(override.feature_key, {
      status: override.override_status,
      effectiveFrom: override.effective_from,
      effectiveUntil: override.effective_until,
      sourceType: "manual_override",
      sourceId: override.id,
    });
  }

  for (const [featureKey, entry] of entries) {
    await createEntitlement(db, {
      userId,
      featureKey,
      status: entry.status,
      effectiveFrom: entry.effectiveFrom,
      effectiveUntil: entry.effectiveUntil,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      now,
    });
  }

  const entitlements = await listEntitlementsByUserId(db, userId);
  return entitlements.map(mapEntitlement);
}

export async function listEntitlements(db: D1Database, userId: string) {
  const entitlements = await listEntitlementsByUserId(db, userId);
  return entitlements.map(mapEntitlement);
}

export async function hasEntitlement(
  db: D1Database,
  userId: string,
  featureKey: string,
  at = new Date().toISOString(),
) {
  const entitlements = await listEntitlementsByUserId(db, userId);
  const entitlement = entitlements.find(
    (entry) => entry.feature_key === featureKey,
  );

  if (!entitlement) {
    return false;
  }

  if (entitlement.status !== "active") {
    return false;
  }

  if (entitlement.effective_from > at) {
    return false;
  }

  if (
    entitlement.effective_until !== null &&
    entitlement.effective_until < at
  ) {
    return false;
  }

  return true;
}
