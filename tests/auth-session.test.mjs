import test from "node:test";
import assert from "node:assert/strict";

import {
  getCurrentUser,
  getSession,
  isAuthenticated,
} from "../src/features/auth/model/auth.ts";

test("getSession returns null in the current pre-OAuth state", () => {
  assert.equal(getSession(), null);
});

test("getCurrentUser returns null when there is no session", () => {
  assert.equal(getCurrentUser(), null);
});

test("isAuthenticated derives from session presence", () => {
  assert.equal(isAuthenticated(), false);
});
