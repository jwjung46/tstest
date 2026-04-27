import { useQuery } from "@tanstack/react-query";
import EmptyState from "../../../shared/ui/EmptyState";
import { listWorkItems } from "../services/workItemsApi";
import WorkItemCard from "./WorkItemCard";

const workItemsQueryKey = ["work-items"] as const;

export default function WorkItemList() {
  const workItemsQuery = useQuery({
    queryKey: workItemsQueryKey,
    queryFn: listWorkItems,
  });

  if (workItemsQuery.isPending) {
    return (
      <section className="work-items-panel" aria-busy="true">
        <p className="eyebrow">Work items</p>
        <h1 className="work-items-panel__title">업무를 불러오는 중</h1>
        <p className="page-copy">업무 목록을 확인하고 있습니다.</p>
      </section>
    );
  }

  if (workItemsQuery.isError) {
    return (
      <EmptyState
        eyebrow="Work items"
        title="업무 목록을 불러오지 못했습니다"
        description="잠시 후 다시 시도해 주세요."
      />
    );
  }

  if (workItemsQuery.data.length === 0) {
    return (
      <EmptyState
        eyebrow="Work items"
        title="등록된 업무가 없습니다"
        description="현재 요청자 또는 작업자로 연결된 업무가 없습니다."
      />
    );
  }

  return (
    <section className="work-items-panel">
      <div className="work-items-panel__header">
        <p className="eyebrow">Work items</p>
        <h1 className="work-items-panel__title">업무 목록</h1>
      </div>

      <div className="work-items-list">
        {workItemsQuery.data.map((workItem) => (
          <WorkItemCard key={workItem.id} workItem={workItem} />
        ))}
      </div>
    </section>
  );
}
