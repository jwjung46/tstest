import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { workItemTypeLabels } from "../model/workItemLabels";
import type { CreateWorkItemInput, WorkItemType } from "../model/types";
import { createWorkItem, listWorkItems } from "../services/workItemsApi";
import WorkItemCard from "./WorkItemCard";

const workItemsQueryKey = ["work-items"] as const;

const initialCreateForm: CreateWorkItemInput = {
  title: "",
  description: "",
  type: "oa_response",
  assigneeUserId: "",
};

function normalizeCreateInput(form: CreateWorkItemInput): CreateWorkItemInput {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    assigneeUserId: form.assigneeUserId.trim(),
  };
}

function validateCreateInput(form: CreateWorkItemInput) {
  const normalized = normalizeCreateInput(form);

  if (!normalized.title) {
    return "업무 제목을 입력해 주세요.";
  }

  if (!normalized.description) {
    return "업무 설명을 입력해 주세요.";
  }

  if (!normalized.assigneeUserId) {
    return "작업자 사용자 ID를 입력해 주세요.";
  }

  return null;
}

function getMutationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "업무를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function WorkItemList() {
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] =
    useState<CreateWorkItemInput>(initialCreateForm);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const workItemsQuery = useQuery({
    queryKey: workItemsQueryKey,
    queryFn: listWorkItems,
  });
  const createWorkItemMutation = useMutation({
    mutationFn: createWorkItem,
    onMutate: () => {
      setValidationMessage(null);
      setSuccessMessage(null);
    },
    onSuccess: async () => {
      setCreateForm(initialCreateForm);
      setSuccessMessage("새 업무를 등록했습니다.");
      await queryClient.invalidateQueries({ queryKey: workItemsQueryKey });
    },
  });

  function updateCreateForm<Key extends keyof CreateWorkItemInput>(
    key: Key,
    value: CreateWorkItemInput[Key],
  ) {
    setCreateForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (createWorkItemMutation.isPending) {
      return;
    }

    const nextValidationMessage = validateCreateInput(createForm);

    if (nextValidationMessage) {
      setValidationMessage(nextValidationMessage);
      setSuccessMessage(null);
      return;
    }

    await createWorkItemMutation.mutateAsync(normalizeCreateInput(createForm));
  }

  return (
    <section
      className="work-items-panel"
      aria-busy={workItemsQuery.isPending ? "true" : undefined}
    >
      <div className="work-items-panel__header">
        <p className="eyebrow">Work items</p>
        <h1 className="work-items-panel__title">업무 목록</h1>
      </div>

      <form
        className="work-items-create-form"
        onSubmit={handleCreateSubmit}
        noValidate
      >
        <div className="work-items-create-form__header">
          <div>
            <p className="eyebrow">Create work item</p>
            <h2 className="work-items-create-form__title">새 업무 등록</h2>
          </div>
          <button
            className="work-items-create-form__submit"
            type="submit"
            disabled={createWorkItemMutation.isPending}
          >
            {createWorkItemMutation.isPending ? "등록 중..." : "업무 등록"}
          </button>
        </div>

        <div className="work-items-create-form__grid">
          <label className="work-items-create-form__field">
            <span>제목</span>
            <input
              name="title"
              type="text"
              value={createForm.title}
              onChange={(event) =>
                updateCreateForm("title", event.target.value)
              }
              disabled={createWorkItemMutation.isPending}
              autoComplete="off"
            />
          </label>

          <label className="work-items-create-form__field">
            <span>업무 유형</span>
            <select
              name="type"
              value={createForm.type}
              onChange={(event) =>
                updateCreateForm("type", event.target.value as WorkItemType)
              }
              disabled={createWorkItemMutation.isPending}
            >
              {(
                Object.entries(workItemTypeLabels) as Array<
                  [WorkItemType, string]
                >
              ).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="work-items-create-form__field">
            <span>작업자 사용자 ID</span>
            <input
              name="assigneeUserId"
              type="text"
              value={createForm.assigneeUserId}
              onChange={(event) =>
                updateCreateForm("assigneeUserId", event.target.value)
              }
              disabled={createWorkItemMutation.isPending}
              autoComplete="off"
            />
          </label>

          <label className="work-items-create-form__field work-items-create-form__field--full">
            <span>설명</span>
            <textarea
              name="description"
              value={createForm.description}
              onChange={(event) =>
                updateCreateForm("description", event.target.value)
              }
              disabled={createWorkItemMutation.isPending}
              rows={5}
            />
          </label>
        </div>

        {validationMessage ? (
          <p className="work-items-create-form__feedback" role="alert">
            {validationMessage}
          </p>
        ) : null}

        {createWorkItemMutation.isError ? (
          <p className="work-items-create-form__feedback" role="alert">
            {getMutationErrorMessage(createWorkItemMutation.error)}
          </p>
        ) : null}

        {successMessage ? (
          <p className="work-items-create-form__feedback work-items-create-form__feedback--success">
            {successMessage}
          </p>
        ) : null}
      </form>

      <div className="work-items-panel__body">
        {workItemsQuery.isPending ? (
          <p className="work-items-panel__status">
            업무 목록을 확인하고 있습니다.
          </p>
        ) : null}

        {workItemsQuery.isError ? (
          <div className="work-items-panel__message" role="alert">
            <p className="work-items-panel__message-title">
              업무 목록을 불러오지 못했습니다.
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
