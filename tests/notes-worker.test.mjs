import test from "node:test";
import assert from "node:assert/strict";

import worker from "../worker/src/index.ts";
import { handleNotesRequest } from "../worker/src/notes/api.ts";
import {
  createTossApiResponse,
  createBillingEnv,
  createCookieHeader,
  createExecutionContext,
  withPatchedFetch,
} from "./helpers/billing-test-helpers.mjs";

test("notes list requires an authenticated session", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/notes"),
    createBillingEnv(),
    createExecutionContext(),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "unauthorized",
      message: "Authentication is required.",
    },
  });
});

test("non-notes paths return null before touching session env", async () => {
  const env = {
    get AUTH_COOKIE_SECRET() {
      throw new Error("session env should not be touched");
    },
    DB: createBillingEnv().DB,
  };

  const response = await handleNotesRequest(
    new Request("https://example.com/api/session"),
    env,
  );

  assert.equal(response, null);
});

test("notes APIs only expose notes owned by the current session user", async () => {
  const env = createBillingEnv();
  env.DB.state.notes.push(
    {
      id: "note-1",
      user_id: "user-1",
      title: "",
      content: "Mine",
      created_at: "2026-04-17T09:00:00.000Z",
      updated_at: "2026-04-17T09:00:00.000Z",
    },
    {
      id: "note-2",
      user_id: "user-2",
      title: "Other",
      content: "Other user note",
      created_at: "2026-04-17T08:00:00.000Z",
      updated_at: "2026-04-17T08:00:00.000Z",
    },
  );

  const response = await worker.fetch(
    new Request("https://example.com/api/notes", {
      headers: {
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET),
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    notes: [
      {
        id: "note-1",
        title: "",
        content: "Mine",
        createdAt: "2026-04-17T09:00:00.000Z",
        updatedAt: "2026-04-17T09:00:00.000Z",
      },
    ],
  });
});

test("creating a note returns the saved note and listable timestamps", async () => {
  const env = createBillingEnv();
  const response = await worker.fetch(
    new Request("https://example.com/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET),
      },
      body: JSON.stringify({
        title: "",
        content: "First note",
      }),
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(typeof payload.note.id, "string");
  assert.equal(payload.note.title, "");
  assert.equal(payload.note.content, "First note");
  assert.match(payload.note.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(payload.note.createdAt, payload.note.updatedAt);
});

test("creating a note rejects empty title and whitespace-only content", async () => {
  const env = createBillingEnv();
  const response = await worker.fetch(
    new Request("https://example.com/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET),
      },
      body: JSON.stringify({
        title: "   ",
        content: "   ",
      }),
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "validation_error",
      message: "Add some note content before saving.",
    },
  });
});

test("updating and deleting require ownership of the target note", async () => {
  const env = createBillingEnv();
  env.DB.state.notes.push({
    id: "note-1",
    user_id: "user-2",
    title: "Other",
    content: "Other user note",
    created_at: "2026-04-17T08:00:00.000Z",
    updated_at: "2026-04-17T08:00:00.000Z",
  });

  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);
  const patchResponse = await worker.fetch(
    new Request("https://example.com/api/notes/note-1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        title: "Updated",
        content: "Updated",
      }),
    }),
    env,
    createExecutionContext(),
  );

  const deleteResponse = await worker.fetch(
    new Request("https://example.com/api/notes/note-1", {
      method: "DELETE",
      headers: {
        cookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(patchResponse.status, 404);
  assert.equal(deleteResponse.status, 404);
});

test("updating a note changes content and bumps updatedAt", async () => {
  const env = createBillingEnv();
  env.DB.state.notes.push({
    id: "note-1",
    user_id: "user-1",
    title: "Before",
    content: "Before content",
    created_at: "2026-04-17T08:00:00.000Z",
    updated_at: "2026-04-17T08:00:00.000Z",
  });

  const response = await worker.fetch(
    new Request("https://example.com/api/notes/note-1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET),
      },
      body: JSON.stringify({
        title: "",
        content: "After content",
      }),
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.note.id, "note-1");
  assert.equal(payload.note.title, "");
  assert.equal(payload.note.content, "After content");
  assert.notEqual(payload.note.updatedAt, "2026-04-17T08:00:00.000Z");
});

test("deleting a note removes it for the current owner", async () => {
  const env = createBillingEnv();
  env.DB.state.notes.push({
    id: "note-1",
    user_id: "user-1",
    title: "",
    content: "Delete me",
    created_at: "2026-04-17T08:00:00.000Z",
    updated_at: "2026-04-17T08:00:00.000Z",
  });

  const response = await worker.fetch(
    new Request("https://example.com/api/notes/note-1", {
      method: "DELETE",
      headers: {
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET),
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(env.DB.state.notes.length, 0);
});

function createStage2BillingEnv(overrides = {}) {
  const env = createBillingEnv({
    users: [
      {
        id: "user-1",
        display_name: "Test User",
        primary_email: "test@example.com",
        created_at: "2026-04-18T00:00:00.000Z",
        updated_at: "2026-04-18T00:00:00.000Z",
        status: "active",
        merged_into_user_id: null,
      },
    ],
    subscriptionPlans: [
      {
        id: "plan-free",
        plan_code: "free",
        name: "Free",
        billing_interval: "none",
        currency: "KRW",
        amount: 0,
        is_active: 1,
        created_at: "2026-04-18T00:00:00.000Z",
        updated_at: "2026-04-18T00:00:00.000Z",
      },
      {
        id: "plan-pro",
        plan_code: "pro_monthly",
        name: "Pro Monthly",
        billing_interval: "month",
        currency: "KRW",
        amount: 9900,
        is_active: 1,
        created_at: "2026-04-18T00:00:00.000Z",
        updated_at: "2026-04-18T00:00:00.000Z",
      },
    ],
  });

  const envOverrides = {};

  for (const [key, value] of Object.entries(overrides)) {
    if (
      key === "TOSS_PAYMENTS_CLIENT_KEY" ||
      key === "TOSS_PAYMENTS_SECRET_KEY" ||
      key === "TOSS_PAYMENTS_ENVIRONMENT" ||
      key === "TOSS_PAYMENTS_API_BASE_URL"
    ) {
      envOverrides[key] = value;
      continue;
    }

    env.DB.state[key] = value;
  }

  return {
    ...env,
    ...envOverrides,
  };
}

function createTossSuccessPayload({
  orderId,
  paymentKey = "pay_confirmed_1",
  approvedAt = "2026-04-18T10:00:00.000Z",
  totalAmount = 9900,
  status = "DONE",
} = {}) {
  return {
    mId: "test_mid",
    version: "2022-11-16",
    paymentKey,
    type: "NORMAL",
    orderId,
    orderName: "Pro Monthly 30-day access",
    method: "카드",
    status,
    requestedAt: "2026-04-18T09:59:00.000Z",
    approvedAt,
    totalAmount,
    balanceAmount: totalAmount,
    suppliedAmount: totalAmount,
    vat: 900,
    currency: "KRW",
  };
}

test("billing customer bootstrap requires an authenticated internal-user session", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/billing/customer/bootstrap", {
      method: "POST",
    }),
    createBillingEnv(),
    createExecutionContext(),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "unauthorized",
      message: "Authentication is required.",
    },
  });
});

