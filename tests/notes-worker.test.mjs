import test from "node:test";
import assert from "node:assert/strict";

import worker from "../worker/src/index.ts";
import { handleNotesRequest } from "../worker/src/notes/api.ts";
import {
  createBillingEnv,
  createCookieHeader,
  createExecutionContext,
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

test("billing ownership stays attached to the internal user when the login provider changes", async () => {
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
    ],
  });

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

test("creating a paid subscription builds an internal contract and returns it from the read endpoint", async () => {
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

  const createResponse = await worker.fetch(
    new Request("https://example.com/api/billing/subscriptions", {
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

  assert.equal(createResponse.status, 201);
  const createPayload = await createResponse.json();
  assert.equal(createPayload.subscription.plan.planCode, "pro_monthly");
  assert.equal(createPayload.subscription.status, "incomplete");
  assert.equal(env.DB.state.subscriptions.length, 1);
  assert.equal(env.DB.state.subscriptionCycles.length, 1);

  const readResponse = await worker.fetch(
    new Request("https://example.com/api/billing/subscription", {
      headers: {
        cookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(readResponse.status, 200);
  const readPayload = await readResponse.json();
  assert.equal(readPayload.subscription.id, createPayload.subscription.id);
  assert.equal(readPayload.subscription.plan.planCode, "pro_monthly");
});

test("billing entitlements endpoint returns internal-user entitlements instead of provider payload state", async () => {
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
    ],
  });
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

test("billing history returns subscription cycles and billing events for the signed-in internal user", async () => {
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
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);

  await worker.fetch(
    new Request("https://example.com/api/billing/customer/bootstrap", {
      method: "POST",
      headers: { cookie },
    }),
    env,
    createExecutionContext(),
  );
  const createResponse = await worker.fetch(
    new Request("https://example.com/api/billing/subscriptions", {
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
  const createPayload = await createResponse.json();

  env.DB.state.billingEvents.push({
    id: "bevt_1",
    provider: "toss_payments",
    event_key: "evt_manual_1",
    event_type: "subscription.created",
    source_type: "api",
    related_user_id: "user-1",
    related_subscription_id: createPayload.subscription.id,
    related_cycle_id: env.DB.state.subscriptionCycles[0].id,
    payload_json: JSON.stringify({ source: "test" }),
    processing_status: "processed",
    processing_attempts: 1,
    last_error_message: null,
    received_at: "2026-04-18T09:00:00.000Z",
    processed_at: "2026-04-18T09:00:00.000Z",
  });

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
  assert.equal(historyPayload.events[0].eventKey, "evt_manual_1");
});

test("billing cancel marks the existing subscription without changing internal ownership", async () => {
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
  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);

  await worker.fetch(
    new Request("https://example.com/api/billing/customer/bootstrap", {
      method: "POST",
      headers: { cookie },
    }),
    env,
    createExecutionContext(),
  );
  const createResponse = await worker.fetch(
    new Request("https://example.com/api/billing/subscriptions", {
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
  const createPayload = await createResponse.json();

  const cancelResponse = await worker.fetch(
    new Request(
      `https://example.com/api/billing/subscriptions/${createPayload.subscription.id}/cancel`,
      {
        method: "POST",
        headers: { cookie },
      },
    ),
    env,
    createExecutionContext(),
  );

  assert.equal(cancelResponse.status, 200);
  const cancelPayload = await cancelResponse.json();
  assert.equal(cancelPayload.subscription.status, "canceled");
  assert.equal(cancelPayload.subscription.userId, "user-1");
});

test("toss webhook processing is idempotent by event key and does not require a session", async () => {
  const env = createBillingEnv();
  const request = () =>
    new Request("https://example.com/api/webhooks/toss", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        eventKey: "evt_toss_1",
        eventType: "payment.confirmed",
        sourceType: "webhook",
        relatedUserId: "user-1",
        payload: {
          paymentKey: "pay_1",
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
