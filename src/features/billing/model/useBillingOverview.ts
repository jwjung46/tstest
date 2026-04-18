import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../../platform/api/client.ts";
import { startTossPayment } from "../lib/toss-sdk.ts";
import { parseBillingCheckoutReturn } from "./checkout-result.ts";
import {
  confirmBillingCheckout,
  createBillingCheckoutSession,
  fetchBillingCheckoutResult,
} from "../services/billing-api.ts";
import { billingQueryKeys } from "./billing-query-keys.ts";
import {
  useBillingHistoryQuery,
  useBillingSummaryQuery,
  type BillingSummary,
} from "./billing-queries.ts";
import type {
  BillingCheckoutResult,
  BillingCheckoutSession,
  BillingCheckoutSessionResponse,
  BillingCustomer,
  BillingCycleSummary,
  BillingEventSummary,
  BillingPlan,
  BillingSubscription,
  EntitlementSummary,
} from "../types/billing.ts";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function buildCheckoutReturnKey(
  checkoutReturn: ReturnType<typeof parseBillingCheckoutReturn>,
) {
  if (!checkoutReturn) {
    return null;
  }

  if (checkoutReturn.flow === "success") {
    return [
      checkoutReturn.flow,
      checkoutReturn.orderId,
      checkoutReturn.paymentKey,
      checkoutReturn.amount,
    ].join(":");
  }

  return [
    checkoutReturn.flow,
    checkoutReturn.orderId,
    checkoutReturn.code,
    checkoutReturn.message,
  ].join(":");
}

function applySummaryPatch(
  currentSummary: BillingSummary | undefined,
  patch: {
    subscription: BillingSubscription | null;
    entitlements: EntitlementSummary[];
  },
): BillingSummary | undefined {
  if (!currentSummary) {
    return currentSummary;
  }

  return {
    ...currentSummary,
    subscription: patch.subscription,
    entitlements: patch.entitlements,
  };
}

export function useBillingOverview() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const checkoutReturn = useMemo(
    () => parseBillingCheckoutReturn(searchParams),
    [searchParams],
  );
  const handledCheckoutKeyRef = useRef<string | null>(null);
  const summaryQuery = useBillingSummaryQuery();
  const historyQuery = useBillingHistoryQuery({
    enabled: summaryQuery.status === "success",
  });
  const [checkoutSession, setCheckoutSession] =
    useState<BillingCheckoutSession | null>(null);
  const [checkoutResult, setCheckoutResult] =
    useState<BillingCheckoutResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const startCheckoutMutation = useMutation({
    mutationFn: createBillingCheckoutSession,
  });
  const confirmCheckoutMutation = useMutation({
    mutationFn: confirmBillingCheckout,
  });
  const fetchCheckoutResultMutation = useMutation({
    mutationFn: fetchBillingCheckoutResult,
  });

  useEffect(() => {
    const checkoutReturnKey = buildCheckoutReturnKey(checkoutReturn);
    const activeCheckoutReturn = checkoutReturn;

    if (!checkoutReturnKey || !activeCheckoutReturn) {
      handledCheckoutKeyRef.current = null;
      return;
    }

    if (handledCheckoutKeyRef.current === checkoutReturnKey) {
      return;
    }

    handledCheckoutKeyRef.current = checkoutReturnKey;
    setActionError(null);

    void (async () => {
      try {
        if (activeCheckoutReturn.flow === "success") {
          const confirmResponse = await confirmCheckoutMutation.mutateAsync({
            paymentKey: activeCheckoutReturn.paymentKey,
            orderId: activeCheckoutReturn.orderId,
            amount: activeCheckoutReturn.amount,
          });

          setCheckoutResult(confirmResponse.result);
          queryClient.setQueryData<BillingSummary | undefined>(
            billingQueryKeys.summary,
            (currentSummary) =>
              applySummaryPatch(currentSummary, {
                subscription: confirmResponse.subscription,
                entitlements: confirmResponse.entitlements,
              }),
          );
        } else {
          const resultResponse = await fetchCheckoutResultMutation.mutateAsync({
            flow: "fail",
            orderId: activeCheckoutReturn.orderId,
            code: activeCheckoutReturn.code,
            message: activeCheckoutReturn.message,
          });

          setCheckoutResult(resultResponse.result);
          queryClient.setQueryData<BillingSummary | undefined>(
            billingQueryKeys.summary,
            (currentSummary) =>
              applySummaryPatch(currentSummary, {
                subscription:
                  resultResponse.subscription ??
                  currentSummary?.subscription ??
                  null,
                entitlements: resultResponse.entitlements,
              }),
          );
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: billingQueryKeys.summary,
          }),
          queryClient.invalidateQueries({
            queryKey: billingQueryKeys.history,
          }),
        ]);
      } catch (checkoutError) {
        setActionError(
          getErrorMessage(
            checkoutError,
            "Billing checkout state could not be synchronized.",
          ),
        );
      }
    })();
  }, [
    checkoutReturn,
    confirmCheckoutMutation,
    fetchCheckoutResultMutation,
    queryClient,
  ]);

  async function startCheckout(planCode: string) {
    setActionError(null);

    try {
      const sessionResponse: BillingCheckoutSessionResponse =
        await startCheckoutMutation.mutateAsync(planCode);
      setCheckoutSession(sessionResponse.checkout);
      await startTossPayment(sessionResponse.checkout);
    } catch (checkoutError) {
      setActionError(
        getErrorMessage(
          checkoutError,
          "Toss payment could not be started right now.",
        ),
      );
    }
  }

  const status = summaryQuery.isPending
    ? "loading"
    : summaryQuery.isError
      ? "error"
      : "ready";
  const actionStatus = startCheckoutMutation.isPending
    ? "starting"
    : confirmCheckoutMutation.isPending || fetchCheckoutResultMutation.isPending
      ? "confirming"
      : "idle";
  const error =
    actionError ??
    (summaryQuery.isError
      ? getErrorMessage(
          summaryQuery.error,
          "Billing details could not be loaded right now.",
        )
      : null);
  const customer: BillingCustomer | null = summaryQuery.data?.customer ?? null;
  const subscription: BillingSubscription | null =
    summaryQuery.data?.subscription ?? null;
  const entitlements: EntitlementSummary[] =
    summaryQuery.data?.entitlements ?? [];
  const availablePlans: BillingPlan[] = summaryQuery.data?.availablePlans ?? [];
  const cycles: BillingCycleSummary[] = historyQuery.data?.cycles ?? [];
  const events: BillingEventSummary[] = historyQuery.data?.events ?? [];

  return {
    status,
    actionStatus,
    error,
    customer,
    subscription,
    entitlements,
    availablePlans,
    cycles,
    events,
    historyStatus: !historyQuery.isEnabled
      ? "idle"
      : historyQuery.isPending
        ? "loading"
        : "ready",
    historyError: historyQuery.isError
      ? getErrorMessage(
          historyQuery.error,
          "Billing history could not be loaded right now.",
        )
      : null,
    checkoutSession,
    checkoutResult: checkoutReturn ? checkoutResult : null,
    startCheckout,
  } as const;
}
