CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  primary_email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL,
  merged_into_user_id TEXT
);

CREATE TABLE IF NOT EXISTS user_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,
  email_verified INTEGER,
  provider_display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL,
  UNIQUE(provider, provider_user_id),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user_id
  ON user_identities (user_id);

CREATE INDEX IF NOT EXISTS idx_user_status
  ON users (status);
