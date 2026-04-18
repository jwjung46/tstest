import {
  useQuery,
  type QueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  fetchBillingHistory,
  fetchBillingOverview,
} from "../services/billing-api.ts";
import { billingQueryKeys } from "./billing-query-keys.ts";
import type {
  BillingCustomer,
  BillingCycleSummary,
  BillingEventSummary,
  BillingPlan,
  BillingSubscription,
  EntitlementSummary,
} from "../types/billing.ts";

export type BillingSummary = {
  customer: BillingCustomer;
  subscription: BillingSubscription | null;
  entitlements: EntitlementSummary[];
  availablePlans: BillingPlan[];
};

export type BillingHistory = {
  cycles: BillingCycleSummary[];
  events: BillingEventSummary[];
};

export async function fetchBillingSummary(): Promise<BillingSummary> {
  const overview = await fetchBillingOverview();

  return {
    customer: overview.customer,
    subscription: overview.subscription,
    entitlements: overview.entitlements,
    availablePlans: overview.availablePlans,
  };
}

export function prefetchBillingSummaryQuery(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: billingQueryKeys.summary,
    queryFn: fetchBillingSummary,
  });
}

export function useBillingSummaryQuery() {
  return useQuery({
    queryKey: billingQueryKeys.summary,
    queryFn: fetchBillingSummary,
  });
}

export function useBillingHistoryQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: billingQueryKeys.history,
    queryFn: async (): Promise<BillingHistory> => fetchBillingHistory(),
    enabled: options?.enabled,
  } satisfies UseQueryOptions<BillingHistory>);
}