test("billing customer bootstrap creates one Toss billing customer per internal user", async () => {
  const env = createStage2BillingEnv();
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);

  const firstResponse = await worker.fetch(
    new Request("https://example.com/api/billing/customer/bootstrap", {
      method: "POST",
      headers: {
        cookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(firstResponse.status, 200);
  const firstPayload = await firstResponse.json();
  assert.equal(firstPayload.customer.userId, "user-1");
  assert.equal(firstPayload.customer.provider, "toss_payments");
  assert.match(firstPayload.customer.customerKey, /^tcus_[a-f0-9]+$/);
  assert.ok(firstPayload.customer.customerKey.length <= 50);
  assert.equal(firstPayload.subscription, null);
  assert.deepEqual(
    firstPayload.entitlements.map((entry) => entry.featureKey),
    ["notes.basic"],
  );
  assert.deepEqual(
    firstPayload.availablePlans.map((plan) => plan.planCode),
    ["free", "pro_monthly"],
  );
  assert.equal(env.DB.state.billingCustomers.length, 1);

  const secondResponse = await worker.fetch(
    new Request("https://example.com/api/billing/customer/bootstrap", {
      method: "POST",
      headers: {
        cookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(secondResponse.status, 200);
  const secondPayload = await secondResponse.json();
  assert.equal(secondPayload.customer.id, firstPayload.customer.id);
  assert.equal(env.DB.state.billingCustomers.length, 1);
});

test("billing customer bootstrap upgrades a legacy Toss customer key to the canonical rule", async () => {
  const env = createStage2BillingEnv({
    billingCustomers: [
      {
        id: "bcus_legacy",
        user_id: "user-1",
        provider: "toss_payments",
        customer_key:
          "toss_customer_internal-user-1234567890-provider-independent-abcdefghijklmnopqrstuvwxyz",
        created_at: "2026-04-18T09:00:00.000Z",
        updated_at: "2026-04-18T09:00:00.000Z",
      },
    ],
  });
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);

  const response = await worker.fetch(
    new Request("https://example.com/api/billing/customer/bootstrap", {
      method: "POST",
      headers: {
        cookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.customer.id, "bcus_legacy");
  assert.match(payload.customer.customerKey, /^tcus_[a-f0-9]+$/);
  assert.ok(payload.customer.customerKey.length <= 50);
  assert.equal(
    env.DB.state.billingCustomers[0].customer_key,
    payload.customer.customerKey,
  );
  assert.notEqual(
    env.DB.state.billingCustomers[0].customer_key,
    "toss_customer_internal-user-1234567890-provider-independent-abcdefghijklmnopqrstuvwxyz",
  );
});

test("billing ownership stays attached to the internal user when the login provider changes", async () => {
  const env = createStage2BillingEnv();

  const googleCookie = await createCookieHeader(env.AUTH_COOKIE_SECRET, {
    provider: "google",
  });
  const naverCookie = await createCookieHeader(env.AUTH_COOKIE_SECRET, {
    provider: "naver",
  });

  const googleResponse = await worker.fetch(
    new Request("https://example.com/api/billing/customer/bootstrap", {
      method: "POST",
      headers: {
        cookie: googleCookie,
      },
    }),
    env,
    createExecutionContext(),
  );
  const naverResponse = await worker.fetch(
    new Request("https://example.com/api/billing/customer/bootstrap", {
      method: "POST",
      headers: {
        cookie: naverCookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  const googlePayload = await googleResponse.json();
  const naverPayload = await naverResponse.json();

  assert.equal(googlePayload.customer.id, naverPayload.customer.id);
  assert.equal(env.DB.state.billingCustomers[0].user_id, "user-1");
});

test("checkout session creation creates a pending internal cycle for the signed-in internal user", async () => {
  const env = createStage2BillingEnv();
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);

  const response = await worker.fetch(
    new Request("https://example.com/api/billing/checkout/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        planCode: "pro_monthly",
      }),
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.checkout.planCode, "pro_monthly");
  assert.equal(payload.checkout.clientKey, "test_ck_stage2");
  assert.match(payload.checkout.orderId, /^toss_pro_monthly_/);
  assert.equal(payload.subscription.status, "incomplete");
  assert.equal(env.DB.state.subscriptions.length, 1);
  assert.equal(env.DB.state.subscriptionCycles.length, 1);
  assert.equal(env.DB.state.subscriptionCycles[0].status, "pending");
  assert.equal(
    env.DB.state.subscriptionCycles[0].toss_order_id,
    payload.checkout.orderId,
  );
});

test("billing entitlements endpoint returns internal-user entitlements instead of provider payload state", async () => {
  const env = createStage2BillingEnv();
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);

  await worker.fetch(
    new Request("https://example.com/api/billing/customer/bootstrap", {
      method: "POST",
      headers: {
        cookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  const response = await worker.fetch(
    new Request("https://example.com/api/billing/entitlements", {
      headers: {
        cookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    entitlements: [
      {
        featureKey: "notes.basic",
        status: "active",
        sourceType: "plan_default",
        sourceId: "free",
        effectiveFrom: "2026-04-18T00:00:00.000Z",
        effectiveUntil: null,
      },
    ],
  });
});

test("confirm success updates cycle, subscription, entitlements, and 30-day access window", async () => {
  const env = createStage2BillingEnv();
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);
  const sessionResponse = await worker.fetch(
    new Request("https://example.com/api/billing/checkout/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        planCode: "pro_monthly",
      }),
    }),
    env,
    createExecutionContext(),
  );
  const sessionPayload = await sessionResponse.json();

  await withPatchedFetch(
    async (request) => {
      if (
        request.url === "https://api.tosspayments.com/v1/payments/confirm" &&
        request.method === "POST"
      ) {
        return createTossApiResponse(
          createTossSuccessPayload({
            orderId: sessionPayload.checkout.orderId,
            paymentKey: "pay_confirmed_1",
            approvedAt: "2026-04-18T10:00:00.000Z",
          }),
        );
      }

      return null;
    },
    async () => {
      const confirmResponse = await worker.fetch(
        new Request("https://example.com/api/billing/checkout/confirm", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie,
          },
          body: JSON.stringify({
            paymentKey: "pay_confirmed_1",
            orderId: sessionPayload.checkout.orderId,
            amount: 9900,
          }),
        }),
        env,
        createExecutionContext(),
      );

      assert.equal(confirmResponse.status, 200);
      const confirmPayload = await confirmResponse.json();
      assert.equal(confirmPayload.result.status, "success");
      assert.equal(confirmPayload.subscription.status, "active");
      assert.equal(
        confirmPayload.subscription.currentPeriodStart,
        "2026-04-18T10:00:00.000Z",
      );
      assert.equal(
        confirmPayload.subscription.currentPeriodEnd,
        "2026-05-18T10:00:00.000Z",
      );
      assert.deepEqual(
        confirmPayload.entitlements.map((entry) => entry.featureKey),
        ["notes.basic", "notes.premium"],
      );
    },
  );

  assert.equal(env.DB.state.subscriptionCycles[0].status, "paid");
  assert.equal(
    env.DB.state.subscriptionCycles[0].toss_payment_key,
    "pay_confirmed_1",
  );
});

test("confirm failure preserves ownership integrity and records a failed billing event", async () => {
  const env = createStage2BillingEnv();
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET, {
    provider: "kakao",
  });
  const sessionResponse = await worker.fetch(
    new Request("https://example.com/api/billing/checkout/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        planCode: "pro_monthly",
      }),
    }),
    env,
    createExecutionContext(),
  );
  const sessionPayload = await sessionResponse.json();

  await withPatchedFetch(
    async (request) => {
      if (
        request.url === "https://api.tosspayments.com/v1/payments/confirm" &&
        request.method === "POST"
      ) {
        return createTossApiResponse(
          {
            code: "AMOUNT_MISMATCH",
            message: "Amount verification failed.",
          },
          {
            status: 400,
          },
        );
      }

      return null;
    },
    async () => {
      const confirmResponse = await worker.fetch(
        new Request("https://example.com/api/billing/checkout/confirm", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie,
          },
          body: JSON.stringify({
            paymentKey: "pay_failed_1",
            orderId: sessionPayload.checkout.orderId,
            amount: 9900,
          }),
        }),
        env,
        createExecutionContext(),
      );

      assert.equal(confirmResponse.status, 400);
      const confirmPayload = await confirmResponse.json();
      assert.equal(confirmPayload.error.code, "AMOUNT_MISMATCH");
    },
  );

  assert.equal(env.DB.state.subscriptionCycles[0].status, "failed");
  assert.equal(env.DB.state.subscriptions[0].user_id, "user-1");
  assert.equal(env.DB.state.billingEvents.length, 1);
  assert.equal(env.DB.state.billingEvents[0].related_user_id, "user-1");
});

test("duplicate confirm handling is safe for the same order and payment key", async () => {
  const env = createStage2BillingEnv();
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);
  const sessionResponse = await worker.fetch(
    new Request("https://example.com/api/billing/checkout/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        planCode: "pro_monthly",
      }),
    }),
    env,
    createExecutionContext(),
  );
  const sessionPayload = await sessionResponse.json();

  await withPatchedFetch(
    async (request) => {
      if (
        request.url === "https://api.tosspayments.com/v1/payments/confirm" &&
        request.method === "POST"
      ) {
        return createTossApiResponse(
          createTossSuccessPayload({
            orderId: sessionPayload.checkout.orderId,
            paymentKey: "pay_confirmed_1",
          }),
        );
      }

      return null;
    },
    async () => {
      const createConfirmRequest = () =>
        new Request("https://example.com/api/billing/checkout/confirm", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie,
          },
          body: JSON.stringify({
            paymentKey: "pay_confirmed_1",
            orderId: sessionPayload.checkout.orderId,
            amount: 9900,
          }),
        });

      const firstResponse = await worker.fetch(
        createConfirmRequest(),
        env,
        createExecutionContext(),
      );
      const secondResponse = await worker.fetch(
        createConfirmRequest(),
        env,
        createExecutionContext(),
      );

      assert.equal(firstResponse.status, 200);
      assert.equal(secondResponse.status, 200);
      assert.equal(env.DB.state.subscriptionCycles[0].status, "paid");
      assert.equal(env.DB.state.billingEvents.length, 1);
    },
  );
});

