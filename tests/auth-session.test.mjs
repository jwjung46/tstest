import test from "node:test";
import assert from "node:assert/strict";

import {
  getAuthErrorMessage,
  getPublicAuthFeedback,
  buildAuthRedirectTarget,
  buildAccountLinkStartPath,
  getDefaultPostAuthRedirectTarget,
  getHomeRouteBehavior,
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
import {
  getAuthenticatedUserSummaryDetails,
  getLinkedProviderCardViewModel,
} from "../src/features/auth/model/account-ui.ts";

test("getSessionSnapshot starts in loading before session bootstrap completes", () => {
  assert.deepEqual(getSessionSnapshot(), {
    status: "loading",
    session: null,
    recentLoginProvider: null,
  });
});

test("getAuthState reflects loading before session bootstrap completes", () => {
  assert.deepEqual(getAuthState(), {
    status: "loading",
    session: null,
    user: null,
    recentLoginProvider: null,
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
  assert.deepEqual(
    resolveAuthState({
      status: "loading",
      session: null,
      recentLoginProvider: null,
    }),
    {
      status: "loading",
      session: null,
      user: null,
      recentLoginProvider: null,
    },
  );
});

test("resolveAuthState exposes session and user for authenticated state", () => {
  const session = {
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      provider: "google",
    },
  };

  assert.deepEqual(
    resolveAuthState({
      status: "authenticated",
      session,
      recentLoginProvider: "google",
    }),
    {
      status: "authenticated",
      session,
      user: session.user,
      recentLoginProvider: "google",
    },
  );
});

test("resolveSessionSnapshotResponse maps missing session payloads to unauthenticated", () => {
  assert.deepEqual(resolveSessionSnapshotResponse({ session: null }), {
    status: "unauthenticated",
    session: null,
    recentLoginProvider: null,
  });
});

test("resolveSessionSnapshotResponse keeps provider data from the worker session payload", () => {
  assert.deepEqual(
    resolveSessionSnapshotResponse({
      recentLoginProvider: "google",
      session: {
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          provider: "google",
        },
      },
    }),
    {
      status: "authenticated",
      recentLoginProvider: "google",
      session: {
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          provider: "google",
        },
      },
    },
  );
});

test("requireAuth centralizes protected-route interpretation", () => {
  assert.deepEqual(
    requireAuth({
      status: "unauthenticated",
      session: null,
      user: null,
      recentLoginProvider: null,
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

test("buildAccountLinkStartPath encodes link intent separately from normal sign-in", () => {
  assert.equal(
    buildAccountLinkStartPath("naver", "/app"),
    "/auth/naver/start?redirectTo=%2Fapp&intent=link",
  );
});

test("getDefaultPostAuthRedirectTarget falls back to /app for missing route state", () => {
  assert.equal(getDefaultPostAuthRedirectTarget(undefined), "/app");
  assert.equal(getDefaultPostAuthRedirectTarget({}), "/app");
});

test("getDefaultPostAuthRedirectTarget preserves a valid protected target from route state", () => {
  assert.equal(
    getDefaultPostAuthRedirectTarget({ from: "/app/projects?tab=open#memo" }),
    "/app/projects?tab=open#memo",
  );
});

test("getHomeRouteBehavior redirects authenticated users to the protected app", () => {
  assert.deepEqual(
    getHomeRouteBehavior({
      status: "authenticated",
      session: {
        user: {
          id: "user-1",
          name: "Test User",
          provider: "google",
        },
      },
      user: {
        id: "user-1",
        name: "Test User",
        provider: "google",
      },
      recentLoginProvider: "google",
    }),
    {
      kind: "redirect",
      to: "/app",
    },
  );
});

test("getHomeRouteBehavior keeps home in a pending state while session bootstrap is loading", () => {
  assert.deepEqual(
    getHomeRouteBehavior({
      status: "loading",
      session: null,
      user: null,
      recentLoginProvider: null,
    }),
    {
      kind: "pending",
    },
  );
});

test("getAuthErrorMessage maps public auth errors to friendly text", () => {
  assert.equal(
    getAuthErrorMessage("token_exchange_failed"),
    "Login could not be completed. Please try again.",
  );
  assert.equal(
    getAuthErrorMessage("userinfo_fetch_failed"),
    "Your account information could not be loaded. Please try again.",
  );
});

test("getAuthErrorMessage falls back safely for unknown auth errors", () => {
  assert.equal(
    getAuthErrorMessage("provider_internal_stacktrace"),
    "Login could not be completed. Please try again.",
  );
});

test("getPublicAuthFeedback renders a friendly provider-aware auth message", () => {
  assert.equal(
    getPublicAuthFeedback({
      authError: "invalid_state",
      authProviderLabel: "Google",
    }),
    "Your login session expired. Please try again. Provider: Google.",
  );
});

test("getPublicAuthFeedback returns null when there is no auth error", () => {
  assert.equal(
    getPublicAuthFeedback({
      authError: null,
      authProviderLabel: null,
    }),
    null,
  );
});

test("authenticated user summary does not expose the raw internal user id", () => {
  const summary = getAuthenticatedUserSummaryDetails({
    id: "legacy:google:user-1",
    name: "Imported Google User",
    email: "person@example.com",
    provider: "google",
  });

  assert.deepEqual(summary, {
    name: "Imported Google User",
    providerLabel: "Google",
    email: "person@example.com",
  });
  assert.equal("id" in summary, false);
});

test("linked provider card renders linked and current-provider state details", () => {
  const card = getLinkedProviderCardViewModel({
    provider: "google",
    label: "Google",
    isLinked: true,
    isCurrent: true,
    canLink: false,
    email: "person@example.com",
    emailVerified: true,
    providerDisplayName: "Person Name",
    lastLoginAt: "2026-04-18T08:30:00.000Z",
  });

  assert.equal(card.statusText, "Linked");
  assert.deepEqual(card.badges, ["Linked", "Current provider"]);
  assert.deepEqual(card.detailRows, [
    { label: "Profile", value: "Person Name" },
    { label: "Email", value: "person@example.com" },
    { label: "Last login", value: "2026-04-18T08:30:00.000Z" },
  ]);
  assert.deepEqual(card.cta, {
    kind: "disabled",
    label: "Already linked",
  });
});

test("linked provider card simplifies the unlinked provider state", () => {
  const card = getLinkedProviderCardViewModel({
    provider: "naver",
    label: "Naver",
    isLinked: false,
    isCurrent: false,
    canLink: true,
    email: null,
    emailVerified: null,
    providerDisplayName: null,
    lastLoginAt: null,
  });

  assert.equal(card.statusText, "Not linked");
  assert.deepEqual(card.badges, ["Available"]);
  assert.equal(
    card.helperText,
    "Add Naver as another sign-in option for this account.",
  );
  assert.deepEqual(card.detailRows, []);
  assert.deepEqual(card.cta, {
    kind: "link",
    label: "Link Naver",
    href: "/auth/naver/start?redirectTo=%2Fapp&intent=link",
  });
});
