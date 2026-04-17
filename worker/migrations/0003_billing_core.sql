CREATE TABLE IF NOT EXISTS billing_customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  customer_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_customers_provider
  ON billing_customers (provider, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  billing_customer_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  billing_key TEXT NOT NULL UNIQUE,
  method_type TEXT NOT NULL,
  card_company TEXT,
  card_number_masked TEXT,
  card_owner_type TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  revoked_at TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_payment_methods_user
  ON billing_payment_methods (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_payment_methods_customer
  ON billing_payment_methods (billing_customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  plan_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active_amount
  ON subscription_plans (is_active, amount, created_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  billing_customer_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  canceled_at TEXT,
  ended_at TEXT,
  trial_start TEXT,
  trial_end TEXT,
  billing_anchor_at TEXT,
  latest_payment_method_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_created_at
  ON subscriptions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_created_at
  ON subscriptions (billing_customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subscription_cycles (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  cycle_index INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL,
  scheduled_amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  payment_method_id TEXT,
  toss_payment_key TEXT,
  toss_order_id TEXT NOT NULL UNIQUE,
  charged_at TEXT,
  failed_at TEXT,
  failure_code TEXT,
  failure_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(subscription_id, cycle_index)
);

CREATE INDEX IF NOT EXISTS idx_subscription_cycles_subscription
  ON subscription_cycles (subscription_id, cycle_index DESC);

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  related_user_id TEXT,
  related_subscription_id TEXT,
  related_cycle_id TEXT,
  payload_json TEXT NOT NULL,
  processing_status TEXT NOT NULL,
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  last_error_message TEXT,
  received_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_billing_events_user_received_at
  ON billing_events (related_user_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_events_status_received_at
  ON billing_events (processing_status, received_at DESC);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  status TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user_status
  ON entitlements (user_id, status, feature_key);

CREATE TABLE IF NOT EXISTS manual_entitlement_overrides (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  override_status TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_manual_entitlement_overrides_user_feature
  ON manual_entitlement_overrides (user_id, feature_key, created_at DESC);

INSERT INTO subscription_plans (
  id,
  plan_code,
  name,
  billing_interval,
  currency,
  amount,
  is_active,
  created_at,
  updated_at
)
SELECT
  'plan_free',
  'free',
  'Free',
  'none',
  'KRW',
  0,
  1,
  '2026-04-18T00:00:00.000Z',
  '2026-04-18T00:00:00.000Z'
WHERE NOT EXISTS (
  SELECT 1
  FROM subscription_plans
  WHERE plan_code = 'free'
);

INSERT INTO subscription_plans (
  id,
  plan_code,
  name,
  billing_interval,
  currency,
  amount,
  is_active,
  created_at,
  updated_at
)
SELECT
  'plan_pro_monthly',
  'pro_monthly',
  'Pro Monthly',
  'month',
  'KRW',
  9900,
  1,
  '2026-04-18T00:00:00.000Z',
  '2026-04-18T00:00:00.000Z'
WHERE NOT EXISTS (
  SELECT 1
  FROM subscription_plans
  WHERE plan_code = 'pro_monthly'
);
