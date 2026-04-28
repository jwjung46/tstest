import type { WorkerEnv } from "../env.ts";
import { readSessionFromRequest } from "../oauth/session.ts";
import { createWorkItem, listVisibleWorkItems } from "./service.ts";
import type { CreateWorkItemInput, WorkItemType } from "./types.ts";

function jsonError(status: number, code: string, message: string) {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

const WORK_ITEM_TYPES = new Set<WorkItemType>([
  "oa_response",
  "prior_art_search",
  "translation_review",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRequiredString(
  body: Record<string, unknown>,
  key: string,
): string | null {
  const value = body[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return {
      ok: true,
      body: await request.json(),
    };
  } catch {
    return {
      ok: false,
    };
  }
}

async function parseCreateWorkItemInput(
  request: Request,
): Promise<
  | { ok: true; input: CreateWorkItemInput }
  | { ok: false; reason: "invalid_json" | "invalid_input" }
> {
  const parsed = await readJsonBody(request);

  if (!parsed.ok) {
    return {
      ok: false,
      reason: "invalid_json",
    };
  }

  const body = parsed.body;

  if (!isRecord(body)) {
    return {
      ok: false,
      reason: "invalid_input",
    };
  }

  const title = readRequiredString(body, "title");
  const description = readRequiredString(body, "description");
  const assigneeUserId = readRequiredString(body, "assigneeUserId");
  const type = body.type;

  if (
    !title ||
    !description ||
    typeof type !== "string" ||
    !WORK_ITEM_TYPES.has(type as WorkItemType) ||
    !assigneeUserId
  ) {
    return {
      ok: false,
      reason: "invalid_input",
    };
  }

  return {
    ok: true,
    input: {
      title,
      description,
      type: type as WorkItemType,
      assigneeUserId,
    },
  };
}

export async function handleWorkItemsApiRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname !== "/api/work-items") {
    return null;
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonError(405, "method_not_allowed", "Method not allowed.");
  }

  const session = await readSessionFromRequest(env.AUTH_COOKIE_SECRET, request);

  if (!session) {
    return jsonError(401, "unauthorized", "Sign in is required.");
  }

  if (request.method === "POST") {
    const parsedInput = await parseCreateWorkItemInput(request);

    if (!parsedInput.ok && parsedInput.reason === "invalid_json") {
      return jsonError(400, "invalid_json", "Request body must be valid JSON.");
    }

    if (!parsedInput.ok) {
      return jsonError(
        400,
        "invalid_work_item_input",
        "Work item input is invalid.",
      );
    }

    const workItem = await createWorkItem(
      env.DB,
      session.user.id,
      parsedInput.input,
    );

    return Response.json(
      {
        workItem,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  const workItems = await listVisibleWorkItems(env.DB, session.user.id);

  return Response.json(
    {
      workItems,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
