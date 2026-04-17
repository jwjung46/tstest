import test from "node:test";
import assert from "node:assert/strict";

import worker from "../worker/src/index.ts";
import {
  decodeSignedCookieValue,
  parseCookieHeader,
} from "../worker/src/oauth/cookies.ts";
import {
  getOAuthProviderConfig,
  getProviderCallbackPath,
  listOAuthProviders,
  OAUTH_COOKIE_NAME,
} from "../worker/src/oauth/providers.ts";
import { SESSION_COOKIE_NAME } from "../worker/src/oauth/providers.ts";
import {
  createSessionCookie,
  readSessionFromRequest,
} from "../worker/src/oauth/session.ts";
import { mergeUsers } from "../worker/src/account/service.ts";

function createStatementMock(db, sql) {
  const statement = {
    sql,
    bound: [],
    bind(...values) {
      statement.bound = values;
      return statement;
    },
    first: async () => db.execute("first", sql, statement.bound),
    all: async () => {
      const rows = await db.execute("all", sql, statement.bound);
      return { results: rows };
    },
    run: async () => db.execute("run", sql, statement.bound),
  };

  return statement;
}

function createDbMock() {
  const state = {
    users: [],
    userIdentities: [],
    notes: [],
  };

  return {
    state,
    prepare(sql) {
      return createStatementMock(this, sql);
    },
    async execute(mode, sql, values) {
      const normalized = sql.replace(/\s+/g, " ").trim();

      if (
        normalized ===
        "SELECT id, display_name, primary_email, created_at, updated_at, status, merged_into_user_id FROM users WHERE id = ?"
      ) {
        const [userId] = values;
        return state.users.find((user) => user.id === userId) ?? null;
      }

      if (
        normalized ===
        "INSERT INTO users (id, display_name, primary_email, created_at, updated_at, status, merged_into_user_id) VALUES (?, ?, ?, ?, ?, ?, NULL)"
      ) {
        const [
          id,
          display_name,
          primary_email,
          created_at,
          updated_at,
          status,
        ] = values;
        state.users.push({
          id,
          display_name,
          primary_email,
          created_at,
          updated_at,
          status,
          merged_into_user_id: null,
        });
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized ===
        "UPDATE users SET display_name = ?, primary_email = ?, updated_at = ? WHERE id = ?"
      ) {
        const [display_name, primary_email, updated_at, userId] = values;
        const user = state.users.find((entry) => entry.id === userId);
        if (user) {
          user.display_name = display_name;
          user.primary_email = primary_email;
          user.updated_at = updated_at;
        }
        return { success: true, meta: { changes: user ? 1 : 0 } };
      }

      if (
        normalized ===
        "UPDATE users SET status = ?, merged_into_user_id = ?, updated_at = ? WHERE id = ?"
      ) {
        const [status, merged_into_user_id, updated_at, userId] = values;
        const user = state.users.find((entry) => entry.id === userId);
        if (user) {
          user.status = status;
          user.merged_into_user_id = merged_into_user_id;
          user.updated_at = updated_at;
        }
        return { success: true, meta: { changes: user ? 1 : 0 } };
      }

      if (
        normalized ===
        "SELECT id, user_id, provider, provider_user_id, email, email_verified, provider_display_name, created_at, last_login_at FROM user_identities WHERE provider = ? AND provider_user_id = ?"
      ) {
        const [provider, provider_user_id] = values;
        return (
          state.userIdentities.find(
            (identity) =>
              identity.provider === provider &&
              identity.provider_user_id === provider_user_id,
          ) ?? null
        );
      }

      if (
        normalized ===
        "SELECT id, user_id, provider, provider_user_id, email, email_verified, provider_display_name, created_at, last_login_at FROM user_identities WHERE user_id = ? AND provider = ?"
      ) {
        const [user_id, provider] = values;
        return (
          state.userIdentities.find(
            (identity) =>
              identity.user_id === user_id && identity.provider === provider,
          ) ?? null
        );
      }

      if (
        normalized ===
        "SELECT id, user_id, provider, provider_user_id, email, email_verified, provider_display_name, created_at, last_login_at FROM user_identities WHERE user_id = ? ORDER BY created_at ASC"
      ) {
        const [userId] = values;
        return state.userIdentities
          .filter((identity) => identity.user_id === userId)
          .sort((left, right) =>
            left.created_at.localeCompare(right.created_at),
          )
          .map((identity) => ({ ...identity }));
      }

      if (
        normalized ===
        "INSERT INTO user_identities (id, user_id, provider, provider_user_id, email, email_verified, provider_display_name, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ) {
        const [
          id,
          user_id,
          provider,
          provider_user_id,
          email,
          email_verified,
          provider_display_name,
          created_at,
          last_login_at,
        ] = values;
        state.userIdentities.push({
          id,
          user_id,
          provider,
          provider_user_id,
          email,
          email_verified,
          provider_display_name,
          created_at,
          last_login_at,
        });
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized ===
        "UPDATE user_identities SET email = ?, email_verified = ?, provider_display_name = ?, last_login_at = ? WHERE id = ?"
      ) {
        const [
          email,
          email_verified,
          provider_display_name,
          last_login_at,
          id,
        ] = values;
        const identity = state.userIdentities.find((entry) => entry.id === id);
        if (identity) {
          identity.email = email;
          identity.email_verified = email_verified;
          identity.provider_display_name = provider_display_name;
          identity.last_login_at = last_login_at;
        }
        return { success: true, meta: { changes: identity ? 1 : 0 } };
      }

      if (
        normalized === "UPDATE user_identities SET user_id = ? WHERE id = ?"
      ) {
        const [user_id, id] = values;
        const identity = state.userIdentities.find((entry) => entry.id === id);
        if (identity) {
          identity.user_id = user_id;
        }
        return { success: true, meta: { changes: identity ? 1 : 0 } };
      }

      if (normalized === "DELETE FROM user_identities WHERE id = ?") {
        const [id] = values;
        const before = state.userIdentities.length;
        state.userIdentities = state.userIdentities.filter(
          (identity) => identity.id !== id,
        );
        return {
          success: true,
          meta: { changes: before - state.userIdentities.length },
        };
      }

      if (normalized === "UPDATE notes SET user_id = ? WHERE user_id = ?") {
        const [targetUserId, sourceUserId] = values;
        let changes = 0;
        for (const note of state.notes) {
          if (note.user_id === sourceUserId) {
            note.user_id = targetUserId;
            changes += 1;
          }
        }
        return { success: true, meta: { changes } };
      }

      throw new Error(`Unhandled SQL in test double: ${normalized} (${mode})`);
    },
  };
}

