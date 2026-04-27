import { listWorkItemsForUser } from "./repository.ts";
import type { WorkItemDto, WorkItemRecord } from "./types.ts";

function toWorkItemDto(record: WorkItemRecord): WorkItemDto {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    type: record.type,
    status: record.status,
    requesterUserId: record.requester_user_id,
    assigneeUserId: record.assignee_user_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function listVisibleWorkItems(db: D1Database, userId: string) {
  const workItems = await listWorkItemsForUser(db, userId);

  return workItems.map(toWorkItemDto);
}
