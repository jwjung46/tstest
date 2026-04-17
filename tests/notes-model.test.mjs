import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildWorkspaceSelectionState,
  getDefaultSelectedNoteId,
  getDisplayTitle,
  getNotePreview,
  getSelectionAfterDelete,
  sortNotesByUpdatedAtDesc,
} from "../src/features/notes/model/note-state.ts";
import {
  canSaveNoteDraft,
  validateNoteInput,
} from "../src/features/notes/model/note-validation.ts";

test("validateNoteInput rejects a note when title and content are both empty", () => {
  assert.deepEqual(validateNoteInput({ title: "", content: "" }), {
    ok: false,
    error: "Add some note content before saving.",
  });
});

test("validateNoteInput rejects whitespace-only content", () => {
  assert.deepEqual(validateNoteInput({ title: "  ", content: "   " }), {
    ok: false,
    error: "Add some note content before saving.",
  });
});

test("validateNoteInput allows content-only notes", () => {
  assert.deepEqual(validateNoteInput({ title: "", content: "hello" }), {
    ok: true,
  });
  assert.equal(canSaveNoteDraft({ title: "", content: "hello" }), true);
});

test('getDisplayTitle falls back to "Untitled" for empty titles', () => {
  assert.equal(getDisplayTitle(""), "Untitled");
  assert.equal(getDisplayTitle("   "), "Untitled");
});

test("getNotePreview derives a trimmed single-line preview from content", () => {
  assert.equal(
    getNotePreview("  first line\nsecond line"),
    "first line second line",
  );
});

test("sortNotesByUpdatedAtDesc orders the most recently updated note first", () => {
  const sorted = sortNotesByUpdatedAtDesc([
    { id: "older", updatedAt: "2026-04-16T10:00:00.000Z" },
    { id: "newer", updatedAt: "2026-04-17T10:00:00.000Z" },
  ]);

  assert.deepEqual(
    sorted.map((note) => note.id),
    ["newer", "older"],
  );
});

test("getDefaultSelectedNoteId returns the first note id when notes exist", () => {
  assert.equal(
    getDefaultSelectedNoteId([
      { id: "note-1", updatedAt: "2026-04-17T10:00:00.000Z" },
      { id: "note-2", updatedAt: "2026-04-16T10:00:00.000Z" },
    ]),
    "note-1",
  );
  assert.equal(getDefaultSelectedNoteId([]), null);
});

test("buildWorkspaceSelectionState derives selected id and draft seed from loaded notes", () => {
  assert.deepEqual(
    buildWorkspaceSelectionState([
      {
        id: "note-1",
        title: "",
        content: "First",
        createdAt: "2026-04-17T10:00:00.000Z",
        updatedAt: "2026-04-17T10:00:00.000Z",
      },
      {
        id: "note-2",
        title: "Second",
        content: "Second body",
        createdAt: "2026-04-16T10:00:00.000Z",
        updatedAt: "2026-04-16T10:00:00.000Z",
      },
    ]),
    {
      selectedId: "note-1",
      selectedNote: {
        id: "note-1",
        title: "",
        content: "First",
        createdAt: "2026-04-17T10:00:00.000Z",
        updatedAt: "2026-04-17T10:00:00.000Z",
      },
    },
  );
  assert.deepEqual(buildWorkspaceSelectionState([]), {
    selectedId: null,
    selectedNote: null,
  });
});

test("getSelectionAfterDelete chooses the next note, then previous, then null", () => {
  assert.equal(
    getSelectionAfterDelete(
      [
        { id: "note-1", updatedAt: "2026-04-17T10:00:00.000Z" },
        { id: "note-2", updatedAt: "2026-04-16T10:00:00.000Z" },
        { id: "note-3", updatedAt: "2026-04-15T10:00:00.000Z" },
      ],
      "note-2",
    ),
    "note-3",
  );
  assert.equal(
    getSelectionAfterDelete(
      [
        { id: "note-1", updatedAt: "2026-04-17T10:00:00.000Z" },
        { id: "note-2", updatedAt: "2026-04-16T10:00:00.000Z" },
      ],
      "note-2",
    ),
    "note-1",
  );
  assert.equal(
    getSelectionAfterDelete(
      [{ id: "note-1", updatedAt: "2026-04-17T10:00:00.000Z" }],
      "note-1",
    ),
    null,
  );
});

test("account-linking migration creates users and user identities with merge-ready fields", () => {
  const migration = fs.readFileSync(
    path.join(
      process.cwd(),
      "worker",
      "migrations",
      "0002_account_linking.sql",
    ),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS users/i);
  assert.match(migration, /display_name TEXT NOT NULL/i);
  assert.match(migration, /primary_email TEXT/i);
  assert.match(migration, /status TEXT NOT NULL/i);
  assert.match(migration, /merged_into_user_id TEXT/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS user_identities/i);
  assert.match(migration, /provider_user_id TEXT NOT NULL/i);
  assert.match(migration, /email_verified INTEGER/i);
  assert.match(
    migration,
    /UNIQUE\s*\(\s*provider\s*,\s*provider_user_id\s*\)/i,
  );
  assert.match(migration, /UNIQUE\s*\(\s*user_id\s*,\s*provider\s*\)/i);
  assert.match(migration, /UPDATE notes SET user_id =/i);
});
