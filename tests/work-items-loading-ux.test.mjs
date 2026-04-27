import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function readRepoFile(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

test("protected route auth loading stays non-disruptive", () => {
  const protectedRoute = readRepoFile("src/app/router/ProtectedRoute.tsx");
  const publicAuthEntry = readRepoFile(
    "src/features/auth/ui/PublicAuthEntry.tsx",
  );

  assert.equal(protectedRoute.includes(`Checking ${"access"}`), false);
  assert.equal(protectedRoute.includes(`Checking ${"Session"}`), false);
  assert.equal(publicAuthEntry.includes(`Checking ${"Session"}`), false);
  assert.equal(protectedRoute.includes("EmptyState"), false);
  assert.equal(protectedRoute.includes('reason === "loading"'), true);
  assert.equal(protectedRoute.includes("buildAuthRedirectTarget"), true);
});

test("work item list keeps one stable panel heading across data states", () => {
  const workItemList = readRepoFile(
    "src/features/work-items/ui/WorkItemList.tsx",
  );

  assert.equal(workItemList.includes(`업무를 ${"불러오는"} 중`), false);
  assert.equal(workItemList.includes("업무 목록"), true);
  assert.equal(workItemList.includes("work-items-panel__body"), true);
  assert.equal(workItemList.includes("aria-busy="), true);
  assert.equal(workItemList.includes('"true"'), true);
  assert.equal(workItemList.includes("EmptyState"), false);
  assert.match(
    workItemList,
    /<section[\s\S]*className="work-items-panel"[\s\S]*<h1 className="work-items-panel__title">업무 목록<\/h1>[\s\S]*workItemsQuery\.isPending/,
  );
});
