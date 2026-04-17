import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../../platform/api/client.ts";
import { startTossPayment } from "../lib/toss-sdk.ts";
import { parseBillingCheckoutReturn } from "./checkout-result.ts";
import {
  confirmBillingCheckout,
  createBillingCheckoutSession,
  fetchBillingCheckoutResult,
  fetchBillingEntitlements,
  fetchBillingHistory,
  fetchBillingOverview,
  fetchBillingSubscription,
} from "../services/billing-api.ts";
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

async function loadBillingState() {
  const [overview, subscriptionResponse, entitlementsResponse, history] =
    await Promise.all([
      fetchBillingOverview(),
      fetchBillingSubscription(),
      fetchBillingEntitlements(),
      fetchBillingHistory(),
    ]);

  return {
    customer: overview.customer,
    availablePlans: overview.availablePlans,
    subscription: subscriptionResponse.subscription ?? overview.subscription,
    entitlements: entitlementsResponse.entitlements,
    cycles: history.cycles,
    events: history.events,
  };
}

export function useBillingOverview() {
  const [searchParams] = useSearchParams();
  const checkoutReturn = useMemo(
    () => parseBillingCheckoutReturn(searchParams),
    [searchParams],
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [actionStatus, setActionStatus] = useState<
    "idle" | "starting" | "confirming"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<BillingCustomer | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(
    null,
  );
  const [entitlements, setEntitlements] = useState<EntitlementSummary[]>([]);
  const [availablePlans, setAvailablePlans] = useState<BillingPlan[]>([]);
  const [cycles, setCycles] = useState<BillingCycleSummary[]>([]);
  const [events, setEvents] = useState<BillingEventSummary[]>([]);
  const [checkoutSession, setCheckoutSession] =
    useState<BillingCheckoutSession | null>(null);
  const [checkoutResult, setCheckoutResult] =
    useState<BillingCheckoutResult | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      setStatus("loading");
      setError(null);

      try {
        const initialState = await loadBillingState();

        if (!isActive) {
          return;
        }

        setCustomer(initialState.customer);
        setSubscription(initialState.subscription);
        setEntitlements(initialState.entitlements);
        setAvailablePlans(initialState.availablePlans);
        setCycles(initialState.cycles);
        setEvents(initialState.events);

        if (checkoutReturn?.flow === "success") {
          setActionStatus("confirming");

          const confirmResponse = await confirmBillingCheckout({
            paymentKey: checkoutReturn.paymentKey,
            orderId: checkoutReturn.orderId,
            amount: checkoutReturn.amount,
          });
          const refreshedState = await loadBillingState();

          if (!isActive) {
            return;
          }

          setSubscription(confirmResponse.subscription);
          setEntitlements(confirmResponse.entitlements);
          setCustomer(refreshedState.customer);
          setAvailablePlans(refreshedState.availablePlans);
          setCycles(refreshedState.cycles);
          setEvents(refreshedState.events);
          setCheckoutResult(confirmResponse.result);
          setActionStatus("idle");
        } else if (checkoutReturn?.flow === "fail") {
          setActionStatus("confirming");

          const resultResponse = await fetchBillingCheckoutResult({
            flow: "fail",
            orderId: checkoutReturn.orderId,
            code: checkoutReturn.code,
            message: checkoutReturn.message,
          });
          const refreshedState = await loadBillingState();

          if (!isActive) {
            return;
          }

          setCustomer(refreshedState.customer);
          setSubscription(
            resultResponse.subscription ?? refreshedState.subscription,
          );
          setEntitlements(resultResponse.entitlements);
          setAvailablePlans(refreshedState.availablePlans);
          setCycles(refreshedState.cycles);
          setEvents(refreshedState.events);
          setCheckoutResult(resultResponse.result);
          setActionStatus("idle");
        } else {
          setCheckoutResult(null);
          setActionStatus("idle");
        }

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
        setActionStatus("idle");
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [checkoutReturn]);

  async function startCheckout(planCode: string) {
    setActionStatus("starting");
    setError(null);

    try {
      const sessionResponse: BillingCheckoutSessionResponse =
        await createBillingCheckoutSession(planCode);
      setCheckoutSession(sessionResponse.checkout);
      await startTossPayment(sessionResponse.checkout);
    } catch (checkoutError) {
      setError(
        getErrorMessage(
          checkoutError,
          "Toss payment could not be started right now.",
        ),
      );
      setActionStatus("idle");
    }
  }

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
    checkoutSession,
    checkoutResult,
    startCheckout,
  };
}