function createEnv(initialState = {}) {
  const DB = createDbMock();
  Object.assign(DB.state, initialState);

  return {
    AUTH_COOKIE_SECRET: "super-secret-auth-cookie-key",
    GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    KAKAO_OAUTH_CLIENT_ID: "kakao-client-id",
    KAKAO_OAUTH_CLIENT_SECRET: "kakao-client-secret",
    NAVER_OAUTH_CLIENT_ID: "naver-client-id",
    NAVER_OAUTH_CLIENT_SECRET: "naver-client-secret",
    DB,
  };
}

function createExecutionContext() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}

function readCookie(response, name) {
  const raw = response.headers.get("set-cookie");
  assert.ok(raw, "expected set-cookie header");
  const cookies = raw.split(/,(?=\s*[A-Za-z0-9_-]+=)/);
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  assert.ok(match, `expected ${name} cookie`);
  return match;
}

function readSetCookies(response) {
  return response.headers.getSetCookie();
}

test("provider configuration is centralized and includes all Phase 5 providers", () => {
  assert.deepEqual(
    listOAuthProviders().map((provider) => provider.id),
    ["google", "kakao", "naver"],
  );
  assert.equal(
    getOAuthProviderConfig("google").authorizationEndpoint.host,
    "accounts.google.com",
  );
  assert.equal(
    getOAuthProviderConfig("kakao").authorizationEndpoint.host,
    "kauth.kakao.com",
  );
  assert.equal(
    getOAuthProviderConfig("naver").authorizationEndpoint.host,
    "nid.naver.com",
  );
  assert.equal(getProviderCallbackPath("google"), "/auth/google/callback");
});