test("billing history returns only internal-user-owned records after a confirmed payment", async () => {
  const env = createStage2BillingEnv({
    subscriptionCycles: [
      {
        id: "scyc_other",
        subscription_id: "sub_other",
        cycle_index: 1,
        period_start: "2026-04-01T00:00:00.000Z",
        period_end: "2026-05-01T00:00:00.000Z",
        status: "paid",
        scheduled_amount: 9900,
        currency: "KRW",
        payment_method_id: null,
        toss_payment_key: "pay_other",
        toss_order_id: "order_other",
        charged_at: "2026-04-01T00:00:00.000Z",
        failed_at: null,
        failure_code: null,
        failure_message: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
    ],
    billingEvents: [
      {
        id: "bevt_other",
        provider: "toss_payments",
        event_key: "evt_other",
        event_type: "PAYMENT_STATUS_CHANGED",
        source_type: "webhook",
        related_user_id: "user-2",
        related_subscription_id: "sub_other",
        related_cycle_id: "scyc_other",
        payload_json: JSON.stringify({ orderId: "order_other" }),
        processing_status: "processed",
        processing_attempts: 1,
        last_error_message: null,
        received_at: "2026-04-01T00:00:00.000Z",
        processed_at: "2026-04-01T00:00:00.000Z",
      },
    ],
  });
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);
  const sessionResponse = await worker.fetch(
    new Request("https://example.com/api/billing/checkout/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        planCode: "pro_monthly",
      }),
    }),
    env,
    createExecutionContext(),
  );
  const sessionPayload = await sessionResponse.json();

  await withPatchedFetch(
    async (request) => {
      if (
        request.url === "https://api.tosspayments.com/v1/payments/confirm" &&
        request.method === "POST"
      ) {
        return createTossApiResponse(
          createTossSuccessPayload({
            orderId: sessionPayload.checkout.orderId,
            paymentKey: "pay_confirmed_1",
          }),
        );
      }

      return null;
    },
    async () => {
      await worker.fetch(
        new Request("https://example.com/api/billing/checkout/confirm", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie,
          },
          body: JSON.stringify({
            paymentKey: "pay_confirmed_1",
            orderId: sessionPayload.checkout.orderId,
            amount: 9900,
          }),
        }),
        env,
        createExecutionContext(),
      );
    },
  );

  const historyResponse = await worker.fetch(
    new Request("https://example.com/api/billing/history", {
      headers: { cookie },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(historyResponse.status, 200);
  const historyPayload = await historyResponse.json();
  assert.equal(historyPayload.cycles.length, 1);
  assert.equal(historyPayload.events.length, 1);
  assert.equal(
    historyPayload.cycles[0].tossOrderId,
    sessionPayload.checkout.orderId,
  );
  assert.equal(historyPayload.events[0].relatedUserId, "user-1");
});

test("toss webhook processing is idempotent by event key and does not require a session", async () => {
  const env = createStage2BillingEnv({
    subscriptions: [
      {
        id: "sub_1",
        user_id: "user-1",
        billing_customer_id: "bcus_1",
        plan_id: "plan-pro",
        status: "incomplete",
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: 0,
        canceled_at: null,
        ended_at: null,
        trial_start: null,
        trial_end: null,
        billing_anchor_at: null,
        latest_payment_method_id: null,
        created_at: "2026-04-18T09:00:00.000Z",
        updated_at: "2026-04-18T09:00:00.000Z",
      },
    ],
    subscriptionCycles: [
      {
        id: "scyc_1",
        subscription_id: "sub_1",
        cycle_index: 1,
        period_start: "2026-04-18T09:00:00.000Z",
        period_end: "2026-05-18T09:00:00.000Z",
        status: "pending",
        scheduled_amount: 9900,
        currency: "KRW",
        payment_method_id: null,
        toss_payment_key: null,
        toss_order_id: "toss_pro_monthly_test_1",
        charged_at: null,
        failed_at: null,
        failure_code: null,
        failure_message: null,
        created_at: "2026-04-18T09:00:00.000Z",
        updated_at: "2026-04-18T09:00:00.000Z",
      },
    ],
    billingCustomers: [
      {
        id: "bcus_1",
        user_id: "user-1",
        provider: "toss_payments",
        customer_key: "toss_customer_user-1",
        created_at: "2026-04-18T09:00:00.000Z",
        updated_at: "2026-04-18T09:00:00.000Z",
      },
    ],
  });
  const request = () =>
    new Request("https://example.com/api/webhooks/toss", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        eventId: "evt_toss_1",
        eventType: "PAYMENT_STATUS_CHANGED",
        createdAt: "2026-04-18T10:00:00.000000",
        data: {
          orderId: "toss_pro_monthly_test_1",
          paymentKey: "pay_1",
          totalAmount: 9900,
          status: "DONE",
          approvedAt: "2026-04-18T10:00:00.000Z",
        },
      }),
    });

  const firstResponse = await worker.fetch(
    request(),
    env,
    createExecutionContext(),
  );
  const secondResponse = await worker.fetch(
    request(),
    env,
    createExecutionContext(),
  );

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.equal(env.DB.state.billingEvents.length, 1);
  assert.equal(env.DB.state.subscriptionCycles[0].status, "paid");
  assert.deepEqual(await firstResponse.json(), {
    ok: true,
    duplicate: false,
    eventKey: "evt_toss_1",
  });
  assert.deepEqual(await secondResponse.json(), {
    ok: true,
    duplicate: true,
    eventKey: "evt_toss_1",
  });
});

