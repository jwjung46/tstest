import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

test("overlay behavior is routed through one shared primitive", () => {
  const appUserMenu = readRepoFile("src/app/layout/AppUserMenu.tsx");
  const themeSelector = readRepoFile("src/features/settings/ui/ThemeSelector.tsx");
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
    layoutCss.includes(".empty-state,\n.app-shell__header,\n.app-shell__content"),
    false,
  );
  assert.equal(layoutCss.includes(".app-shell__header"), true);
  assert.equal(layoutCss.includes(".app-shell__content"), true);
});

test("react query drives protected app server state and billing splits summary from history", () => {
  const packageJson = readRepoFile("package.json");
  const main = readRepoFile("src/main.tsx");
  const authSessionBootstrap = readRepoFile(
    "src/app/providers/AuthSessionBootstrap.tsx",
  );
  const billingOverview = readRepoFile(
    "src/features/billing/model/useBillingOverview.ts",
  );
  const billingQueries = readRepoFile(
    "src/features/billing/model/billing-queries.ts",
  );
  const billingKeys = readRepoFile("src/features/billing/model/billing-query-keys.ts");

  assert.equal(packageJson.includes("@tanstack/react-query"), true);
  assert.equal(main.includes("QueryClientProvider"), true);
  assert.equal(authSessionBootstrap.includes("prefetchBillingSummaryQuery"), true);
  assert.equal(billingOverview.includes("useBillingSummaryQuery"), true);
  assert.equal(billingOverview.includes("useBillingHistoryQuery"), true);
  assert.equal(billingOverview.includes("fetchBillingSubscription()"), false);
  assert.equal(billingOverview.includes("fetchBillingEntitlements()"), false);
  assert.equal(billingQueries.includes("fetchBillingOverview"), true);
  assert.equal(billingQueries.includes("fetchBillingHistory"), true);
  assert.equal(billingKeys.includes('summary: ["billing", "summary"]'), true);
  assert.equal(billingKeys.includes('history: ["billing", "history"]'), true);
});
