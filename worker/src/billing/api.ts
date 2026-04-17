import type { WorkerEnv } from "../env.ts";
import { readSessionFromRequest } from "../oauth/session.ts";
import { TossBillingError } from "./toss-client.ts";
import {
  BillingRequestError,
  cancelSubscriptionContract,
  confirmCheckoutPayment,
  createCheckoutSession,
  getBillingOverview,
  getCheckoutResult,
  getEntitlements,
  getSubscription,
  listBillingHistory,
  processTossWebhook,
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

async function readRawBody(request: Request) {
  try {
    return await request.text();
  } catch {
    return "";
  }
}

function matchCancelPath(pathname: string) {
  const match = pathname.match(
    /^\/api\/billing\/subscriptions\/([^/]+)\/cancel$/,
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function toBillingError(error: unknown) {
  if (error instanceof BillingRequestError) {
    return error;
  }

  if (error instanceof TossBillingError) {
    return new BillingRequestError(error.code, error.message, error.status);
  }

  if (error instanceof Error) {
    return new BillingRequestError(
      "billing_request_failed",
      error.message,
      400,
    );
  }

  return new BillingRequestError(
    "billing_request_failed",
    "The billing request failed.",
    400,
  );
}

function getAppOrigin(request: Request) {
  return new URL(request.url).origin;
}

function mapEntitlementSummary(entry: {
  featureKey: string;
  status: string;
  sourceType: string;
  sourceId: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
}) {
  return {
    featureKey: entry.featureKey,
    status: entry.status,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    effectiveFrom: entry.effectiveFrom,
    effectiveUntil: entry.effectiveUntil,
  };
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

    const rawBody = await readRawBody(request);
    let body: unknown = null;

    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      body = null;
    }

    try {
      const result = await processTossWebhook(env.DB, {
        payload: body,
        rawBody,
        headers: request.headers,
      });

      return jsonResponse({
        ok: true,
        duplicate: result.duplicate,
        eventKey: result.event.eventKey,
      });
    } catch (error) {
      const billingError = toBillingError(error);
      const status =
        billingError.status === 400 || billingError.status >= 500
          ? billingError.status
          : 500;
      return errorResponse(status, billingError.code, billingError.message);
    }
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

    if (url.pathname === "/api/billing/checkout/session") {
      if (request.method !== "POST") {
        return errorResponse(405, "method_not_allowed", "Method not allowed.");
      }

      const body = await readJsonBody(request);
      const payload =
        body && typeof body === "object"
          ? (body as Record<string, unknown>)
          : null;

      if (typeof payload?.planCode !== "string") {
        return errorResponse(
          400,
          "invalid_request",
          "A valid planCode is required.",
        );
      }

      const result = await createCheckoutSession(env.DB, env, {
        userId,
        planCode: payload.planCode,
        appOrigin: getAppOrigin(request),
      });

      return jsonResponse(result, 201);
    }

    if (url.pathname === "/api/billing/checkout/confirm") {
      if (request.method !== "POST") {
        return errorResponse(405, "method_not_allowed", "Method not allowed.");
      }

      const body = await readJsonBody(request);
      const payload =
        body && typeof body === "object"
          ? (body as Record<string, unknown>)
          : null;

      if (
        typeof payload?.paymentKey !== "string" ||
        typeof payload?.orderId !== "string" ||
        typeof payload?.amount !== "number"
      ) {
        return errorResponse(
          400,
          "invalid_request",
          "paymentKey, orderId, and amount are required.",
        );
      }

      const result = await confirmCheckoutPayment(env.DB, env, {
        userId,
        paymentKey: payload.paymentKey,
        orderId: payload.orderId,
        amount: payload.amount,
      });

      return jsonResponse(result);
    }

    if (url.pathname === "/api/billing/checkout/result") {
      if (request.method !== "GET") {
        return errorResponse(405, "method_not_allowed", "Method not allowed.");
      }

      const result = await getCheckoutResult(env.DB, {
        userId,
        orderId: url.searchParams.get("orderId"),
        flow: url.searchParams.get("flow"),
        code: url.searchParams.get("code"),
        message: url.searchParams.get("message"),
      });

      return jsonResponse({
        ...result,
        entitlements: result.entitlements.map(mapEntitlementSummary),
      });
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
    const billingError = toBillingError(error);
    return errorResponse(
      billingError.status,
      billingError.code,
      billingError.message,
    );
  }

  return null;
}
