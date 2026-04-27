import { useQuery } from "@tanstack/react-query";
import { listWorkItems } from "../services/workItemsApi";
import WorkItemCard from "./WorkItemCard";

const workItemsQueryKey = ["work-items"] as const;

export default function WorkItemList() {
  const workItemsQuery = useQuery({
    queryKey: workItemsQueryKey,
    queryFn: listWorkItems,
  });

  return (
    <section
      className="work-items-panel"
      aria-busy={workItemsQuery.isPending ? "true" : undefined}
    >
      <div className="work-items-panel__header">
        <p className="eyebrow">Work items</p>
        <h1 className="work-items-panel__title">업무 목록</h1>
      </div>

      <div className="work-items-panel__body">
        {workItemsQuery.isPending ? (
          <p className="work-items-panel__status">
            업무 목록을 확인하고 있습니다.
          </p>
        ) : null}

        {workItemsQuery.isError ? (
          <div className="work-items-panel__message" role="alert">
            <p className="work-items-panel__message-title">
              업무 목록을 불러오지 못했습니다
            </p>
            <p className="page-copy">잠시 후 다시 시도해 주세요.</p>
          </div>
        ) : null}

        {workItemsQuery.isSuccess && workItemsQuery.data.length === 0 ? (
          <div className="work-items-panel__message">
            <p className="work-items-panel__message-title">
              등록된 업무가 없습니다
            </p>
            <p className="page-copy">
              현재 요청자 또는 작업자로 연결된 업무가 없습니다.
            </p>
          </div>
        ) : null}

        {workItemsQuery.isSuccess && workItemsQuery.data.length > 0 ? (
          <div className="work-items-list">
            {workItemsQuery.data.map((workItem) => (
              <WorkItemCard key={workItem.id} workItem={workItem} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
