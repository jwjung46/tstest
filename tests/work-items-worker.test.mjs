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
    run: async () => {
      await db.execute("run", sql, statement.bound);
      return { success: true };
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

      if (
        normalized ===
        "INSERT INTO work_items (id, title, description, type, status, requester_user_id, assignee_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ) {
        const [
          id,
          title,
          description,
          type,
          status,
          requesterUserId,
          assigneeUserId,
          createdAt,
          updatedAt,
        ] = values;
        this.state.workItems.push({
          id,
          title,
          description,
          type,
          status,
          requester_user_id: requesterUserId,
          assignee_user_id: assigneeUserId,
          created_at: createdAt,
          updated_at: updatedAt,
        });
        return [];
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

function createWorkItemRequest(body, sessionCookie) {
  return new Request("https://example.com/api/work-items", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sessionCookie ? { cookie: sessionCookie } : {}),
    },
    body: JSON.stringify(body),
  });
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

test("POST /api/work-items returns 401 without a signed-in session", async () => {
  const response = await worker.fetch(
    createWorkItemRequest(
      {
        title: "Draft OA response",
        description: "Prepare office action response.",
        type: "oa_response",
        assigneeUserId: "user-worker",
      },
      null,
    ),
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

test("POST /api/work-items creates a processing work item for the session requester", async () => {
  const env = createEnv();
  const sessionCookie = await createSignedSessionCookie(env, "user-requester");

  const response = await worker.fetch(
    createWorkItemRequest(
      {
        title: "  Draft OA response  ",
        description: "  Prepare office action response.  ",
        type: "oa_response",
        assigneeUserId: "  user-worker  ",
        requesterUserId: "user-spoofed",
        status: "requested",
      },
      sessionCookie,
    ),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.equal(payload.workItem.title, "Draft OA response");
  assert.equal(payload.workItem.description, "Prepare office action response.");
  assert.equal(payload.workItem.type, "oa_response");
  assert.equal(payload.workItem.status, "processing");
  assert.equal(payload.workItem.requesterUserId, "user-requester");
  assert.equal(payload.workItem.assigneeUserId, "user-worker");
  assert.equal(typeof payload.workItem.id, "string");
  assert.notEqual(payload.workItem.id, "");
  assert.equal(payload.workItem.createdAt, payload.workItem.updatedAt);

  const listResponse = await worker.fetch(
    new Request("https://example.com/api/work-items", {
      headers: {
        cookie: sessionCookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), {
    workItems: [payload.workItem],
  });
});

test("POST /api/work-items rejects invalid type", async () => {
  const env = createEnv();
  const sessionCookie = await createSignedSessionCookie(env, "user-requester");

  const response = await worker.fetch(
    createWorkItemRequest(
      {
        title: "Prior art search",
        description: "Prepare search report.",
        type: "requested",
        assigneeUserId: "user-worker",
      },
      sessionCookie,
    ),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "invalid_work_item_input",
      message: "Work item input is invalid.",
    },
  });
});

test("POST /api/work-items rejects blank required strings", async () => {
  const env = createEnv();
  const sessionCookie = await createSignedSessionCookie(env, "user-requester");

  for (const body of [
    {
      title: " ",
      description: "Prepare search report.",
      type: "prior_art_search",
      assigneeUserId: "user-worker",
    },
    {
      title: "Prior art search",
      description: " ",
      type: "prior_art_search",
      assigneeUserId: "user-worker",
    },
    {
      title: "Prior art search",
      description: "Prepare search report.",
      type: "prior_art_search",
      assigneeUserId: " ",
    },
  ]) {
    const response = await worker.fetch(
      createWorkItemRequest(body, sessionCookie),
      env,
      createExecutionContext(),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: "invalid_work_item_input",
        message: "Work item input is invalid.",
      },
    });
  }
});

test("POST /api/work-items rejects invalid JSON", async () => {
  const env = createEnv();
  const sessionCookie = await createSignedSessionCookie(env, "user-requester");

  const response = await worker.fetch(
    new Request("https://example.com/api/work-items", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie,
      },
      body: "{",
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "invalid_json",
      message: "Request body must be valid JSON.",
    },
  });
});

test("unsupported /api/work-items methods return 405", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/work-items", {
      method: "PUT",
    }),
    createEnv(),
    createExecutionContext(),
  );

  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), {
    error: {
      code: "method_not_allowed",
      message: "Method not allowed.",
    },
  });
});
