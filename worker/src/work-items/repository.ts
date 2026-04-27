import type { WorkItemRecord } from "./types.ts";

export async function listWorkItemsForUser(
  db: D1Database,
  userId: string,
): Promise<WorkItemRecord[]> {
  const result = await db
    .prepare(
      "SELECT id, title, description, type, status, requester_user_id, assignee_user_id, created_at, updated_at FROM work_items WHERE requester_user_id = ? OR assignee_user_id = ? ORDER BY created_at DESC, id ASC",
    )
    .bind(userId, userId)
    .all<WorkItemRecord>();

  return result.results;
}
