import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  hasEntitlement,
  recomputeEntitlements,
} from "../worker/src/billing/entitlements.ts";
import { createBillingDbMock } from "./helpers/billing-test-helpers.mjs";
import {
  buildWorkspaceSelectionState,
  getDefaultSelectedNoteId,
  getDisplayTitle,
  getNotePreview,
  getSelectionAfterDelete,
  sortNotesByUpdatedAtDesc,
} from "../src/features/notes/model/note-state.ts";
import {
  canSaveNoteDraft,
  validateNoteInput,
} from "../src/features/notes/model/note-validation.ts";

test("validateNoteInput rejects a note when title and content are both empty", () => {
  assert.deepEqual(validateNoteInput({ title: "", content: "" }), {
    ok: false,
    error: "Add some note content before saving.",
  });
});

test("validateNoteInput rejects whitespace-only content", () => {
  assert.deepEqual(validateNoteInput({ title: "  ", content: "   " }), {
    ok: false,
    error: "Add some note content before saving.",
  });
});

test("validateNoteInput allows content-only notes", () => {
  assert.deepEqual(validateNoteInput({ title: "", content: "hello" }), {
    ok: true,
  });
  assert.equal(canSaveNoteDraft({ title: "", content: "hello" }), true);
});

test('getDisplayTitle falls back to "Untitled" for empty titles', () => {
  assert.equal(getDisplayTitle(""), "Untitled");
  assert.equal(getDisplayTitle("   "), "Untitled");
});

test("getNotePreview derives a trimmed single-line preview from content", () => {
  assert.equal(
    getNotePreview("  first line\nsecond line"),
    "first line second line",
  );
});

test("sortNotesByUpdatedAtDesc orders the most recently updated note first", () => {
  const sorted = sortNotesByUpdatedAtDesc([
    { id: "older", updatedAt: "2026-04-16T10:00:00.000Z" },
    { id: "newer", updatedAt: "2026-04-17T10:00:00.000Z" },
  ]);

  assert.deepEqual(
    sorted.map((note) => note.id),
    ["newer", "older"],
  );
});

test("getDefaultSelectedNoteId returns the first note id when notes exist", () => {
  assert.equal(
    getDefaultSelectedNoteId([
      { id: "note-1", updatedAt: "2026-04-17T10:00:00.000Z" },
      { id: "note-2", updatedAt: "2026-04-16T10:00:00.000Z" },
    ]),
    "note-1",
  );
  assert.equal(getDefaultSelectedNoteId([]), null);
});

test("buildWorkspaceSelectionState derives selected id and draft seed from loaded notes", () => {
  assert.deepEqual(
    buildWorkspaceSelectionState([
      {
        id: "note-1",
        title: "",
        content: "First",
        createdAt: "2026-04-17T10:00:00.000Z",
        updatedAt: "2026-04-17T10:00:00.000Z",
      },
      {
        id: "note-2",
        title: "Second",
        content: "Second body",
        createdAt: "2026-04-16T10:00:00.000Z",
        updatedAt: "2026-04-16T10:00:00.000Z",
      },
    ]),
    {
      selectedId: "note-1",
      selectedNote: {
        id: "note-1",
        title: "",
        content: "First",
        createdAt: "2026-04-17T10:00:00.000Z",
        updatedAt: "2026-04-17T10:00:00.000Z",
      },
    },
  );
  assert.deepEqual(buildWorkspaceSelectionState([]), {
    selectedId: null,
    selectedNote: null,
  });
});

test("getSelectionAfterDelete chooses the next note, then previous, then null", () => {
  assert.equal(
    getSelectionAfterDelete(
      [
        { id: "note-1", updatedAt: "2026-04-17T10:00:00.000Z" },
        { id: "note-2", updatedAt: "2026-04-16T10:00:00.000Z" },
        { id: "note-3", updatedAt: "2026-04-15T10:00:00.000Z" },
      ],
      "note-2",
    ),
    "note-3",
  );
  assert.equal(
    getSelectionAfterDelete(
      [
        { id: "note-1", updatedAt: "2026-04-17T10:00:00.000Z" },
        { id: "note-2", updatedAt: "2026-04-16T10:00:00.000Z" },
      ],
      "note-2",
    ),
    "note-1",
  );
  assert.equal(
    getSelectionAfterDelete(
      [{ id: "note-1", updatedAt: "2026-04-17T10:00:00.000Z" }],
      "note-1",
    ),
    null,
  );
});

