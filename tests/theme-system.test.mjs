import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultThemeId,
  getThemeDefinition,
  getThemeRegistry,
  resolveThemeId,
} from "../src/shared/styles/theme-registry.ts";
import { themeTokenKeys } from "../src/shared/styles/theme-contract.ts";
import { assertValidThemeRegistry } from "../src/shared/styles/theme-validator.ts";
import {
  getAvailableThemes,
  getThemeSnapshot,
  initializeThemeSnapshot,
  setTheme,
} from "../src/platform/theme/theme.ts";

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

function createMockStorage(initialValue = null) {
  const values = new Map();

  if (initialValue !== null) {
    values.set("teamspace.theme", initialValue);
  }

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("theme registry exposes the default, ocean, and graphite themes", () => {
  const registry = getThemeRegistry();

  assert.equal(defaultThemeId, "default");
  assert.deepEqual(
    registry.map((theme) => theme.id),
    ["default", "ocean", "graphite"],
  );
});

test("every registered theme defines the full semantic token contract", () => {
  for (const theme of getThemeRegistry()) {
    assert.deepEqual(
      Object.keys(theme.tokens).sort(),
      [...themeTokenKeys].sort(),
      `${theme.id} should include the full token set`,
    );
  }
});

test("resolveThemeId falls back to the default theme for invalid values", () => {
  assert.equal(resolveThemeId("ocean"), "ocean");
  assert.equal(resolveThemeId("missing-theme"), defaultThemeId);
  assert.equal(resolveThemeId(null), defaultThemeId);
});

test("assertValidThemeRegistry rejects duplicate ids and missing tokens", () => {
  assert.throws(() =>
    assertValidThemeRegistry([
      getThemeDefinition("default"),
      getThemeDefinition("default"),
    ]),
  );

  assert.throws(() =>
    assertValidThemeRegistry([
      {
        ...getThemeDefinition("default"),
        id: "broken",
        tokens: {
          ...getThemeDefinition("default").tokens,
          "text-primary": undefined,
        },
      },
    ]),
  );
});

test("initializeThemeSnapshot applies the persisted theme to the DOM before render", () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  const mockDocument = createMockDocument();
  const mockStorage = createMockStorage("graphite");

  globalThis.document = mockDocument;
  globalThis.window = {
    localStorage: mockStorage,
  };

  try {
    const snapshot = initializeThemeSnapshot();

    assert.equal(snapshot.themeId, "graphite");
    assert.equal(snapshot.theme.colorScheme, "dark");
    assert.equal(mockDocument.documentElement.dataset.theme, "graphite");
    assert.equal(mockDocument.documentElement.style.colorScheme, "dark");
    assert.equal(
      mockDocument.documentElement.style["--theme-text-primary"],
      snapshot.theme.tokens["text-primary"],
    );
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test("setTheme updates the snapshot, persists the id, and exposes registry labels", () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  const mockDocument = createMockDocument();
  const mockStorage = createMockStorage();

  globalThis.document = mockDocument;
  globalThis.window = {
    localStorage: mockStorage,
  };

  try {
    initializeThemeSnapshot();
    setTheme("ocean");

    assert.equal(getThemeSnapshot().themeId, "ocean");
    assert.equal(mockStorage.getItem("teamspace.theme"), "ocean");
    assert.equal(mockDocument.documentElement.dataset.theme, "ocean");
    assert.deepEqual(
      getAvailableThemes().map((theme) => theme.label),
      ["Default", "Ocean", "Graphite"],
    );
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});
