import type { WorkerEnv } from "../env.ts";
import { readSessionFromRequest } from "../oauth/session.ts";
import {
  cancelSubscriptionContract,
  createSubscriptionContract,
  getBillingOverview,
  getEntitlements,
  getSubscription,
  listBillingHistory,
  recordBillingEvent,
} from "./service.ts";

function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function errorResponse(status: number, code: string, message: string) {
  return jsonResponse(
    {
      error: {
        code,
        message,
      },
    },
    status,
  );
}

async function requireUserId(env: WorkerEnv, request: Request) {
  const session = await readSessionFromRequest(env.AUTH_COOKIE_SECRET, request);
  return session?.user.id ?? null;
}

async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function matchCancelPath(pathname: string) {
  const match = pathname.match(
    /^\/api\/billing\/subscriptions\/([^/]+)\/cancel$/,
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export async function handleBillingRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/webhooks/toss") {
    if (request.method !== "POST") {
      return errorResponse(405, "method_not_allowed", "Method not allowed.");
    }

    const body = await readJsonBody(request);

    if (!body || typeof body !== "object") {
      return errorResponse(
        400,
        "invalid_request",
        "A valid webhook payload is required.",
      );
    }

    const payload = body as Record<string, unknown>;

    if (
      typeof payload.eventKey !== "string" ||
      typeof payload.eventType !== "string" ||
      typeof payload.sourceType !== "string"
    ) {
      return errorResponse(
        400,
        "invalid_request",
        "Webhook payload is missing required fields.",
      );
    }

    const result = await recordBillingEvent(env.DB, {
      eventKey: payload.eventKey,
      eventType: payload.eventType,
      sourceType: payload.sourceType,
      relatedUserId:
        typeof payload.relatedUserId === "string"
          ? payload.relatedUserId
          : null,
      relatedSubscriptionId:
        typeof payload.relatedSubscriptionId === "string"
          ? payload.relatedSubscriptionId
          : null,
      relatedCycleId:
        typeof payload.relatedCycleId === "string"
          ? payload.relatedCycleId
          : null,
      payload:
        payload.payload && typeof payload.payload === "object"
          ? (payload.payload as Record<string, unknown>)
          : null,
    });

    return jsonResponse({
      ok: true,
      duplicate: result.duplicate,
      eventKey: result.event.eventKey,
    });
  }

  if (!url.pathname.startsWith("/api/billing")) {
    return null;
  }

  const userId = await requireUserId(env, request);

  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication is required.");
  }

  try {
    if (url.pathname === "/api/billing/customer/bootstrap") {
      if (request.method !== "POST") {
        return errorResponse(405, "method_not_allowed", "Method not allowed.");
      }

      const overview = await getBillingOverview(env.DB, userId);
      return jsonResponse(overview);
    }

    if (url.pathname === "/api/billing/subscription") {
      if (request.method !== "GET") {
        return errorResponse(405, "method_not_allowed", "Method not allowed.");
      }

      const subscription = await getSubscription(env.DB, userId);
      return jsonResponse({ subscription });
    }

    if (url.pathname === "/api/billing/entitlements") {
      if (request.method !== "GET") {
        return errorResponse(405, "method_not_allowed", "Method not allowed.");
      }

      const entitlements = await getEntitlements(env.DB, userId);
      return jsonResponse({
        entitlements: entitlements.map((entry) => ({
          featureKey: entry.featureKey,
          status: entry.status,
          sourceType: entry.sourceType,
          sourceId: entry.sourceId,
          effectiveFrom: entry.effectiveFrom,
          effectiveUntil: entry.effectiveUntil,
        })),
      });
    }

    if (url.pathname === "/api/billing/history") {
      if (request.method !== "GET") {
        return errorResponse(405, "method_not_allowed", "Method not allowed.");
      }

      const history = await listBillingHistory(env.DB, userId);
      return jsonResponse(history);
    }

    if (url.pathname === "/api/billing/subscriptions") {
      if (request.method !== "POST") {
        return errorResponse(405, "method_not_allowed", "Method not allowed.");
      }

      const body = await readJsonBody(request);

      if (!body || typeof body !== "object") {
        return errorResponse(
          400,
          "invalid_request",
          "A valid planCode is required.",
        );
      }

      const payload = body as Record<string, unknown>;

      if (typeof payload.planCode !== "string") {
        return errorResponse(
          400,
          "invalid_request",
          "A valid planCode is required.",
        );
      }

      const result = await createSubscriptionContract(env.DB, {
        userId,
        planCode: payload.planCode,
      });

      return jsonResponse(result, 201);
    }

    const subscriptionId = matchCancelPath(url.pathname);

    if (subscriptionId) {
      if (request.method !== "POST") {
        return errorResponse(405, "method_not_allowed", "Method not allowed.");
      }

      const result = await cancelSubscriptionContract(env.DB, {
        userId,
        subscriptionId,
      });

      return jsonResponse(result);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The billing request failed.";
    return errorResponse(400, "billing_request_failed", message);
  }

  return null;
}
