import type { WorkerEnv } from "../env.ts";
import { listOAuthProviders } from "../oauth/providers.ts";
import { readSessionFromRequest } from "../oauth/session.ts";
import { listAccountProviders } from "./service.ts";

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

export async function handleAccountRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname !== "/api/account/providers") {
    return null;
  }

  if (request.method !== "GET") {
    return errorResponse(405, "method_not_allowed", "Method not allowed.");
  }

  const session = await readSessionFromRequest(env.AUTH_COOKIE_SECRET, request);

  if (!session) {
    return errorResponse(401, "unauthorized", "Authentication is required.");
  }

  const linkedProviders = await listAccountProviders(env.DB, session.user.id);
  const providers = listOAuthProviders().map((provider) => {
    const linked = linkedProviders.find(
      (entry) => entry.provider === provider.id,
    );

    return {
      provider: provider.id,
      label: provider.label,
      isLinked: linked?.isLinked ?? false,
      isCurrent: session.user.provider === provider.id,
      canLink: !linked?.isLinked,
      email: linked?.email ?? null,
      emailVerified: linked?.emailVerified ?? null,
      providerDisplayName: linked?.providerDisplayName ?? null,
      lastLoginAt: linked?.lastLoginAt ?? null,
    };
  });

  return jsonResponse({
    providers,
    currentProvider: session.user.provider,
  });
}
