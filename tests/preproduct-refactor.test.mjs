import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

test("overlay behavior is routed through one shared primitive", () => {
  const appUserMenu = readRepoFile("src/app/layout/AppUserMenu.tsx");
  const themeSelector = readRepoFile(
    "src/features/settings/ui/ThemeSelector.tsx",
  );
  const overlayHook = readRepoFile("src/shared/ui/useAnchoredOverlay.tsx");

  assert.equal(overlayHook.includes("createPortal"), true);
  assert.equal(overlayHook.includes("onDismiss"), true);
  assert.equal(appUserMenu.includes("useAnchoredOverlay"), true);
  assert.equal(themeSelector.includes("useAnchoredOverlay"), true);
  assert.equal(appUserMenu.includes("createPortal"), false);
  assert.equal(themeSelector.includes("createPortal"), false);
});

test("shell header and content surfaces are styled independently", () => {
  const layoutCss = readRepoFile("src/shared/styles/layout.css");

  assert.equal(
    layoutCss.includes(
      ".empty-state,\n.app-shell__header,\n.app-shell__content",
    ),
    false,
  );
  assert.equal(layoutCss.includes(".app-shell__header"), true);
  assert.equal(layoutCss.includes(".app-shell__content"), false);
  assert.equal(layoutCss.includes("position: sticky;"), true);
  assert.equal(
    layoutCss.includes("border-bottom: 1px solid var(--border);"),
    true,
  );
  assert.equal(
    layoutCss.includes(".app-shell__body {\n  padding: 24px;"),
    true,
  );
});

test("protected app bootstrap keeps account-management queries inactive", () => {
  const packageJson = readRepoFile("package.json");
  const main = readRepoFile("src/main.tsx");
  const authSessionBootstrap = readRepoFile(
    "src/app/providers/AuthSessionBootstrap.tsx",
  );

  assert.equal(packageJson.includes("@tanstack/react-query"), true);
  assert.equal(main.includes("QueryClientProvider"), true);
  assert.equal(
    authSessionBootstrap.includes("prefetchLinkedAccountProvidersQuery"),
    false,
  );
  assert.equal(
    existsSync(resolve(repoRoot, "src/features/auth/model/account-queries.ts")),
    false,
  );
});

test("linked-provider account UI is not mounted in the protected app", () => {
  const authSessionBootstrap = readRepoFile(
    "src/app/providers/AuthSessionBootstrap.tsx",
  );
  const router = readRepoFile("src/app/router.tsx");
  const appUserMenu = readRepoFile("src/app/layout/AppUserMenu.tsx");

  assert.equal(
    authSessionBootstrap.includes("prefetchLinkedAccountProvidersQuery"),
    false,
  );
  assert.equal(router.includes("LinkedLoginMethodsPanel"), false);
  assert.equal(router.includes("AuthenticatedSessionPanel"), false);
  assert.equal(appUserMenu.includes("APP_ROUTES.account"), false);
  assert.equal(
    existsSync(
      resolve(repoRoot, "src/features/auth/ui/LinkedLoginMethodsPanel.tsx"),
    ),
    false,
  );
  assert.equal(
    existsSync(
      resolve(repoRoot, "src/features/auth/ui/AuthenticatedSessionPanel.tsx"),
    ),
    false,
  );
});

test("header controls use the compact theme selector variant and top-level shell header", () => {
  const protectedAppLayout = readRepoFile(
    "src/app/layout/ProtectedAppLayout.tsx",
  );
  const themeSelector = readRepoFile(
    "src/features/settings/ui/ThemeSelector.tsx",
  );
  const layoutCss = readRepoFile("src/shared/styles/layout.css");
  const appShell = readRepoFile("src/app/layout/AppShell.tsx");

  assert.equal(
    protectedAppLayout.includes('<ThemeSelector variant="compact" />'),
    true,
  );
  assert.equal(appShell.includes("header?: React.ReactNode"), true);
  assert.equal(
    appShell.includes('<header className="app-shell__header">'),
    true,
  );
  assert.equal(appShell.includes('<main className="app-shell__body">'), true);
  assert.equal(appShell.includes("app-shell__content"), false);
  assert.equal(appShell.includes("brand:"), false);
  assert.equal(appShell.includes("headerActions"), false);
  assert.equal(protectedAppLayout.includes("header={"), true);
  assert.equal(
    protectedAppLayout.includes('className="app-shell__header-inner"'),
    true,
  );
  assert.equal(
    protectedAppLayout.includes('className="app-shell__brand"'),
    true,
  );
  assert.equal(
    protectedAppLayout.includes('className="app-shell__page"'),
    true,
  );
  assert.equal(protectedAppLayout.includes("contentMode"), false);
  assert.equal(protectedAppLayout.includes("location.pathname"), false);
  assert.equal(themeSelector.includes('variant = "default"'), true);
  assert.equal(
    themeSelector.includes("theme-selector__trigger--compact"),
    true,
  );
  assert.equal(
    themeSelector.includes(
      'aria-label={variant === "compact" ? "Theme" : undefined}',
    ),
    true,
  );
  assert.equal(themeSelector.includes("theme-selector__prefix"), false);
  assert.equal(themeSelector.includes("theme-selector__label--sr-only"), false);
  assert.equal(layoutCss.includes("flex-wrap: nowrap;"), true);
  assert.equal(layoutCss.includes("align-items: center;"), true);
  assert.equal(layoutCss.includes("flex-wrap: wrap;"), false);
  assert.equal(layoutCss.includes(".theme-selector__trigger--compact"), true);
});
