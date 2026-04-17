import test from "node:test";
import assert from "node:assert/strict";

import worker from "../worker/src/index.ts";
import { createSessionCookie } from "../worker/src/oauth/session.ts";

function createExecutionContext() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}

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
        normalized.startsWith(
          "SELECT id, user_id, title, content, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
        )
      ) {
        const [userId] = values;
        return state.notes
          .filter((note) => note.user_id === userId)
          .sort((left, right) =>
            right.updated_at.localeCompare(left.updated_at),
          )
          .map((note) => ({ ...note }));
      }

      if (
        normalized.startsWith(
          "SELECT id, user_id, title, content, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?",
        )
      ) {
        const [id, userId] = values;
        return (
          state.notes.find(
            (note) => note.id === id && note.user_id === userId,
          ) ?? null
        );
      }

      if (
        normalized.startsWith(
          "INSERT INTO notes (id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
      ) {
        const [id, user_id, title, content, created_at, updated_at] = values;
        state.notes.push({
          id,
          user_id,
          title,
          content,
          created_at,
          updated_at,
        });
        return { success: true };
      }

      if (
        normalized.startsWith(
          "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        )
      ) {
        const [title, content, updated_at, id, userId] = values;
        const note = state.notes.find(
          (entry) => entry.id === id && entry.user_id === userId,
        );
        if (!note) {
          return { success: true, meta: { changes: 0 } };
        }
        note.title = title;
        note.content = content;
        note.updated_at = updated_at;
        return { success: true, meta: { changes: 1 } };
      }

      if (
        normalized.startsWith("DELETE FROM notes WHERE id = ? AND user_id = ?")
      ) {
        const [id, userId] = values;
        const before = state.notes.length;
        state.notes = state.notes.filter(
          (note) => !(note.id === id && note.user_id === userId),
        );
        return {
          success: true,
          meta: { changes: before - state.notes.length },
        };
      }

      throw new Error(`Unhandled SQL in test double: ${normalized} (${mode})`);
    },
  };
}

async function createEnv() {
  return {
    AUTH_COOKIE_SECRET: "super-secret-auth-cookie-key",
    GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    KAKAO_OAUTH_CLIENT_ID: "kakao-client-id",
    KAKAO_OAUTH_CLIENT_SECRET: "kakao-client-secret",
    NAVER_OAUTH_CLIENT_ID: "naver-client-id",
    NAVER_OAUTH_CLIENT_SECRET: "naver-client-secret",
    DB: createDbMock(),
  };
}

async function createCookieHeader(secret, userOverrides = {}) {
  const cookie = await createSessionCookie(
    secret,
    {
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        provider: "google",
        ...userOverrides,
      },
    },
    true,
  );

  return cookie.split(";").at(0);
}

test("notes list requires an authenticated session", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/notes"),
    await createEnv(),
    createExecutionContext(),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "unauthorized",
      message: "Authentication is required.",
    },
  });
});

test("notes APIs only expose notes owned by the current session user", async () => {
  const env = await createEnv();
  env.DB.state.notes.push(
    {
      id: "note-1",
      user_id: "user-1",
      title: "",
      content: "Mine",
      created_at: "2026-04-17T09:00:00.000Z",
      updated_at: "2026-04-17T09:00:00.000Z",
    },
    {
      id: "note-2",
      user_id: "user-2",
      title: "Other",
      content: "Other user note",
      created_at: "2026-04-17T08:00:00.000Z",
      updated_at: "2026-04-17T08:00:00.000Z",
    },
  );

  const response = await worker.fetch(
    new Request("https://example.com/api/notes", {
      headers: {
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET),
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    notes: [
      {
        id: "note-1",
        title: "",
        content: "Mine",
        createdAt: "2026-04-17T09:00:00.000Z",
        updatedAt: "2026-04-17T09:00:00.000Z",
      },
    ],
  });
});

test("creating a note returns the saved note and listable timestamps", async () => {
  const env = await createEnv();
  const response = await worker.fetch(
    new Request("https://example.com/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET),
      },
      body: JSON.stringify({
        title: "",
        content: "First note",
      }),
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(typeof payload.note.id, "string");
  assert.equal(payload.note.title, "");
  assert.equal(payload.note.content, "First note");
  assert.match(payload.note.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(payload.note.createdAt, payload.note.updatedAt);
});

test("creating a note rejects empty title and whitespace-only content", async () => {
  const env = await createEnv();
  const response = await worker.fetch(
    new Request("https://example.com/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET),
      },
      body: JSON.stringify({
        title: "   ",
        content: "   ",
      }),
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "validation_error",
      message: "Add some note content before saving.",
    },
  });
});

test("updating and deleting require ownership of the target note", async () => {
  const env = await createEnv();
  env.DB.state.notes.push({
    id: "note-1",
    user_id: "user-2",
    title: "Other",
    content: "Other user note",
    created_at: "2026-04-17T08:00:00.000Z",
    updated_at: "2026-04-17T08:00:00.000Z",
  });

  const cookie = await createCookieHeader(env.AUTH_COOKIE_SECRET);
  const patchResponse = await worker.fetch(
    new Request("https://example.com/api/notes/note-1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        title: "Updated",
        content: "Updated",
      }),
    }),
    env,
    createExecutionContext(),
  );

  const deleteResponse = await worker.fetch(
    new Request("https://example.com/api/notes/note-1", {
      method: "DELETE",
      headers: {
        cookie,
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(patchResponse.status, 404);
  assert.equal(deleteResponse.status, 404);
});

test("updating a note changes content and bumps updatedAt", async () => {
  const env = await createEnv();
  env.DB.state.notes.push({
    id: "note-1",
    user_id: "user-1",
    title: "Before",
    content: "Before content",
    created_at: "2026-04-17T08:00:00.000Z",
    updated_at: "2026-04-17T08:00:00.000Z",
  });

  const response = await worker.fetch(
    new Request("https://example.com/api/notes/note-1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET),
      },
      body: JSON.stringify({
        title: "",
        content: "After content",
      }),
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.note.id, "note-1");
  assert.equal(payload.note.title, "");
  assert.equal(payload.note.content, "After content");
  assert.notEqual(payload.note.updatedAt, "2026-04-17T08:00:00.000Z");
});

test("deleting a note removes it for the current owner", async () => {
  const env = await createEnv();
  env.DB.state.notes.push({
    id: "note-1",
    user_id: "user-1",
    title: "",
    content: "Delete me",
    created_at: "2026-04-17T08:00:00.000Z",
    updated_at: "2026-04-17T08:00:00.000Z",
  });

  const response = await worker.fetch(
    new Request("https://example.com/api/notes/note-1", {
      method: "DELETE",
      headers: {
        cookie: await createCookieHeader(env.AUTH_COOKIE_SECRET),
      },
    }),
    env,
    createExecutionContext(),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(env.DB.state.notes.length, 0);
});
