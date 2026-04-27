CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('oa_response', 'prior_art_search', 'translation_review')
  ),
  status TEXT NOT NULL CHECK (
    status IN ('processing', 'completed', 'reported', 'closed')
  ),
  requester_user_id TEXT NOT NULL,
  assignee_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_items_requester_user_id
  ON work_items (requester_user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_work_items_assignee_user_id
  ON work_items (assignee_user_id, created_at);
