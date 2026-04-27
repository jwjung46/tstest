import { handleOAuthCallback, handleOAuthStart } from "./oauth/flow.ts";
import type { WorkerEnv } from "./env.ts";
import { handleAccountRequest } from "./account/api.ts";
import {
  createSessionSnapshotResponse,
  createSignOutResponse,
} from "./oauth/session.ts";
import { isOAuthProviderId } from "./oauth/providers.ts";
import { handleBillingRequest } from "./billing/api.ts";

function matchAuthRoute(pathname: string) {
  const match = pathname.match(/^\/auth\/([^/]+)\/(start|callback)$/);

  if (!match) {
    return null;
  }

  const [, providerId, action] = match;

  if (!isOAuthProviderId(providerId)) {
    return null;
  }

  return {
    providerId,
    action,
  };
}

async function handleRequest(request: Request, env: WorkerEnv) {
  const url = new URL(request.url);
  const isSecureRequest = url.protocol === "https:";

  const billingResponse = await handleBillingRequest(request, env);

  if (billingResponse) {
    return billingResponse;
  }

  const accountResponse = await handleAccountRequest(request, env);

  if (accountResponse) {
    return accountResponse;
  }

  if (url.pathname === "/api/session" && request.method === "GET") {
    return createSessionSnapshotResponse(env.AUTH_COOKIE_SECRET, request);
  }

  if (url.pathname === "/auth/sign-out" && request.method === "POST") {
    return createSignOutResponse(isSecureRequest);
  }

  const authRoute = matchAuthRoute(url.pathname);

  if (authRoute?.action === "start" && request.method === "GET") {
    return handleOAuthStart(authRoute.providerId, env, request);
  }

  if (authRoute?.action === "callback" && request.method === "GET") {
    return handleOAuthCallback(authRoute.providerId, env, request);
  }

  return new Response("Not found", {
    status: 404,
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<WorkerEnv>;
