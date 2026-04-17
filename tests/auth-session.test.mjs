import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAuthRedirectTarget,
  buildOAuthStartPath,
  getAuthState,
  getCurrentUser,
  getSession,
  isAuthenticated,
  requireAuth,
  resolveAuthState,
} from "../src/features/auth/model/auth.ts";
import {
  getSessionSnapshot,
  resolveSessionSnapshotResponse,
} from "../src/platform/session/session.ts";

test("getSessionSnapshot starts in loading before session bootstrap completes", () => {
  assert.deepEqual(getSessionSnapshot(), {
    status: "loading",
    session: null,
  });
});

test("getAuthState reflects loading before session bootstrap completes", () => {
  assert.deepEqual(getAuthState(), {
    status: "loading",
    session: null,
    user: null,
  });
});

test("getSession returns null before an authenticated session exists", () => {
  assert.equal(getSession(), null);
});

test("getCurrentUser returns null when there is no session", () => {
  assert.equal(getCurrentUser(), null);
});

test("isAuthenticated derives from session presence", () => {
  assert.equal(isAuthenticated(), false);
});

test("resolveAuthState keeps loading separate from unauthenticated", () => {
  assert.deepEqual(resolveAuthState({ status: "loading", session: null }), {
    status: "loading",
    session: null,
    user: null,
  });
});

test("resolveAuthState exposes session and user for authenticated state", () => {
  const session = {
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
    },
  };

  assert.deepEqual(resolveAuthState({ status: "authenticated", session }), {
    status: "authenticated",
    session,
    user: session.user,
  });
});

test("resolveSessionSnapshotResponse maps missing session payloads to unauthenticated", () => {
  assert.deepEqual(resolveSessionSnapshotResponse({ session: null }), {
    status: "unauthenticated",
    session: null,
  });
});

test("requireAuth centralizes protected-route interpretation", () => {
  assert.deepEqual(
    requireAuth({
      status: "unauthenticated",
      session: null,
      user: null,
    }),
    {
      allowed: false,
      reason: "unauthenticated",
    },
  );
});

test("buildAuthRedirectTarget preserves pathname, search, and hash", () => {
  assert.equal(
    buildAuthRedirectTarget({
      pathname: "/app/projects",
      search: "?tab=open",
      hash: "#memo",
    }),
    "/app/projects?tab=open#memo",
  );
});

test("buildOAuthStartPath preserves the protected redirect target", () => {
  assert.equal(
    buildOAuthStartPath("google", "/app/projects?tab=open#memo"),
    "/auth/google/start?redirectTo=%2Fapp%2Fprojects%3Ftab%3Dopen%23memo",
  );
});
