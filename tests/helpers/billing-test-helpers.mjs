import { createSessionCookie } from "../../worker/src/oauth/session.ts";

function createStatementMock(db, sql) {
  const statement = {
    sql,
    bound: [],
    bind(...values) {
      statement.bound = values;
      return statement;
    },
    first: async () => db.execute("first", sql, statement.bound),
    all: async () => {
      const rows = await db.execute("all", sql, statement.bound);
      return { results: rows };
    },
    run: async () => db.execute("run", sql, statement.bound),
  };

  return statement;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createBillingDbMock(initialState = {}) {
  const state = {
    notes: [],
    users: [],
    userIdentities: [],
    billingCustomers: [],
    billingPaymentMethods: [],
    subscriptionPlans: [],
    subscriptions: [],
    subscriptionCycles: [],
    billingEvents: [],
    entitlements: [],
    manualEntitlementOverrides: [],
    ...clone(initialState),
  };

  return {
    state,
    prepare(sql) {
      return createStatementMock(this, sql);
    },
    async execute(mode, sql, values) {
      const normalized = sql.replace(/\s+/g, " ").trim();

      if (
        normalized.startsWith(
          "SELECT id, user_id, title, content, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
        )
      ) {
        const [userId] = values;
        return state.notes
          .filter((note) => note.user_id === userId)
          .sort((left, right) =>
            right.updated_at.localeCompare(left.updated_at),
          )
          .map((note) => ({ ...note }));
      }

      if (
        normalized.startsWith(
          "SELECT id, user_id, title, content, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?",
        )
      ) {
        const [id, userId] = values;
        return (
          state.notes.find(
            (note) => note.id === id && note.user_id === userId,
          ) ?? null
        );
      }

      if (
        normalized.startsWith(
          "INSERT INTO notes (id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
      ) {
        const [id, user_id, title, content, created_at, updated_at] = values;
        state.notes.push({
          id,
          user_id,
          title,
          content,
          created_at,
          updated_at,
        });
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized.startsWith(
          "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        )
      ) {
        const [title, content, updated_at, id, userId] = values;
        const note = state.notes.find(
          (entry) => entry.id === id && entry.user_id === userId,
        );
        if (!note) {
          return { success: true, meta: { changes: 0 } };
        }

        note.title = title;
        note.content = content;
        note.updated_at = updated_at;
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized.startsWith("DELETE FROM notes WHERE id = ? AND user_id = ?")
      ) {
        const [id, userId] = values;
        const before = state.notes.length;
        state.notes = state.notes.filter(
          (note) => !(note.id === id && note.user_id === userId),
        );
        return {
          success: true,
          meta: { changes: before - state.notes.length },
        };
      }

      if (
        normalized ===
        "SELECT id, display_name, primary_email, created_at, updated_at, status, merged_into_user_id FROM users WHERE id = ?"
      ) {
        const [userId] = values;
        return state.users.find((user) => user.id === userId) ?? null;
      }

      if (
        normalized ===
        "SELECT id, user_id, provider, customer_key, created_at, updated_at FROM billing_customers WHERE user_id = ?"
      ) {
        const [userId] = values;
        return (
          state.billingCustomers.find(
            (customer) => customer.user_id === userId,
          ) ?? null
        );
      }

      if (
        normalized ===
        "SELECT id, user_id, provider, customer_key, created_at, updated_at FROM billing_customers WHERE customer_key = ?"
      ) {
        const [customerKey] = values;
        return (
          state.billingCustomers.find(
            (customer) => customer.customer_key === customerKey,
          ) ?? null
        );
      }

      if (
        normalized ===
        "INSERT INTO billing_customers (id, user_id, provider, customer_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      ) {
        const [id, user_id, provider, customer_key, created_at, updated_at] =
          values;
        state.billingCustomers.push({
          id,
          user_id,
          provider,
          customer_key,
          created_at,
          updated_at,
        });
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized ===
        "SELECT id, plan_code, name, billing_interval, currency, amount, is_active, created_at, updated_at FROM subscription_plans WHERE is_active = 1 ORDER BY amount ASC, created_at ASC"
      ) {
        return state.subscriptionPlans
          .filter((plan) => plan.is_active === 1)
          .sort((left, right) => {
            if (left.amount !== right.amount) {
              return left.amount - right.amount;
            }

            return left.created_at.localeCompare(right.created_at);
          })
          .map((plan) => ({ ...plan }));
      }

      if (
        normalized ===
        "SELECT id, plan_code, name, billing_interval, currency, amount, is_active, created_at, updated_at FROM subscription_plans WHERE plan_code = ?"
      ) {
        const [planCode] = values;
        return (
          state.subscriptionPlans.find((plan) => plan.plan_code === planCode) ??
          null
        );
      }

      if (
        normalized ===
        "SELECT s.id, s.user_id, s.billing_customer_id, s.plan_id, s.status, s.current_period_start, s.current_period_end, s.cancel_at_period_end, s.canceled_at, s.ended_at, s.trial_start, s.trial_end, s.billing_anchor_at, s.latest_payment_method_id, s.created_at, s.updated_at, p.id AS plan_id_alias, p.plan_code, p.name, p.billing_interval, p.currency, p.amount, p.is_active, p.created_at AS plan_created_at, p.updated_at AS plan_updated_at FROM subscriptions s INNER JOIN subscription_plans p ON p.id = s.plan_id WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1"
      ) {
        const [userId] = values;
        const subscription = state.subscriptions
          .filter((entry) => entry.user_id === userId)
          .sort((left, right) =>
            right.created_at.localeCompare(left.created_at),
          )[0];

        if (!subscription) {
          return null;
        }

        const plan = state.subscriptionPlans.find(
          (entry) => entry.id === subscription.plan_id,
        );

        if (!plan) {
          return null;
        }

        return {
          ...subscription,
          plan_id_alias: plan.id,
          plan_code: plan.plan_code,
          name: plan.name,
          billing_interval: plan.billing_interval,
          currency: plan.currency,
          amount: plan.amount,
          is_active: plan.is_active,
          plan_created_at: plan.created_at,
          plan_updated_at: plan.updated_at,
        };
      }

      if (
        normalized ===
        "SELECT s.id, s.user_id, s.billing_customer_id, s.plan_id, s.status, s.current_period_start, s.current_period_end, s.cancel_at_period_end, s.canceled_at, s.ended_at, s.trial_start, s.trial_end, s.billing_anchor_at, s.latest_payment_method_id, s.created_at, s.updated_at, p.id AS plan_id_alias, p.plan_code, p.name, p.billing_interval, p.currency, p.amount, p.is_active, p.created_at AS plan_created_at, p.updated_at AS plan_updated_at FROM subscriptions s INNER JOIN subscription_plans p ON p.id = s.plan_id WHERE s.id = ?"
      ) {
        const [subscriptionId] = values;
        const subscription = state.subscriptions.find(
          (entry) => entry.id === subscriptionId,
        );

        if (!subscription) {
          return null;
        }

        const plan = state.subscriptionPlans.find(
          (entry) => entry.id === subscription.plan_id,
        );

        if (!plan) {
          return null;
        }

        return {
          ...subscription,
          plan_id_alias: plan.id,
          plan_code: plan.plan_code,
          name: plan.name,
          billing_interval: plan.billing_interval,
          currency: plan.currency,
          amount: plan.amount,
          is_active: plan.is_active,
          plan_created_at: plan.created_at,
          plan_updated_at: plan.updated_at,
        };
      }

      if (
        normalized ===
        "INSERT INTO subscriptions (id, user_id, billing_customer_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at, ended_at, trial_start, trial_end, billing_anchor_at, latest_payment_method_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ) {
        const [
          id,
          user_id,
          billing_customer_id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          canceled_at,
          ended_at,
          trial_start,
          trial_end,
          billing_anchor_at,
          latest_payment_method_id,
          created_at,
          updated_at,
        ] = values;
        state.subscriptions.push({
          id,
          user_id,
          billing_customer_id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          canceled_at,
          ended_at,
          trial_start,
          trial_end,
          billing_anchor_at,
          latest_payment_method_id,
          created_at,
          updated_at,
        });
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized ===
        "UPDATE subscriptions SET status = ?, cancel_at_period_end = ?, canceled_at = ?, ended_at = ?, updated_at = ? WHERE id = ?"
      ) {
        const [
          status,
          cancel_at_period_end,
          canceled_at,
          ended_at,
          updated_at,
          subscriptionId,
        ] = values;
        const subscription = state.subscriptions.find(
          (entry) => entry.id === subscriptionId,
        );
        if (!subscription) {
          return { success: true, meta: { changes: 0 } };
        }

        subscription.status = status;
        subscription.cancel_at_period_end = cancel_at_period_end;
        subscription.canceled_at = canceled_at;
        subscription.ended_at = ended_at;
        subscription.updated_at = updated_at;
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized ===
        "INSERT INTO subscription_cycles (id, subscription_id, cycle_index, period_start, period_end, status, scheduled_amount, currency, payment_method_id, toss_payment_key, toss_order_id, charged_at, failed_at, failure_code, failure_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ) {
        const [
          id,
          subscription_id,
          cycle_index,
          period_start,
          period_end,
          status,
          scheduled_amount,
          currency,
          payment_method_id,
          toss_payment_key,
          toss_order_id,
          charged_at,
          failed_at,
          failure_code,
          failure_message,
          created_at,
          updated_at,
        ] = values;
        state.subscriptionCycles.push({
          id,
          subscription_id,
          cycle_index,
          period_start,
          period_end,
          status,
          scheduled_amount,
          currency,
          payment_method_id,
          toss_payment_key,
          toss_order_id,
          charged_at,
          failed_at,
          failure_code,
          failure_message,
          created_at,
          updated_at,
        });
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized ===
        "SELECT id, subscription_id, cycle_index, period_start, period_end, status, scheduled_amount, currency, payment_method_id, toss_payment_key, toss_order_id, charged_at, failed_at, failure_code, failure_message, created_at, updated_at FROM subscription_cycles WHERE subscription_id = ? ORDER BY cycle_index DESC"
      ) {
        const [subscriptionId] = values;
        return state.subscriptionCycles
          .filter((entry) => entry.subscription_id === subscriptionId)
          .sort((left, right) => right.cycle_index - left.cycle_index)
          .map((entry) => ({ ...entry }));
      }

      if (
        normalized ===
        "SELECT id, provider, event_key, event_type, source_type, related_user_id, related_subscription_id, related_cycle_id, payload_json, processing_status, processing_attempts, last_error_message, received_at, processed_at FROM billing_events WHERE event_key = ?"
      ) {
        const [eventKey] = values;
        return (
          state.billingEvents.find((event) => event.event_key === eventKey) ??
          null
        );
      }

      if (
        normalized ===
        "SELECT id, provider, event_key, event_type, source_type, related_user_id, related_subscription_id, related_cycle_id, payload_json, processing_status, processing_attempts, last_error_message, received_at, processed_at FROM billing_events WHERE related_user_id = ? ORDER BY received_at DESC"
      ) {
        const [userId] = values;
        return state.billingEvents
          .filter((event) => event.related_user_id === userId)
          .sort((left, right) =>
            right.received_at.localeCompare(left.received_at),
          )
          .map((event) => ({ ...event }));
      }

      if (
        normalized ===
        "INSERT INTO billing_events (id, provider, event_key, event_type, source_type, related_user_id, related_subscription_id, related_cycle_id, payload_json, processing_status, processing_attempts, last_error_message, received_at, processed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ) {
        const [
          id,
          provider,
          event_key,
          event_type,
          source_type,
          related_user_id,
          related_subscription_id,
          related_cycle_id,
          payload_json,
          processing_status,
          processing_attempts,
          last_error_message,
          received_at,
          processed_at,
        ] = values;
        state.billingEvents.push({
          id,
          provider,
          event_key,
          event_type,
          source_type,
          related_user_id,
          related_subscription_id,
          related_cycle_id,
          payload_json,
          processing_status,
          processing_attempts,
          last_error_message,
          received_at,
          processed_at,
        });
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized ===
        "UPDATE billing_events SET processing_status = ?, processing_attempts = ?, last_error_message = ?, processed_at = ? WHERE id = ?"
      ) {
        const [
          processing_status,
          processing_attempts,
          last_error_message,
          processed_at,
          eventId,
        ] = values;
        const event = state.billingEvents.find((entry) => entry.id === eventId);
        if (!event) {
          return { success: true, meta: { changes: 0 } };
        }

        event.processing_status = processing_status;
        event.processing_attempts = processing_attempts;
        event.last_error_message = last_error_message;
        event.processed_at = processed_at;
        return { success: true, meta: { changes: 1 } };
      }

      if (normalized === "DELETE FROM entitlements WHERE user_id = ?") {
        const [userId] = values;
        const before = state.entitlements.length;
        state.entitlements = state.entitlements.filter(
          (entry) => entry.user_id !== userId,
        );
        return {
          success: true,
          meta: { changes: before - state.entitlements.length },
        };
      }

      if (
        normalized ===
        "SELECT id, user_id, feature_key, status, effective_from, effective_until, source_type, source_id, created_at, updated_at FROM entitlements WHERE user_id = ? ORDER BY feature_key ASC, created_at ASC"
      ) {
        const [userId] = values;
        return state.entitlements
          .filter((entry) => entry.user_id === userId)
          .sort((left, right) => {
            const featureCompare = left.feature_key.localeCompare(
              right.feature_key,
            );
            if (featureCompare !== 0) {
              return featureCompare;
            }

            return left.created_at.localeCompare(right.created_at);
          })
          .map((entry) => ({ ...entry }));
      }

      if (
        normalized ===
        "INSERT INTO entitlements (id, user_id, feature_key, status, effective_from, effective_until, source_type, source_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ) {
        const [
          id,
          user_id,
          feature_key,
          status,
          effective_from,
          effective_until,
          source_type,
          source_id,
          created_at,
          updated_at,
        ] = values;
        state.entitlements.push({
          id,
          user_id,
          feature_key,
          status,
          effective_from,
          effective_until,
          source_type,
          source_id,
          created_at,
          updated_at,
        });
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized ===
        "SELECT id, user_id, feature_key, override_status, effective_from, effective_until, reason, created_by, created_at FROM manual_entitlement_overrides WHERE user_id = ? ORDER BY created_at ASC"
      ) {
        const [userId] = values;
        return state.manualEntitlementOverrides
          .filter((entry) => entry.user_id === userId)
          .sort((left, right) =>
            left.created_at.localeCompare(right.created_at),
          )
          .map((entry) => ({ ...entry }));
      }

      throw new Error(`Unhandled SQL in test double: ${normalized} (${mode})`);
    },
  };
}

export function createBillingEnv(initialState = {}) {
  return {
    AUTH_COOKIE_SECRET: "super-secret-auth-cookie-key",
    GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    KAKAO_OAUTH_CLIENT_ID: "kakao-client-id",
    KAKAO_OAUTH_CLIENT_SECRET: "kakao-client-secret",
    NAVER_OAUTH_CLIENT_ID: "naver-client-id",
    NAVER_OAUTH_CLIENT_SECRET: "naver-client-secret",
    DB: createBillingDbMock(initialState),
  };
}

export async function createCookieHeader(secret, userOverrides = {}) {
  const cookie = await createSessionCookie(
    secret,
    {
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        provider: "google",
        ...userOverrides,
      },
    },
    true,
  );

  return cookie.split(";").at(0);
}

export function createExecutionContext() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}
