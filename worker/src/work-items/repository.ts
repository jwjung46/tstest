import type { CreateWorkItemRecordInput, WorkItemRecord } from "./types.ts";

function createWorkItemId() {
  return `wi_${crypto.randomUUID()}`;
}

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

export async function createWorkItemRecord(
  db: D1Database,
  {
    title,
    description,
    type,
    requesterUserId,
    assigneeUserId,
    now,
  }: CreateWorkItemRecordInput,
): Promise<WorkItemRecord> {
  const id = createWorkItemId();
  const status = "processing";

  await db
    .prepare(
      "INSERT INTO work_items (id, title, description, type, status, requester_user_id, assignee_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      title,
      description,
      type,
      status,
      requesterUserId,
      assigneeUserId,
      now,
      now,
    )
    .run();

  return {
    id,
    title,
    description,
    type,
    status,
    requester_user_id: requesterUserId,
    assignee_user_id: assigneeUserId,
    created_at: now,
    updated_at: now,
  };
}
