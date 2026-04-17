import { useSyncExternalStore } from "react";
import {
  getSessionSnapshot,
  subscribeToSessionSnapshot,
} from "../../../platform/session/session.ts";
import { resolveAuthState } from "./auth.ts";

export function useAuthState() {
  const snapshot = useSyncExternalStore(
    subscribeToSessionSnapshot,
    getSessionSnapshot,
    getSessionSnapshot,
  );

  return resolveAuthState(snapshot);
}
