import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

test("public auth entry no longer contains removed login-marketing copy", () => {
  const file = readRepoFile("src/features/auth/ui/PublicAuthEntry.tsx");

  const forbiddenStrings = [
    ["One place to enter your protected", " work area."].join(""),
    [
      "Start from a ",
      "clear landing ",
      "page with real OAuth entry already wired",
    ].join(""),
    ["What this base", " app already guarantees"].join(""),
    [
      "The protected route, ",
      "current-session ",
      "display, and Worker-based",
    ].join(""),
    ["Enter the protected", " workspace"].join(""),
    ["Confirm the current", " signed-in user"].join(""),
    ["Reuse the base", " for later apps"].join(""),
    ["Public", " Route"].join(""),
    ["landing-hero__", "copy"].join(""),
    ["landing-", "section"].join(""),
    ["capability-", "grid"].join(""),
    ["capability-", "card"].join(""),
  ];

  for (const forbidden of forbiddenStrings) {
    assert.equal(
      file.includes(forbidden),
      false,
      `Expected PublicAuthEntry.tsx to remove ${forbidden}`,
    );
  }
});

test("protected app shell no longer contains removed navigation scaffolding", () => {
  const appPage = readRepoFile("src/pages/AppPage.tsx");
  const appShell = readRepoFile("src/app/layout/AppShell.tsx");

  const forbiddenStrings = [
    ["Signed-in", " workspace"].join(""),
    [
      "The protected auth/session boundary stays intact",
      " while billing and notes stay feature-owned inside the app shell.",
    ].join(""),
    ["Future", " Module"].join(""),
    ["Keeps the modular app shell", " shape stable."].join(""),
    ["navigation", "Items"].join(""),
    ["Navigation", "Item"].join(""),
    ["Protected", " Route"].join(""),
    ["Future app", " navigation"].join(""),
    ["Future modules", " will be placed here."].join(""),
    ["app-shell__side", "bar"].join(""),
    ["app-shell__side", "bar-header"].join(""),
    ["app-shell__side", "bar-copy"].join(""),
    ["app-shell__", "nav"].join(""),
    ["app-shell__na", "v-item"].join(""),
  ];

  for (const forbidden of forbiddenStrings) {
    assert.equal(
      appPage.includes(forbidden) || appShell.includes(forbidden),
      false,
      `Expected app shell cleanup to remove ${forbidden}`,
    );
  }
});
