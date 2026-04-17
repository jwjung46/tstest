import type { ThemeId } from "../../shared/styles/theme-contract.ts";

export const themeStorageKey = "teamspace.theme";

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredThemeId() {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(themeStorageKey);
  } catch {
    return null;
  }
}

export function writeStoredThemeId(themeId: ThemeId) {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(themeStorageKey, themeId);
  } catch {
    // Storage access is optional and should never break theme changes.
  }
}