test("checkout result reports a fail redirect and missing Toss env returns a configuration error", async () => {
  const env = createStage2BillingEnv({
    TOSS_PAYMENTS_SECRET_KEY: "",
  });
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);

  const sessionResponse = await worker.fetch(
    new Request("https://example.com/api/billing/checkout/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        planCode: "pro_monthly",
      }),
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(sessionResponse.status, 503);
  assert.deepEqual(await sessionResponse.json(), {
    error: {
      code: "billing_configuration_error",
      message:
        "Toss Payments client key and secret key must both be configured.",
    },
  });

  const resultEnv = createStage2BillingEnv();
  const resultCookie = await createCookieHeader(resultEnv.AUTH_COOKIE_SECRET);
  const resultResponse = await worker.fetch(
    new Request(
      "https://example.com/api/billing/checkout/result?flow=fail&code=PAY_PROCESS_CANCELED&message=customer+canceled",
      {
        headers: {
          cookie: resultCookie,
        },
      },
    ),
    resultEnv,
    createExecutionContext(),
  );

  assert.equal(resultResponse.status, 200);
  assert.deepEqual(await resultResponse.json(), {
    result: {
      status: "fail",
      code: "PAY_PROCESS_CANCELED",
      message: "customer canceled",
      orderId: null,
    },
    subscription: null,
    entitlements: [
      {
        featureKey: "notes.basic",
        status: "active",
        sourceType: "plan_default",
        sourceId: "free",
        effectiveFrom: "2026-04-18T00:00:00.000Z",
        effectiveUntil: null,
      },
    ],
  });
});

