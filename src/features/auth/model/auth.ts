import type {
  Session,
  SessionSnapshot,
  SessionUser,
} from "../../../platform/session/session.ts";
import { getSessionSnapshot } from "../../../platform/session/session.ts";

export type AuthState =
  | {
      status: "loading";
      session: null;
      user: null;
    }
  | {
      status: "authenticated";
      session: Session;
      user: SessionUser;
    }
  | {
      status: "unauthenticated";
      session: null;
      user: null;
    };

type RedirectTargetParts = {
  pathname: string;
  search?: string;
  hash?: string;
};

export function resolveAuthState(snapshot: SessionSnapshot): AuthState {
  if (snapshot.status === "authenticated") {
    return {
      status: "authenticated",
      session: snapshot.session,
      user: snapshot.session.user,
    };
  }

  if (snapshot.status === "loading") {
    return {
      status: "loading",
      session: null,
      user: null,
    };
  }

  return {
    status: "unauthenticated",
    session: null,
    user: null,
  };
}

export function getAuthState(): AuthState {
  return resolveAuthState(getSessionSnapshot());
}

export function getSession(): Session | null {
  return getAuthState().session;
}

export function getCurrentUser(): SessionUser | null {
  return getAuthState().user;
}

export function isAuthenticated(): boolean {
  return getAuthState().status === "authenticated";
}

export function buildAuthRedirectTarget({
  pathname,
  search = "",
  hash = "",
}: RedirectTargetParts): string {
  return `${pathname}${search}${hash}`;
}
