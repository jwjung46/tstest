import {
  getThemeDefinition,
  getThemeRegistry,
  resolveThemeId,
  type ThemeId,
} from "../../shared/styles/theme-registry.ts";
import { applyThemeToDocument } from "./dom.ts";
import { createThemeStore } from "./create-theme-store.ts";
import { readStoredThemeId, writeStoredThemeId } from "./storage.ts";

export type { ThemeSnapshot } from "./create-theme-store.ts";

const themeStore = createThemeStore({
  availableThemes: getThemeRegistry(),
  getThemeDefinition,
  resolveThemeId,
  readStoredThemeId,
  writeStoredThemeId,
  applyTheme: applyThemeToDocument,
});

export function initializeThemeSnapshot() {
  return themeStore.initializeThemeSnapshot();
}

export function getThemeSnapshot() {
  return themeStore.getThemeSnapshot();
}

export function subscribeToThemeSnapshot(listener: () => void) {
  return themeStore.subscribeToThemeSnapshot(listener);
}

export function setTheme(themeId: ThemeId) {
  return themeStore.setTheme(themeId);
}

export function getAvailableThemes() {
  return themeStore.getAvailableThemes();
}
