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

test("/app route composition is split into protected layout and page entries", () => {
  const router = readRepoFile("src/app/router.tsx");
  const routePaths = readRepoFile("src/app/router/paths.ts");
  const protectedAppLayout = readRepoFile(
    "src/app/layout/ProtectedAppLayout.tsx",
  );
  const appHomePage = readRepoFile("src/pages/AppHomePage.tsx");
  const appAccountPage = readRepoFile("src/pages/AppAccountPage.tsx");
  const appSubscriptionPage = readRepoFile("src/pages/AppSubscriptionPage.tsx");

  assert.equal(router.includes("ProtectedAppLayout"), true);
  assert.equal(router.includes("APP_ROUTE_SEGMENTS.account"), true);
  assert.equal(router.includes("APP_ROUTE_SEGMENTS.subscription"), true);
  assert.equal(routePaths.includes('home: "/app"'), true);
  assert.equal(routePaths.includes('account: "/app/account"'), true);
  assert.equal(routePaths.includes('subscription: "/app/subscription"'), true);
  assert.equal(protectedAppLayout.includes("<AppShell"), true);
  assert.equal(protectedAppLayout.includes("<Outlet />"), true);
  assert.equal(appHomePage.includes("ProtectedHomePageContent"), true);
  assert.equal(appAccountPage.includes("AccountPageContent"), true);
  assert.equal(appSubscriptionPage.includes("SubscriptionPageContent"), true);
});
