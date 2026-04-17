import {
  getThemeDefinition,
  getThemeRegistry,
  resolveThemeId,
} from "../../shared/styles/theme-registry.ts";
import type {
  ThemeDefinition,
  ThemeId,
} from "../../shared/styles/theme-contract.ts";
import { applyThemeToDocument } from "./dom.ts";
import { readStoredThemeId, writeStoredThemeId } from "./storage.ts";

export type ThemeSnapshot = {
  themeId: ThemeId;
  theme: ThemeDefinition;
  availableThemes: readonly ThemeDefinition[];
};

const availableThemes = getThemeRegistry();
const listeners = new Set<() => void>();

let hasInitializedThemeSnapshot = false;
let currentSnapshot: ThemeSnapshot = createThemeSnapshot(
  resolveThemeId(readStoredThemeId()),
);

function createThemeSnapshot(themeId: ThemeId): ThemeSnapshot {
  const theme = getThemeDefinition(themeId);

  return {
    themeId: theme.id,
    theme,
    availableThemes,
  };
}

function emitThemeSnapshotChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateThemeSnapshot(themeId: ThemeId) {
  const nextSnapshot = createThemeSnapshot(themeId);
  const hasChanged = currentSnapshot.themeId !== nextSnapshot.themeId;

  currentSnapshot = nextSnapshot;
  applyThemeToDocument(nextSnapshot.theme);
  writeStoredThemeId(nextSnapshot.themeId);

  if (hasChanged) {
    emitThemeSnapshotChange();
  }

  return currentSnapshot;
}

export function initializeThemeSnapshot() {
  if (hasInitializedThemeSnapshot) {
    return currentSnapshot;
  }

  hasInitializedThemeSnapshot = true;

  return updateThemeSnapshot(resolveThemeId(readStoredThemeId()));
}

export function getThemeSnapshot() {
  return currentSnapshot;
}

export function subscribeToThemeSnapshot(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function setTheme(themeId: string) {
  if (!hasInitializedThemeSnapshot) {
    initializeThemeSnapshot();
  }

  return updateThemeSnapshot(resolveThemeId(themeId));
}

export function getAvailableThemes() {
  return availableThemes;
}
