export type WorkItemType =
  | "oa_response"
  | "prior_art_search"
  | "translation_review";

export type WorkItemStatus = "processing" | "completed" | "reported" | "closed";

export type WorkItem = {
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
