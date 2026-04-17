import { requestJson } from "../../../platform/api/client.ts";
import type {
  BillingEntitlementsResponse,
  BillingOverviewResponse,
  BillingSubscriptionResponse,
} from "../types/billing.ts";

export async function fetchBillingOverview() {
  return requestJson<BillingOverviewResponse>(
    "/api/billing/customer/bootstrap",
    {
      method: "POST",
    },
  );
}

export async function fetchBillingSubscription() {
  return requestJson<BillingSubscriptionResponse>("/api/billing/subscription");
}

export async function fetchBillingEntitlements() {
  return requestJson<BillingEntitlementsResponse>("/api/billing/entitlements");
}
