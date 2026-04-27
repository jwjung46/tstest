import {
  workItemStatusLabels,
  workItemTypeLabels,
} from "../model/workItemLabels";
import type { WorkItem } from "../model/types";

type WorkItemCardProps = {
  workItem: WorkItem;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function WorkItemCard({ workItem }: WorkItemCardProps) {
  return (
    <article className="work-item-card">
      <div className="work-item-card__header">
        <div className="work-item-card__title-group">
          <p className="work-item-card__type">
            {workItemTypeLabels[workItem.type]}
          </p>
          <h2 className="work-item-card__title">{workItem.title}</h2>
        </div>
        <span
          className={`work-item-card__status work-item-card__status--${workItem.status}`}
        >
          {workItemStatusLabels[workItem.status]}
        </span>
      </div>

      <p className="work-item-card__description">{workItem.description}</p>

      <dl className="work-item-card__meta">
        <div>
          <dt>요청자</dt>
          <dd>{workItem.requesterUserId}</dd>
        </div>
        <div>
          <dt>작업자</dt>
          <dd>{workItem.assigneeUserId}</dd>
        </div>
        <div>
          <dt>등록</dt>
          <dd>{formatDateTime(workItem.createdAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
