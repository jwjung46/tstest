import type { ThemeId } from "../../shared/styles/theme-registry.ts";

export const themeStorageKey = "teamspace.theme";

type ThemeStorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function getLocalStorage(): ThemeStorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredThemeId(
  storage: ThemeStorageLike | null = getLocalStorage(),
) {
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(themeStorageKey);
  } catch {
    return null;
  }
}

export function writeStoredThemeId(
  themeId: ThemeId,
  storage: ThemeStorageLike | null = getLocalStorage(),
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(themeStorageKey, themeId);
  } catch {
    // Storage access is optional and should never break theme changes.
  }
}
