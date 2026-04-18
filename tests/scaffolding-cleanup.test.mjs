import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  const appShell = readRepoFile("src/app/layout/AppShell.tsx");
  const appHomePage = readRepoFile("src/pages/AppHomePage.tsx");
  const appAccountPage = readRepoFile("src/pages/AppAccountPage.tsx");
  const appSubscriptionPage = readRepoFile("src/pages/AppSubscriptionPage.tsx");
  const protectedAppPageContentPath = resolve(
    repoRoot,
    "src/app/layout/ProtectedAppPageContent.tsx",
  );

  assert.equal(router.includes("ProtectedAppLayout"), true);
  assert.equal(router.includes("APP_ROUTE_SEGMENTS.account"), true);
  assert.equal(router.includes("APP_ROUTE_SEGMENTS.subscription"), true);
  assert.equal(routePaths.includes('home: "/app"'), true);
  assert.equal(routePaths.includes('account: "/app/account"'), true);
  assert.equal(routePaths.includes('subscription: "/app/subscription"'), true);
  assert.equal(protectedAppLayout.includes("<AppShell"), true);
  assert.equal(protectedAppLayout.includes("<Outlet />"), true);
  assert.equal(appShell.includes("headerActions"), true);
  assert.equal(appHomePage.includes("return null"), true);
  assert.equal(appAccountPage.includes("AuthenticatedSessionPanel"), true);
  assert.equal(appSubscriptionPage.includes("BillingOverviewPanel"), true);
  assert.equal(existsSync(protectedAppPageContentPath), false);
  assert.equal(appAccountPage.includes("../app/layout/"), false);
  assert.equal(appSubscriptionPage.includes("../app/layout/"), false);
});

test("protected shell keeps /app visually blank and renders the user menu in a portal overlay", () => {
  const protectedAppLayout = readRepoFile(
    "src/app/layout/ProtectedAppLayout.tsx",
  );
  const appShell = readRepoFile("src/app/layout/AppShell.tsx");
  const appUserMenu = readRepoFile("src/app/layout/AppUserMenu.tsx");
  const layoutCss = readRepoFile("src/shared/styles/layout.css");

  assert.equal(
    protectedAppLayout.includes(
      'const contentMode = location.pathname === APP_ROUTES.home ? "blank" : "default";',
    ),
    true,
  );
  assert.equal(appShell.includes("contentMode"), true);
  assert.equal(appShell.includes("app-shell__content--blank"), true);
  assert.equal(appUserMenu.includes("createPortal"), true);
  assert.equal(appUserMenu.includes("document.body"), true);
  assert.equal(appUserMenu.includes("right: `${position.right}px`"), true);
  assert.equal(appUserMenu.includes("top: `${position.top}px`"), true);
  assert.equal(layoutCss.includes(".app-user-menu__popover"), true);
  assert.equal(layoutCss.includes("position: fixed;"), true);
  assert.equal(layoutCss.includes(".app-shell__content--blank"), true);
});
