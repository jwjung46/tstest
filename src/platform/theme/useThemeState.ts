import { useSyncExternalStore } from "react";
import { getThemeSnapshot, subscribeToThemeSnapshot } from "./theme.ts";

export function useThemeState() {
  return useSyncExternalStore(
    subscribeToThemeSnapshot,
    getThemeSnapshot,
    getThemeSnapshot,
  );
}
