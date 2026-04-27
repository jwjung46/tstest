import type { WorkItemStatus, WorkItemType } from "./types";

export const workItemTypeLabels: Record<WorkItemType, string> = {
  oa_response: "OA 검토의견서 작성",
  prior_art_search: "선행기술조사 보고서 작성",
  translation_review: "번역 검수",
};

export const workItemStatusLabels: Record<WorkItemStatus, string> = {
  processing: "처리 중",
  completed: "처리 완료",
  reported: "외부 보고 완료",
  closed: "업무 종료",
};
