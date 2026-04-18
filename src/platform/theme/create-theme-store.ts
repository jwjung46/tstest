import type { ThemeDefinition } from "../../shared/styles/theme-contract.ts";
import type { ThemeId } from "../../shared/styles/theme-registry.ts";

export type ThemeSnapshot = {
  themeId: ThemeId;
  theme: ThemeDefinition<ThemeId>;
  availableThemes: readonly ThemeDefinition<ThemeId>[];
};

type CreateThemeStoreOptions = {
  availableThemes: readonly ThemeDefinition<ThemeId>[];
  getThemeDefinition(themeId: ThemeId): ThemeDefinition<ThemeId>;
  resolveThemeId(value: unknown): ThemeId;
  readStoredThemeId(): unknown;
  writeStoredThemeId(themeId: ThemeId): void;
  applyTheme(theme: ThemeDefinition<ThemeId>): void;
};

export function createThemeStore({
  availableThemes,
  getThemeDefinition,
  resolveThemeId,
  readStoredThemeId,
  writeStoredThemeId,
  applyTheme,
}: CreateThemeStoreOptions) {
  const listeners = new Set<() => void>();
  let hasInitializedThemeSnapshot = false;
  let currentSnapshot = createThemeSnapshot(resolveThemeId(undefined));

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
    applyTheme(nextSnapshot.theme);
    writeStoredThemeId(nextSnapshot.themeId);

    if (hasChanged) {
      emitThemeSnapshotChange();
    }

    return currentSnapshot;
  }

  return {
    getAvailableThemes() {
      return availableThemes;
    },
    getThemeSnapshot() {
      return currentSnapshot;
    },
    initializeThemeSnapshot() {
      if (hasInitializedThemeSnapshot) {
        return currentSnapshot;
      }

      hasInitializedThemeSnapshot = true;

      return updateThemeSnapshot(resolveThemeId(readStoredThemeId()));
    },
    setTheme(themeId: ThemeId) {
      if (!hasInitializedThemeSnapshot) {
        this.initializeThemeSnapshot();
      }

      return updateThemeSnapshot(themeId);
    },
    subscribeToThemeSnapshot(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
