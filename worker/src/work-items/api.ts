import type { WorkerEnv } from "../env.ts";
import { readSessionFromRequest } from "../oauth/session.ts";
import { listVisibleWorkItems } from "./service.ts";

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

export async function handleWorkItemsApiRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname !== "/api/work-items") {
    return null;
  }

  if (request.method !== "GET") {
    return jsonError(405, "method_not_allowed", "Method not allowed.");
  }

  const session = await readSessionFromRequest(env.AUTH_COOKIE_SECRET, request);

  if (!session) {
    return jsonError(401, "unauthorized", "Sign in is required.");
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