test("auth start redirects to the provider and stores signed state", async () => {
  const response = await worker.fetch(
    new Request(
      "https://example.com/auth/google/start?redirectTo=%2Fapp%2Fprojects",
    ),
    createEnv(),
    createExecutionContext(),
  );

  assert.equal(response.status, 302);

  const location = response.headers.get("location");
  assert.ok(location, "expected redirect location");

  const redirectUrl = new URL(location);
  assert.equal(redirectUrl.origin, "https://accounts.google.com");
  assert.equal(redirectUrl.searchParams.get("client_id"), "google-client-id");
  assert.equal(
    redirectUrl.searchParams.get("redirect_uri"),
    "https://example.com/auth/google/callback",
  );
  assert.equal(redirectUrl.searchParams.get("state")?.length, 32);
  assert.match(readCookie(response, "__oauth_state"), /^__oauth_state=/);

  const stateCookie = readCookie(response, OAUTH_COOKIE_NAME).split(";").at(0);
  const stateValue = parseCookieHeader(stateCookie).get(OAUTH_COOKIE_NAME);
  const statePayload = await decodeSignedCookieValue(
    createEnv().AUTH_COOKIE_SECRET,
    stateValue,
  );

  assert.deepEqual(statePayload, {
    intent: "sign_in",
    provider: "google",
    redirectTo: "/app/projects",
    state: redirectUrl.searchParams.get("state"),
    currentUserId: null,
  });
});

test("callback rejects requests with invalid state before token exchange", async () => {
  const response = await worker.fetch(
    new Request(
      "https://example.com/auth/google/callback?code=test-code&state=bad-state",
    ),
    createEnv(),
    createExecutionContext(),
  );

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "/?authError=invalid_state&authProvider=google",
  );
});

test("callback maps provider-declared failures to a safe public auth error for valid sign-in state", async () => {
  const env = createEnv();
  const startResponse = await worker.fetch(
    new Request("https://example.com/auth/google/start?redirectTo=%2Fapp"),
    env,
    createExecutionContext(),
  );
  const providerUrl = new URL(startResponse.headers.get("location"));
  const state = providerUrl.searchParams.get("state");
  assert.ok(state, "expected OAuth state parameter");

  const response = await worker.fetch(
    new Request(
      `https://example.com/auth/google/callback?error=server_error&error_description=raw-provider-detail&state=${state}`,
      {
        headers: {
          cookie: readCookie(startResponse, OAUTH_COOKIE_NAME).split(";").at(0),
        },
      },
    ),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "/?authError=oauth_callback_failed&authProvider=google",
  );
});

test("callback routes provider-declared failures through the link feedback path for valid link state", async () => {
  const env = createEnv();
  const signedSessionCookie = await createSessionCookie(
    env.AUTH_COOKIE_SECRET,
    {
      user: {
        id: "user-1",
        name: "Current User",
        email: "current@example.com",
        provider: "google",
      },
    },
    true,
  );
  const startResponse = await worker.fetch(
    new Request(
      "https://example.com/auth/naver/start?redirectTo=%2Fapp%3Ftab%3Dlinked&intent=link",
      {
        headers: {
          cookie: signedSessionCookie.split(";").at(0),
        },
      },
    ),
    env,
    createExecutionContext(),
  );

  const providerUrl = new URL(startResponse.headers.get("location"));
  const state = providerUrl.searchParams.get("state");
  assert.ok(state, "expected OAuth state parameter");

  const callbackResponse = await worker.fetch(
    new Request(
      `https://example.com/auth/naver/callback?error=server_error&state=${state}`,
      {
        headers: {
          cookie: [
            signedSessionCookie.split(";").at(0),
            readCookie(startResponse, OAUTH_COOKIE_NAME).split(";").at(0),
          ].join("; "),
        },
      },
    ),
    env,
    createExecutionContext(),
  );

  assert.equal(callbackResponse.status, 302);
  assert.equal(
    callbackResponse.headers.get("location"),
    "/app?tab=linked&accountLinkError=oauth_callback_failed&accountLinkProvider=naver",
  );
});

