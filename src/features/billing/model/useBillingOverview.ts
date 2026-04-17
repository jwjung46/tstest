import { useEffect, useState } from "react";
import { ApiError } from "../../../platform/api/client.ts";
import {
  fetchBillingEntitlements,
  fetchBillingOverview,
  fetchBillingSubscription,
} from "../services/billing-api.ts";
import type {
  BillingCustomer,
  BillingPlan,
  BillingSubscription,
  EntitlementSummary,
} from "../types/billing.ts";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

export function useBillingOverview() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<BillingCustomer | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(
    null,
  );
  const [entitlements, setEntitlements] = useState<EntitlementSummary[]>([]);
  const [availablePlans, setAvailablePlans] = useState<BillingPlan[]>([]);

  useEffect(() => {
    let isActive = true;

    async function load() {
      setStatus("loading");
      setError(null);

      try {
        const [overview, subscriptionResponse, entitlementsResponse] =
          await Promise.all([
            fetchBillingOverview(),
            fetchBillingSubscription(),
            fetchBillingEntitlements(),
          ]);

        if (!isActive) {
          return;
        }

        setCustomer(overview.customer);
        setAvailablePlans(overview.availablePlans);
        setSubscription(
          subscriptionResponse.subscription ?? overview.subscription,
        );
        setEntitlements(entitlementsResponse.entitlements);
        setStatus("ready");
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(
          getErrorMessage(
            loadError,
            "Billing details could not be loaded right now.",
          ),
        );
        setStatus("error");
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  return {
    status,
    error,
    customer,
    subscription,
    entitlements,
    availablePlans,
  };
}