test("notes ownership semantics remain unchanged after billing data exists", async () => {
  const env = createBillingEnv({
    notes: [
      {
        id: "note-1",
        user_id: "user-1",
        title: "",
        content: "Mine",
        created_at: "2026-04-18T09:00:00.000Z",
        updated_at: "2026-04-18T09:00:00.000Z",
      },
      {
        id: "note-2",
        user_id: "user-2",
        title: "",
        content: "Other",
        created_at: "2026-04-18T08:00:00.000Z",
        updated_at: "2026-04-18T08:00:00.000Z",
      },
    ],
    billingCustomers: [
      {
        id: "bcus_1",
        user_id: "user-1",
        provider: "toss_payments",
        customer_key: "cust_user_1",
        created_at: "2026-04-18T00:00:00.000Z",
        updated_at: "2026-04-18T00:00:00.000Z",
      },
    ],
  });

  const response = await worker.fetch(
    new Request("https://example.com/api/notes", {
      headers: {
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET, {
          id: "user-1",
          provider: "naver",
        }),
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    notes: [
      {
        id: "note-1",
        title: "",
        content: "Mine",
        createdAt: "2026-04-18T09:00:00.000Z",
        updatedAt: "2026-04-18T09:00:00.000Z",
      },
    ],
  });
});