test("callback redirects cleanly when token exchange fails", async () => {
  const startResponse = await worker.fetch(
    new Request("https://example.com/auth/google/start"),
    createEnv(),
    createExecutionContext(),
  );
  const providerUrl = new URL(startResponse.headers.get("location"));
  const state = providerUrl.searchParams.get("state");
  assert.ok(state, "expected OAuth state parameter");

  const originalFetch = global.fetch;
  global.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;

    if (url === "https://oauth2.googleapis.com/token") {
      return new Response("upstream failure", { status: 500 });
    }

    throw new Error(`Unexpected outbound fetch: ${url}`);
  };

  try {
    const cookieHeader = readCookie(startResponse, "__oauth_state")
      .split(";")
      .at(0);

    const callbackResponse = await worker.fetch(
      new Request(
        `https://example.com/auth/google/callback?code=callback-code&state=${state}`,
        {
          headers: {
            cookie: cookieHeader,
          },
        },
      ),
      createEnv(),
      createExecutionContext(),
    );

    assert.equal(callbackResponse.status, 302);
    assert.equal(
      callbackResponse.headers.get("location"),
      "/?authError=token_exchange_failed&authProvider=google",
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("callback redirects cleanly when userinfo fetch fails", async () => {
  const startResponse = await worker.fetch(
    new Request("https://example.com/auth/google/start"),
    createEnv(),
    createExecutionContext(),
  );
  const providerUrl = new URL(startResponse.headers.get("location"));
  const state = providerUrl.searchParams.get("state");
  assert.ok(state, "expected OAuth state parameter");

  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;

    if (url === "https://oauth2.googleapis.com/token") {
      assert.match(String(init?.body), /code=callback-code/);
      return Response.json({
        access_token: "google-access-token",
        token_type: "Bearer",
      });
    }

    if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
      return new Response("userinfo unavailable", { status: 502 });
    }

    throw new Error(`Unexpected outbound fetch: ${url}`);
  };

  try {
    const cookieHeader = readCookie(startResponse, "__oauth_state")
      .split(";")
      .at(0);

    const callbackResponse = await worker.fetch(
      new Request(
        `https://example.com/auth/google/callback?code=callback-code&state=${state}`,
        {
          headers: {
            cookie: cookieHeader,
          },
        },
      ),
      createEnv(),
      createExecutionContext(),
    );

    assert.equal(callbackResponse.status, 302);
    assert.equal(
      callbackResponse.headers.get("location"),
      "/?authError=userinfo_fetch_failed&authProvider=google",
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("callback exchanges the code, creates a session cookie, and returns to the original target", async () => {
  const env = createEnv();
  const startResponse = await worker.fetch(
    new Request(
      "https://example.com/auth/google/start?redirectTo=%2Fapp%3Ftab%3Dprojects",
    ),
    env,
    createExecutionContext(),
  );
  const providerUrl = new URL(startResponse.headers.get("location"));
  const state = providerUrl.searchParams.get("state");
  assert.ok(state, "expected OAuth state parameter");

  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;

    if (url === "https://oauth2.googleapis.com/token") {
      assert.match(String(init?.body), /code=callback-code/);
      return Response.json({
        access_token: "google-access-token",
        token_type: "Bearer",
      });
    }

    if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
      return Response.json({
        sub: "google-user-1",
        name: "Google User",
        email: "google@example.com",
      });
    }

    throw new Error(`Unexpected outbound fetch: ${url}`);
  };

  try {
    const cookieHeader = readCookie(startResponse, "__oauth_state")
      .split(";")
      .at(0);

    const callbackResponse = await worker.fetch(
      new Request(
        `https://example.com/auth/google/callback?code=callback-code&state=${state}`,
        {
          headers: {
            cookie: cookieHeader,
          },
        },
      ),
      env,
      createExecutionContext(),
    );

    assert.equal(callbackResponse.status, 302);
    assert.equal(callbackResponse.headers.get("location"), "/app?tab=projects");
    assert.match(readCookie(callbackResponse, "__session"), /^__session=/);

    const session = await readSessionFromRequest(
      env.AUTH_COOKIE_SECRET,
      new Request("https://example.com/api/session", {
        headers: {
          cookie: readCookie(callbackResponse, SESSION_COOKIE_NAME)
            .split(";")
            .at(0),
        },
      }),
    );
    assert.ok(session, "expected signed session");
    assert.notEqual(session.user.id, "google:google-user-1");
    assert.equal(session.user.provider, "google");
    assert.equal(env.DB.state.users.length, 1);
    assert.equal(env.DB.state.userIdentities.length, 1);
    assert.equal(env.DB.state.userIdentities[0].provider, "google");
  } finally {
    global.fetch = originalFetch;
  }
});

test("successful sign-in uplifts a legacy imported canonical display name once from provider identity data", async () => {
  const env = createEnv({
    users: [
      {
        id: "user-imported",
        display_name: "Imported Google User",
        primary_email: null,
        created_at: "2026-04-17T09:00:00.000Z",
        updated_at: "2026-04-17T09:00:00.000Z",
        status: "active",
        merged_into_user_id: null,
      },
    ],
    userIdentities: [
      {
        id: "identity-google-imported",
        user_id: "user-imported",
        provider: "google",
        provider_user_id: "google-user-imported",
        email: null,
        email_verified: null,
        provider_display_name: "Imported Google User",
        created_at: "2026-04-17T09:00:00.000Z",
        last_login_at: "2026-04-17T09:00:00.000Z",
      },
    ],
  });
  const startResponse = await worker.fetch(
    new Request("https://example.com/auth/google/start?redirectTo=%2Fapp"),
    env,
    createExecutionContext(),
  );
  const providerUrl = new URL(startResponse.headers.get("location"));
  const state = providerUrl.searchParams.get("state");
  assert.ok(state, "expected OAuth state parameter");

  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;

    if (url === "https://oauth2.googleapis.com/token") {
      assert.match(String(init?.body), /code=callback-code/);
      return Response.json({
        access_token: "google-access-token",
        token_type: "Bearer",
      });
    }

    if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
      return Response.json({
        sub: "google-user-imported",
        name: "Real Google Person",
        email: "real@example.com",
      });
    }

    throw new Error(`Unexpected outbound fetch: ${url}`);
  };

  try {
    const callbackResponse = await worker.fetch(
      new Request(
        `https://example.com/auth/google/callback?code=callback-code&state=${state}`,
        {
          headers: {
            cookie: readCookie(startResponse, OAUTH_COOKIE_NAME)
              .split(";")
              .at(0),
          },
        },
      ),
      env,
      createExecutionContext(),
    );

    assert.equal(callbackResponse.status, 302);
    assert.equal(callbackResponse.headers.get("location"), "/app");
    assert.equal(env.DB.state.users[0].display_name, "Real Google Person");
    assert.equal(env.DB.state.users[0].primary_email, "real@example.com");
  } finally {
    global.fetch = originalFetch;
  }
});

test("successful sign-in does not overwrite a normal canonical display name", async () => {
  const env = createEnv({
    users: [
      {
        id: "user-normal",
        display_name: "Already Normal Name",
        primary_email: "owner@example.com",
        created_at: "2026-04-17T09:00:00.000Z",
        updated_at: "2026-04-17T09:00:00.000Z",
        status: "active",
        merged_into_user_id: null,
      },
    ],
    userIdentities: [
      {
        id: "identity-google-normal",
        user_id: "user-normal",
        provider: "google",
        provider_user_id: "google-user-normal",
        email: "old@example.com",
        email_verified: 1,
        provider_display_name: "Old Google Name",
        created_at: "2026-04-17T09:00:00.000Z",
        last_login_at: "2026-04-17T09:00:00.000Z",
      },
    ],
  });
  const startResponse = await worker.fetch(
    new Request("https://example.com/auth/google/start?redirectTo=%2Fapp"),
    env,
    createExecutionContext(),
  );
  const providerUrl = new URL(startResponse.headers.get("location"));
  const state = providerUrl.searchParams.get("state");
  assert.ok(state, "expected OAuth state parameter");

  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;

    if (url === "https://oauth2.googleapis.com/token") {
      assert.match(String(init?.body), /code=callback-code/);
      return Response.json({
        access_token: "google-access-token",
        token_type: "Bearer",
      });
    }

    if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
      return Response.json({
        sub: "google-user-normal",
        name: "New Provider Name",
        email: "new@example.com",
      });
    }

    throw new Error(`Unexpected outbound fetch: ${url}`);
  };

  try {
    const callbackResponse = await worker.fetch(
      new Request(
        `https://example.com/auth/google/callback?code=callback-code&state=${state}`,
        {
          headers: {
            cookie: readCookie(startResponse, OAUTH_COOKIE_NAME)
              .split(";")
              .at(0),
          },
        },
      ),
      env,
      createExecutionContext(),
    );

    assert.equal(callbackResponse.status, 302);
    assert.equal(callbackResponse.headers.get("location"), "/app");
    assert.equal(env.DB.state.users[0].display_name, "Already Normal Name");
    assert.equal(env.DB.state.users[0].primary_email, "owner@example.com");
  } finally {
    global.fetch = originalFetch;
  }
});

