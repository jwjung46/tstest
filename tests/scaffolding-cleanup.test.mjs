import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

test("public auth entry stays minimal and auth-focused", () => {
  const file = readRepoFile("src/features/auth/ui/PublicAuthEntry.tsx");

  assert.equal(file.includes("landing-login-card"), true);
  assert.equal(file.includes("OAuthLoginActions"), true);
  assert.equal(file.includes("landing-login-card__title"), true);
  assert.equal(file.includes("Sign in"), true);
  assert.equal(file.includes("Recent login:"), true);
});

test("/app route composition stays focused on live product surfaces", () => {
  const appPage = readRepoFile("src/pages/AppPage.tsx");
  const appShell = readRepoFile("src/app/layout/AppShell.tsx");

  assert.equal(appPage.includes("AuthenticatedSessionPanel"), true);
  assert.equal(appPage.includes("BillingOverviewPanel"), true);
  assert.equal(appPage.includes("NotesWorkspace"), true);
  assert.equal(appPage.includes("ThemeSelector"), true);
  assert.equal(appPage.includes("SignOutForm"), true);
  assert.equal(appShell.includes('className="app-shell__header"'), true);
  assert.equal(appShell.includes('className="app-shell__content"'), true);
});
