import { requestJson } from "../../../platform/api/client";
import type { WorkItem } from "../model/types";

export type WorkItemsResponse = {
  workItems: WorkItem[];
};

export async function listWorkItems(): Promise<WorkItem[]> {
  const response = await requestJson<WorkItemsResponse>("/api/work-items");

  return response.workItems;
}
