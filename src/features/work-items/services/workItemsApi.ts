import { requestJson } from "../../../platform/api/client";
import type { CreateWorkItemInput, WorkItem } from "../model/types";

export type WorkItemsResponse = {
  workItems: WorkItem[];
};

export type CreateWorkItemRequest = CreateWorkItemInput;

export type CreateWorkItemResponse = {
  workItem: WorkItem;
};

export async function listWorkItems(): Promise<WorkItem[]> {
  const response = await requestJson<WorkItemsResponse>("/api/work-items");

  return response.workItems;
}

export async function createWorkItem(
  input: CreateWorkItemRequest,
): Promise<WorkItem> {
  const response = await requestJson<CreateWorkItemResponse>(
    "/api/work-items",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response.workItem;
}
