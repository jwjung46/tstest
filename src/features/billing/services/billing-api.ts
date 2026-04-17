import { requestJson } from "../../../platform/api/client.ts";
import type {
  BillingCheckoutConfirmResponse,
  BillingCheckoutResultResponse,
  BillingCheckoutSessionResponse,
  BillingEntitlementsResponse,
  BillingHistoryResponse,
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

export async function fetchBillingHistory() {
  return requestJson<BillingHistoryResponse>("/api/billing/history");
}

export async function createBillingCheckoutSession(planCode: string) {
  return requestJson<BillingCheckoutSessionResponse>(
    "/api/billing/checkout/session",
    {
      method: "POST",
      body: JSON.stringify({
        planCode,
      }),
    },
  );
}

export async function confirmBillingCheckout(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  return requestJson<BillingCheckoutConfirmResponse>(
    "/api/billing/checkout/confirm",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function fetchBillingCheckoutResult(input: {
  flow: "fail" | "pending";
  orderId?: string | null;
  code?: string | null;
  message?: string | null;
}) {
  const searchParams = new URLSearchParams({
    flow: input.flow,
  });

  if (input.orderId) {
    searchParams.set("orderId", input.orderId);
  }

  if (input.code) {
    searchParams.set("code", input.code);
  }

  if (input.message) {
    searchParams.set("message", input.message);
  }

  return requestJson<BillingCheckoutResultResponse>(
    `/api/billing/checkout/result?${searchParams.toString()}`,
  );
}
