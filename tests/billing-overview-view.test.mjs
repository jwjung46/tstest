import test from "node:test";
import assert from "node:assert/strict";

import { getBillingOverviewView } from "../src/features/billing/model/billing-overview-view.ts";

test("billing overview keeps the summary primary while the history query is still pending", () => {
  const view = getBillingOverviewView({
    status: "ready",
    historyStatus: "loading",
    error: null,
    historyError: null,
    checkoutSession: null,
    subscription: {
      plan: {
        name: "Pro Monthly",
      },
    },
    entitlements: [{ featureKey: "app.pro" }],
    availablePlans: [{ id: "plan-1" }],
    cycles: [],
    events: [],
  });

  assert.equal(view.summary.state, "ready");
  assert.equal(view.summary.title, "Pro Monthly");
  assert.equal(view.secondary.state, "loading");
  assert.equal(view.secondary.title, "Loading billing activity");
});

test("billing overview falls back to a compact summary loading state before the first summary response", () => {
  const view = getBillingOverviewView({
    status: "loading",
    historyStatus: "idle",
    error: null,
    historyError: null,
    checkoutSession: null,
    subscription: null,
    entitlements: [],
    availablePlans: [],
    cycles: [],
    events: [],
  });

  assert.equal(view.summary.state, "loading");
  assert.equal(view.summary.title, "Loading current billing summary");
  assert.equal(view.secondary.state, "idle");
  assert.equal(
    view.secondary.title,
    "Billing activity appears after the summary loads",
  );
});

test("billing overview reports empty secondary activity without collapsing the summary section", () => {
  const view = getBillingOverviewView({
    status: "ready",
    historyStatus: "ready",
    error: null,
    historyError: null,
    checkoutSession: {
      orderId: "order-1",
    },
    subscription: null,
    entitlements: [],
    availablePlans: [{ id: "plan-1" }],
    cycles: [],
    events: [],
  });

  assert.equal(view.summary.state, "ready");
  assert.equal(view.summary.title, "No paid contract yet");
  assert.equal(view.secondary.state, "empty");
  assert.equal(view.secondary.title, "No billing activity yet");
});

test("billing overview surfaces section-level errors instead of reverting the full page to a giant loading state", () => {
  const view = getBillingOverviewView({
    status: "error",
    historyStatus: "idle",
    error: "Billing details could not be loaded right now.",
    historyError: null,
    checkoutSession: null,
    subscription: null,
    entitlements: [],
    availablePlans: [],
    cycles: [],
    events: [],
  });

  assert.equal(view.summary.state, "error");
  assert.equal(
    view.summary.description,
    "Billing details could not be loaded right now.",
  );
  assert.equal(view.secondary.state, "idle");
});