test("account-linking migration creates users and user identities with merge-ready fields", () => {
  const migration = fs.readFileSync(
    path.join(
      process.cwd(),
      "worker",
      "migrations",
      "0002_account_linking.sql",
    ),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS users/i);
  assert.match(migration, /display_name TEXT NOT NULL/i);
  assert.match(migration, /primary_email TEXT/i);
  assert.match(migration, /status TEXT NOT NULL/i);
  assert.match(migration, /merged_into_user_id TEXT/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS user_identities/i);
  assert.match(migration, /provider_user_id TEXT NOT NULL/i);
  assert.match(migration, /email_verified INTEGER/i);
  assert.match(
    migration,
    /UNIQUE\s*\(\s*provider\s*,\s*provider_user_id\s*\)/i,
  );
  assert.match(migration, /UNIQUE\s*\(\s*user_id\s*,\s*provider\s*\)/i);
  assert.doesNotMatch(migration, /INSERT\s+OR\s+IGNORE\s+INTO\s+users/i);
  assert.doesNotMatch(
    migration,
    /INSERT\s+OR\s+IGNORE\s+INTO\s+user_identities/i,
  );
  assert.doesNotMatch(migration, /UPDATE\s+notes\s+SET\s+user_id/i);
  assert.doesNotMatch(migration, /Imported Google User/i);
  assert.doesNotMatch(migration, /Imported Kakao User/i);
  assert.doesNotMatch(migration, /Imported Naver User/i);
  assert.doesNotMatch(migration, /Imported User/i);
  assert.doesNotMatch(migration, /legacy:/i);
});

test("billing migration creates the Stage 1 internal subscription tables and seed plans", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "worker", "migrations", "0003_billing_core.sql"),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS billing_customers/i);
  assert.match(migration, /user_id TEXT NOT NULL UNIQUE/i);
  assert.match(migration, /customer_key TEXT NOT NULL UNIQUE/i);
  assert.match(
    migration,
    /CREATE TABLE IF NOT EXISTS billing_payment_methods/i,
  );
  assert.match(migration, /billing_key TEXT NOT NULL UNIQUE/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS subscription_plans/i);
  assert.match(migration, /plan_code TEXT NOT NULL UNIQUE/i);
  assert.match(migration, /amount INTEGER NOT NULL/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS subscriptions/i);
  assert.match(migration, /latest_payment_method_id TEXT/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS subscription_cycles/i);
  assert.match(migration, /toss_order_id TEXT NOT NULL UNIQUE/i);
  assert.match(migration, /scheduled_amount INTEGER NOT NULL/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS billing_events/i);
  assert.match(migration, /event_key TEXT NOT NULL UNIQUE/i);
  assert.match(migration, /processing_attempts INTEGER NOT NULL DEFAULT 0/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS entitlements/i);
  assert.match(migration, /feature_key TEXT NOT NULL/i);
  assert.match(
    migration,
    /CREATE TABLE IF NOT EXISTS manual_entitlement_overrides/i,
  );
  assert.match(migration, /INSERT INTO subscription_plans/i);
  assert.match(migration, /'free'/i);
  assert.match(migration, /'pro_monthly'/i);
});

test("recomputeEntitlements grants free defaults without requiring provider-scoped billing state", async () => {
  const db = createBillingDbMock({
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

  const entitlements = await recomputeEntitlements(db, "user-free", {
    now: "2026-04-18T09:00:00.000Z",
  });

  assert.deepEqual(
    entitlements.map((entry) => ({
      featureKey: entry.featureKey,
      status: entry.status,
      sourceType: entry.sourceType,
    })),
    [
      {
        featureKey: "notes.basic",
        status: "active",
        sourceType: "plan_default",
      },
    ],
  );
  assert.equal(
    await hasEntitlement(
      db,
      "user-free",
      "notes.basic",
      "2026-04-18T09:00:00.000Z",
    ),
    true,
  );
});

test("recomputeEntitlements promotes pro features from an active internal-user subscription", async () => {
  const db = createBillingDbMock({
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
    subscriptions: [
      {
        id: "sub-1",
        user_id: "user-pro",
        billing_customer_id: "bcus_1",
        plan_id: "plan-pro",
        status: "active",
        current_period_start: "2026-04-18T00:00:00.000Z",
        current_period_end: "2026-05-18T00:00:00.000Z",
        cancel_at_period_end: 0,
        canceled_at: null,
        ended_at: null,
        trial_start: null,
        trial_end: null,
        billing_anchor_at: "2026-04-18T00:00:00.000Z",
        latest_payment_method_id: null,
        created_at: "2026-04-18T00:00:00.000Z",
        updated_at: "2026-04-18T00:00:00.000Z",
      },
    ],
  });

  const entitlements = await recomputeEntitlements(db, "user-pro", {
    now: "2026-04-18T09:00:00.000Z",
  });

  assert.deepEqual(
    entitlements.map((entry) => entry.featureKey),
    ["notes.basic", "notes.premium"],
  );
  assert.equal(
    await hasEntitlement(
      db,
      "user-pro",
      "notes.premium",
      "2026-04-18T09:00:00.000Z",
    ),
    true,
  );
});
