import {
  decodeSignedCookieValue,
  encodeSignedCookieValue,
  parseCookieHeader,
  serializeCookie,
} from "./cookies.ts";
import { SESSION_COOKIE_NAME } from "./providers.ts";

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
};

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

export function createSignOutResponse(secure: boolean) {
  return new Response(null, {
    status: 302,
    headers: {
      location: "/",
      "set-cookie": clearSessionCookie(secure),
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
  const payload: SessionSnapshotResponse = {
    session,
  };

  return Response.json(payload, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
