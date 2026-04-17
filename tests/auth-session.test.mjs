import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAuthRedirectTarget,
  getAuthState,
  getCurrentUser,
  getSession,
  isAuthenticated,
  resolveAuthState,
} from "../src/features/auth/model/auth.ts";

test("getAuthState returns unauthenticated in the current pre-OAuth state", () => {
  assert.deepEqual(getAuthState(), {
    status: "unauthenticated",
    session: null,
    user: null,
  });
});

test("getSession returns null in the current pre-OAuth state", () => {
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
