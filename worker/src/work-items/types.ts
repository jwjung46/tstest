export type WorkItemType =
  | "oa_response"
  | "prior_art_search"
  | "translation_review";

export type WorkItemStatus = "processing" | "completed" | "reported" | "closed";

export type WorkItemRecord = {
  id: string;
  title: string;
  description: string;
  type: WorkItemType;
  status: WorkItemStatus;
  requester_user_id: string;
  assignee_user_id: string;
  created_at: string;
  updated_at: string;
};

export type CreateWorkItemRecordInput = {
  title: string;
  description: string;
  type: WorkItemType;
  requesterUserId: string;
  assigneeUserId: string;
  now: string;
};

export type WorkItemDto = {
  id: string;
  title: string;
  description: string;
  type: WorkItemType;
  status: WorkItemStatus;
  requesterUserId: string;
  assigneeUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkItemInput = {
  title: string;
  description: string;
  type: WorkItemType;
  assigneeUserId: string;
};
