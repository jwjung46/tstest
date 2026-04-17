import { getStoredSession } from "../../../platform/session/session.ts";
import type {
  Session,
  SessionUser,
} from "../../../platform/session/session.ts";

export function getSession(): Session | null {
  return getStoredSession();
}

export function getCurrentUser(): SessionUser | null {
  return getSession()?.user ?? null;
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}
