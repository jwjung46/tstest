import test from "node:test";
import assert from "node:assert/strict";

import worker from "../worker/src/index.ts";
import { createSessionCookie } from "../worker/src/oauth/session.ts";

function createStatementMock(db, sql) {
  const statement = {
    sql,
    bound: [],
    bind(...values) {
      statement.bound = values;
      return statement;
    },
    all: async () => {
      const rows = await db.execute("all", sql, statement.bound);
      return { results: rows };
    },
  };

  return statement;
}

function createDbMock(workItems = []) {
  return {
    state: {
      workItems,
    },
    prepare(sql) {
      return createStatementMock(this, sql);
    },
    async execute(mode, sql, values) {
      const normalized = sql.replace(/\s+/g, " ").trim();

      if (
        normalized ===
        "SELECT id, title, description, type, status, requester_user_id, assignee_user_id, created_at, updated_at FROM work_items WHERE requester_user_id = ? OR assignee_user_id = ? ORDER BY created_at DESC, id ASC"
      ) {
        const [requesterUserId, assigneeUserId] = values;
        return this.state.workItems
          .filter(
            (workItem) =>
              workItem.requester_user_id === requesterUserId ||
              workItem.assignee_user_id === assigneeUserId,
          )
          .sort((left, right) => {
            const createdAtOrder = right.created_at.localeCompare(
              left.created_at,
            );
            return createdAtOrder || left.id.localeCompare(right.id);
          })
          .map((workItem) => ({ ...workItem }));
      }

      throw new Error(`Unhandled SQL in test double: ${normalized} (${mode})`);
    },
  };
}

function createEnv(workItems = []) {
  return {
    AUTH_COOKIE_SECRET: "super-secret-auth-cookie-key",
    GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    KAKAO_OAUTH_CLIENT_ID: "kakao-client-id",
    KAKAO_OAUTH_CLIENT_SECRET: "kakao-client-secret",
    NAVER_OAUTH_CLIENT_ID: "naver-client-id",
    NAVER_OAUTH_CLIENT_SECRET: "naver-client-secret",
    DB: createDbMock(workItems),
  };
}

function createExecutionContext() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}

async function createSignedSessionCookie(env, userId) {
  const cookie = await createSessionCookie(
    env.AUTH_COOKIE_SECRET,
    {
      user: {
        id: userId,
        name: "Signed In User",
        email: "signed-in@example.com",
        provider: "google",
      },
    },
    true,
  );

  return cookie.split(";").at(0);
}

test("GET /api/work-items returns 401 without a signed-in session", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/work-items"),
    createEnv(),
    createExecutionContext(),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "unauthorized",
      message: "Sign in is required.",
    },
  });
});

test("GET /api/work-items returns only requester or assignee work items", async () => {
  const env = createEnv([
    {
      id: "work-item-assigned",
      title: "Assigned work",
      description: "Worker should see this item.",
      type: "prior_art_search",
      status: "completed",
      requester_user_id: "user-other",
      assignee_user_id: "user-current",
      created_at: "2026-04-28T02:00:00.000Z",
      updated_at: "2026-04-28T02:30:00.000Z",
    },
    {
      id: "work-item-requested",
      title: "Requested work",
      description: "Requester should see this item.",
      type: "oa_response",
      status: "processing",
      requester_user_id: "user-current",
      assignee_user_id: "user-worker",
      created_at: "2026-04-28T01:00:00.000Z",
      updated_at: "2026-04-28T01:10:00.000Z",
    },
    {
      id: "work-item-unrelated",
      title: "Unrelated work",
      description: "Current user should not see this item.",
      type: "translation_review",
      status: "reported",
      requester_user_id: "user-other",
      assignee_user_id: "user-worker",
      created_at: "2026-04-28T03:00:00.000Z",
      updated_at: "2026-04-28T03:10:00.000Z",
    },
  ]);
  const sessionCookie = await createSignedSessionCookie(env, "user-current");

  const response = await worker.fetch(
    new Request("https://example.com/api/work-items", {
      headers: {
        cookie: sessionCookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    workItems: [
      {
        id: "work-item-assigned",
        title: "Assigned work",
        description: "Worker should see this item.",
        type: "prior_art_search",
        status: "completed",
        requesterUserId: "user-other",
        assigneeUserId: "user-current",
        createdAt: "2026-04-28T02:00:00.000Z",
        updatedAt: "2026-04-28T02:30:00.000Z",
      },
      {
        id: "work-item-requested",
        title: "Requested work",
        description: "Requester should see this item.",
        type: "oa_response",
        status: "processing",
        requesterUserId: "user-current",
        assigneeUserId: "user-worker",
        createdAt: "2026-04-28T01:00:00.000Z",
        updatedAt: "2026-04-28T01:10:00.000Z",
      },
    ],
  });
});
