CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_user_updated_at
  ON notes (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_user_id
  ON notes (user_id, id);
