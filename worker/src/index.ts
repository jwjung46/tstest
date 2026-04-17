import { handleOAuthCallback, handleOAuthStart } from "./oauth/flow.ts";
import { createSessionSnapshotResponse } from "./oauth/session.ts";
import { isOAuthProviderId } from "./oauth/providers.ts";

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

async function handleRequest(request: Request, env: Env) {
  const runtimeEnv = env as Env & {
    AUTH_COOKIE_SECRET: string;
    GOOGLE_OAUTH_CLIENT_ID: string;
    GOOGLE_OAUTH_CLIENT_SECRET: string;
    KAKAO_OAUTH_CLIENT_ID: string;
    KAKAO_OAUTH_CLIENT_SECRET: string;
    NAVER_OAUTH_CLIENT_ID: string;
    NAVER_OAUTH_CLIENT_SECRET: string;
  };
  const url = new URL(request.url);

  if (url.pathname === "/api/session" && request.method === "GET") {
    return createSessionSnapshotResponse(
      runtimeEnv.AUTH_COOKIE_SECRET,
      request,
    );
  }

  const authRoute = matchAuthRoute(url.pathname);

  if (authRoute?.action === "start" && request.method === "GET") {
    return handleOAuthStart(authRoute.providerId, runtimeEnv, request);
  }

  if (authRoute?.action === "callback" && request.method === "GET") {
    return handleOAuthCallback(authRoute.providerId, runtimeEnv, request);
  }

  return new Response("Not found", {
    status: 404,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
