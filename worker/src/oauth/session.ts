import {
  decodeSignedCookieValue,
  encodeSignedCookieValue,
  parseCookieHeader,
  serializeCookie,
} from "./cookies.ts";
import { SESSION_COOKIE_NAME } from "./providers.ts";
import type { OAuthProviderId } from "./providers.ts";

export type WorkerSessionUser = {
  id: string;
  name: string;
  email?: string;
  provider: string;
};

export type WorkerSession = {
  user: WorkerSessionUser;
};

type SessionSnapshotResponse = {
  session: WorkerSession | null;
  recentLoginProvider: OAuthProviderId | null;
};

const RECENT_LOGIN_PROVIDER_COOKIE_NAME = "__recent_login_provider";

export async function createSessionCookie(
  secret: string,
  session: WorkerSession,
  secure: boolean,
) {
  const value = await encodeSignedCookieValue(secret, session);

  return serializeCookie(SESSION_COOKIE_NAME, value, {
    secure,
  });
}

export function clearSessionCookie(secure: boolean) {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    maxAge: 0,
    secure,
  });
}

export async function createRecentLoginProviderCookie(
  secret: string,
  provider: OAuthProviderId,
  secure: boolean,
) {
  const value = await encodeSignedCookieValue(secret, {
    provider,
  });

  return serializeCookie(RECENT_LOGIN_PROVIDER_COOKIE_NAME, value, {
    secure,
  });
}

export function clearRecentLoginProviderCookie(secure: boolean) {
  return serializeCookie(RECENT_LOGIN_PROVIDER_COOKIE_NAME, "", {
    maxAge: 0,
    secure,
  });
}

export async function readRecentLoginProviderFromRequest(
  secret: string,
  request: Request,
): Promise<OAuthProviderId | null> {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const payload = await decodeSignedCookieValue<{ provider?: OAuthProviderId }>(
    secret,
    cookies.get(RECENT_LOGIN_PROVIDER_COOKIE_NAME) ?? null,
  );

  return payload?.provider ?? null;
}

export function createSignOutResponse(secure: boolean) {
  return new Response(null, {
    status: 302,
    headers: {
      location: "/",
      "set-cookie": `${clearSessionCookie(secure)}, ${clearRecentLoginProviderCookie(secure)}`,
    },
  });
}

export async function readSessionFromRequest(
  secret: string,
  request: Request,
): Promise<WorkerSession | null> {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return decodeSignedCookieValue<WorkerSession>(
    secret,
    cookies.get(SESSION_COOKIE_NAME) ?? null,
  );
}

export async function createSessionSnapshotResponse(
  secret: string,
  request: Request,
) {
  const session = await readSessionFromRequest(secret, request);
  const recentLoginProvider = await readRecentLoginProviderFromRequest(
    secret,
    request,
  );
  const payload: SessionSnapshotResponse = {
    session,
    recentLoginProvider,
  };

  return Response.json(payload, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
