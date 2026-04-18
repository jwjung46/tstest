import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultThemeId,
  getThemeDefinition,
  getThemeRegistry,
  resolveThemeId,
} from "../src/shared/styles/theme-registry.ts";
import { applyThemeToDocument } from "../src/platform/theme/dom.ts";
import {
  readStoredThemeId,
  themeStorageKey,
  writeStoredThemeId,
} from "../src/platform/theme/storage.ts";
import { createThemeStore } from "../src/platform/theme/create-theme-store.ts";

function createMockDocument() {
  return {
    documentElement: {
      dataset: {},
      style: {
        colorScheme: "",
        setProperty(name, value) {
          this[name] = value;
        },
      },
    },
  };
}

function createStorageMock(initialEntries = []) {
  const values = new Map(initialEntries);

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("resolveThemeId keeps valid registered ids and falls back for invalid input", () => {
  assert.equal(resolveThemeId("ocean"), "ocean");
  assert.equal(resolveThemeId("graphite"), "graphite");
  assert.equal(resolveThemeId("missing-theme"), defaultThemeId);
  assert.equal(resolveThemeId(null), defaultThemeId);
});

test("getThemeDefinition returns the expected registered theme", () => {
  const theme = getThemeDefinition("graphite");

  assert.equal(theme.id, "graphite");
  assert.equal(theme.label, "Graphite");
  assert.equal(theme.colorScheme, "dark");
});

test("applyThemeToDocument writes theme metadata and semantic CSS variables", () => {
  const mockDocument = createMockDocument();
  const theme = getThemeDefinition("ocean");

  applyThemeToDocument(theme, mockDocument);

  assert.equal(mockDocument.documentElement.dataset.theme, "ocean");
  assert.equal(mockDocument.documentElement.style.colorScheme, "light");
  assert.equal(
    mockDocument.documentElement.style["--theme-canvas-bg-start"],
    theme.tokens["canvas-bg-start"],
  );
});

test("theme storage reads and writes when storage is available", () => {
  const storage = createStorageMock();

  writeStoredThemeId("graphite", storage);

  assert.equal(storage.getItem(themeStorageKey), "graphite");
  assert.equal(readStoredThemeId(storage), "graphite");
});

test("theme storage fails safely when storage is unavailable", () => {
  const throwingStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };

  assert.equal(readStoredThemeId(throwingStorage), null);
  assert.doesNotThrow(() => {
    writeStoredThemeId("default", throwingStorage);
  });
});

test("theme store initializes from a valid stored theme and exposes the registry", () => {
  const appliedThemeIds = [];
  const persistedThemeIds = [];
  const store = createThemeStore({
    availableThemes: getThemeRegistry(),
    getThemeDefinition,
    readStoredThemeId: () => "graphite",
    resolveThemeId,
    writeStoredThemeId(themeId) {
      persistedThemeIds.push(themeId);
    },
    applyTheme(theme) {
      appliedThemeIds.push(theme.id);
    },
  });

  const snapshot = store.initializeThemeSnapshot();

  assert.equal(snapshot.themeId, "graphite");
  assert.deepEqual(
    snapshot.availableThemes.map((theme) => theme.id),
    ["default", "ocean", "graphite"],
  );
  assert.deepEqual(appliedThemeIds, ["graphite"]);
  assert.deepEqual(persistedThemeIds, ["graphite"]);
});

test("theme store falls back from invalid storage, updates snapshot, persists changes, and notifies subscribers once per real change", () => {
  const appliedThemeIds = [];
  const persistedThemeIds = [];
  const notifications = [];
  const store = createThemeStore({
    availableThemes: getThemeRegistry(),
    getThemeDefinition,
    readStoredThemeId: () => "broken-theme",
    resolveThemeId,
    writeStoredThemeId(themeId) {
      persistedThemeIds.push(themeId);
    },
    applyTheme(theme) {
      appliedThemeIds.push(theme.id);
    },
  });

  const unsubscribe = store.subscribeToThemeSnapshot(() => {
    notifications.push(store.getThemeSnapshot().themeId);
  });

  try {
    const initialSnapshot = store.initializeThemeSnapshot();

    assert.equal(initialSnapshot.themeId, "default");

    const updatedSnapshot = store.setTheme("ocean");

    assert.equal(updatedSnapshot.themeId, "ocean");
    assert.equal(store.getThemeSnapshot().themeId, "ocean");

    store.setTheme("ocean");

    assert.deepEqual(appliedThemeIds, ["default", "ocean", "ocean"]);
    assert.deepEqual(persistedThemeIds, ["default", "ocean", "ocean"]);
    assert.deepEqual(notifications, ["ocean"]);
  } finally {
    unsubscribe();
  }
});