test("link intent start stores distinct signed state from normal sign-in", async () => {
  const env = createEnv();
  const signedSessionCookie = await createSessionCookie(
    env.AUTH_COOKIE_SECRET,
    {
      user: {
        id: "user-1",
        name: "Current User",
        email: "current@example.com",
        provider: "google",
      },
    },
    true,
  );
  const response = await worker.fetch(
    new Request(
      "https://example.com/auth/naver/start?redirectTo=%2Fapp&intent=link",
      {
        headers: {
          cookie: signedSessionCookie.split(";").at(0),
        },
      },
    ),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 302);

  const redirectUrl = new URL(response.headers.get("location"));
  const stateCookie = readCookie(response, OAUTH_COOKIE_NAME).split(";").at(0);
  const stateValue = parseCookieHeader(stateCookie).get(OAUTH_COOKIE_NAME);
  const statePayload = await decodeSignedCookieValue(
    createEnv().AUTH_COOKIE_SECRET,
    stateValue,
  );

  assert.deepEqual(statePayload, {
    intent: "link",
    provider: "naver",
    redirectTo: "/app",
    state: redirectUrl.searchParams.get("state"),
    currentUserId: "user-1",
  });
});

test("link callback rejects provider identities already linked to another user", async () => {
  const env = createEnv({
    users: [
      {
        id: "user-current",
        display_name: "Current User",
        primary_email: "current@example.com",
        created_at: "2026-04-17T09:00:00.000Z",
        updated_at: "2026-04-17T09:00:00.000Z",
        status: "active",
        merged_into_user_id: null,
      },
      {
        id: "user-other",
        display_name: "Other User",
        primary_email: "other@example.com",
        created_at: "2026-04-17T09:00:00.000Z",
        updated_at: "2026-04-17T09:00:00.000Z",
        status: "active",
        merged_into_user_id: null,
      },
    ],
    userIdentities: [
      {
        id: "identity-other-google",
        user_id: "user-other",
        provider: "google",
        provider_user_id: "google-user-2",
        email: "other@example.com",
        email_verified: 1,
        provider_display_name: "Other Google User",
        created_at: "2026-04-17T09:00:00.000Z",
        last_login_at: "2026-04-17T09:00:00.000Z",
      },
    ],
  });
  const signedSessionCookie = await createSessionCookie(
    env.AUTH_COOKIE_SECRET,
    {
      user: {
        id: "user-current",
        name: "Current User",
        email: "current@example.com",
        provider: "naver",
      },
    },
    true,
  );

  const startResponse = await worker.fetch(
    new Request(
      "https://example.com/auth/google/start?redirectTo=%2Fapp&intent=link",
      {
        headers: {
          cookie: signedSessionCookie.split(";").at(0),
        },
      },
    ),
    env,
    createExecutionContext(),
  );
  const providerUrl = new URL(startResponse.headers.get("location"));
  const state = providerUrl.searchParams.get("state");
  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;

    if (url === "https://oauth2.googleapis.com/token") {
      assert.match(String(init?.body), /code=callback-code/);
      return Response.json({
        access_token: "google-access-token",
        token_type: "Bearer",
      });
    }

    if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
      return Response.json({
        sub: "google-user-2",
        name: "Other Google User",
        email: "other@example.com",
      });
    }

    throw new Error(`Unexpected outbound fetch: ${url}`);
  };

  try {
    const callbackResponse = await worker.fetch(
      new Request(
        `https://example.com/auth/google/callback?code=callback-code&state=${state}`,
        {
          headers: {
            cookie: [
              signedSessionCookie.split(";").at(0),
              readCookie(startResponse, OAUTH_COOKIE_NAME).split(";").at(0),
            ].join("; "),
          },
        },
      ),
      env,
      createExecutionContext(),
    );

    assert.equal(callbackResponse.status, 302);
    assert.equal(
      callbackResponse.headers.get("location"),
      "/app?accountLinkError=identity_linked_to_other_user&accountLinkProvider=google",
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("mergeUsers reassigns notes, reconciles identities, and marks the source user as merged", async () => {
  const db = createDbMock();
  db.state.users.push(
    {
      id: "user-source",
      display_name: "Source User",
      primary_email: "source@example.com",
      created_at: "2026-04-17T09:00:00.000Z",
      updated_at: "2026-04-17T09:00:00.000Z",
      status: "active",
      merged_into_user_id: null,
    },
    {
      id: "user-target",
      display_name: "Target User",
      primary_email: "target@example.com",
      created_at: "2026-04-17T09:00:00.000Z",
      updated_at: "2026-04-17T09:00:00.000Z",
      status: "active",
      merged_into_user_id: null,
    },
  );
  db.state.userIdentities.push(
    {
      id: "identity-source-google",
      user_id: "user-source",
      provider: "google",
      provider_user_id: "google-source",
      email: "source@example.com",
      email_verified: 1,
      provider_display_name: "Source Google",
      created_at: "2026-04-17T09:00:00.000Z",
      last_login_at: "2026-04-17T09:00:00.000Z",
    },
    {
      id: "identity-source-kakao",
      user_id: "user-source",
      provider: "kakao",
      provider_user_id: "kakao-source",
      email: null,
      email_verified: null,
      provider_display_name: "Source Kakao",
      created_at: "2026-04-17T09:01:00.000Z",
      last_login_at: "2026-04-17T09:01:00.000Z",
    },
    {
      id: "identity-target-google",
      user_id: "user-target",
      provider: "google",
      provider_user_id: "google-target",
      email: "target@example.com",
      email_verified: 1,
      provider_display_name: "Target Google",
      created_at: "2026-04-17T09:02:00.000Z",
      last_login_at: "2026-04-17T09:02:00.000Z",
    },
  );
  db.state.notes.push(
    {
      id: "note-1",
      user_id: "user-source",
    },
    {
      id: "note-2",
      user_id: "user-source",
    },
  );

  const result = await mergeUsers(db, {
    sourceUserId: "user-source",
    targetUserId: "user-target",
    now: "2026-04-17T12:00:00.000Z",
  });

  assert.deepEqual(result, {
    mergedUserId: "user-target",
    sourceUserId: "user-source",
    targetUserId: "user-target",
    movedIdentityCount: 1,
    reassignedNoteCount: 2,
    skippedIdentityProviders: ["google"],
  });
  assert.equal(
    db.state.notes.every((note) => note.user_id === "user-target"),
    true,
  );
  assert.equal(
    db.state.users.find((user) => user.id === "user-source")?.status,
    "merged",
  );
  assert.equal(
    db.state.users.find((user) => user.id === "user-source")
      ?.merged_into_user_id,
    "user-target",
  );
});

test("sign-out clears both cookies with separate set-cookie headers and returns to the public route", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/auth/sign-out", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=signed-session-value; __recent_login_provider=signed-provider-value`,
      },
    }),
    createEnv(),
    createExecutionContext(),
  );

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/");

  const sessionCookie = readCookie(response, SESSION_COOKIE_NAME);
  assert.match(sessionCookie, /^__session=/);
  assert.match(sessionCookie, /Max-Age=0/);
  assert.match(sessionCookie, /Path=\//);

  const setCookies = readSetCookies(response);
  assert.equal(setCookies.length, 2);
  assert.match(setCookies[0], /^__session=/);
  assert.match(setCookies[0], /Max-Age=0/);
  assert.match(setCookies[1], /^__recent_login_provider=/);
  assert.match(setCookies[1], /Max-Age=0/);
});
