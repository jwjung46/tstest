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

INSERT OR IGNORE INTO users (
  id,
  display_name,
  primary_email,
  created_at,
  updated_at,
  status,
  merged_into_user_id
)
SELECT
  'legacy:' || user_id,
  CASE
    WHEN user_id LIKE 'google:%' THEN 'Imported Google User'
    WHEN user_id LIKE 'kakao:%' THEN 'Imported Kakao User'
    WHEN user_id LIKE 'naver:%' THEN 'Imported Naver User'
    ELSE 'Imported User'
  END,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'active',
  NULL
FROM (
  SELECT DISTINCT user_id
  FROM notes
  WHERE user_id NOT LIKE 'legacy:%'
    AND user_id NOT IN (SELECT id FROM users)
);

INSERT OR IGNORE INTO user_identities (
  id,
  user_id,
  provider,
  provider_user_id,
  email,
  email_verified,
  provider_display_name,
  created_at,
  last_login_at
)
SELECT
  'legacy_identity:' || user_id,
  'legacy:' || user_id,
  substr(user_id, 1, instr(user_id, ':') - 1),
  substr(user_id, instr(user_id, ':') + 1),
  NULL,
  NULL,
  CASE
    WHEN user_id LIKE 'google:%' THEN 'Imported Google User'
    WHEN user_id LIKE 'kakao:%' THEN 'Imported Kakao User'
    WHEN user_id LIKE 'naver:%' THEN 'Imported Naver User'
    ELSE 'Imported User'
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT user_id
  FROM notes
  WHERE user_id NOT LIKE 'legacy:%'
    AND instr(user_id, ':') > 0
);

UPDATE notes SET user_id = 'legacy:' || user_id
WHERE user_id NOT LIKE 'legacy:%';
