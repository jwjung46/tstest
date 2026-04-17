import test from "node:test";
import assert from "node:assert/strict";

import worker from "../worker/src/index.ts";
import {
  getOAuthProviderConfig,
  getProviderCallbackPath,
  listOAuthProviders,
} from "../worker/src/oauth/providers.ts";

function createEnv() {
  return {
    AUTH_COOKIE_SECRET: "super-secret-auth-cookie-key",
    GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    KAKAO_OAUTH_CLIENT_ID: "kakao-client-id",
    KAKAO_OAUTH_CLIENT_SECRET: "kakao-client-secret",
    NAVER_OAUTH_CLIENT_ID: "naver-client-id",
    NAVER_OAUTH_CLIENT_SECRET: "naver-client-secret",
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

test("callback maps provider-declared failures to a safe public auth error", async () => {
  const response = await worker.fetch(
    new Request(
      "https://example.com/auth/google/callback?error=server_error&error_description=raw-provider-detail",
    ),
    createEnv(),
    createExecutionContext(),
  );

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "/?authError=oauth_callback_failed&authProvider=google",
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
  const startResponse = await worker.fetch(
    new Request(
      "https://example.com/auth/google/start?redirectTo=%2Fapp%3Ftab%3Dprojects",
    ),
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
      createEnv(),
      createExecutionContext(),
    );

    assert.equal(callbackResponse.status, 302);
    assert.equal(callbackResponse.headers.get("location"), "/app?tab=projects");
    assert.match(readCookie(callbackResponse, "__session"), /^__session=/);
  } finally {
    global.fetch = originalFetch;
  }
});
