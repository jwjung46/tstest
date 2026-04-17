import type { Note, NoteInput, NoteRecord } from "./types.ts";

function mapNoteRecord(record: NoteRecord): Note {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function listNotes(
  db: D1Database,
  userId: string,
): Promise<Note[]> {
  const result = await db
    .prepare(
      "SELECT id, user_id, title, content, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
    )
    .bind(userId)
    .all<NoteRecord>();

  return result.results.map(mapNoteRecord);
}

export async function getNoteById(
  db: D1Database,
  noteId: string,
  userId: string,
): Promise<Note | null> {
  const record = await db
    .prepare(
      "SELECT id, user_id, title, content, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?",
    )
    .bind(noteId, userId)
    .first<NoteRecord>();

  return record ? mapNoteRecord(record) : null;
}

export async function createNote(
  db: D1Database,
  userId: string,
  input: NoteInput,
  now: string,
): Promise<Note> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      "INSERT INTO notes (id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(id, userId, input.title, input.content, now, now)
    .run();

  return {
    id,
    title: input.title,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateNote(
  db: D1Database,
  noteId: string,
  userId: string,
  input: NoteInput,
  now: string,
): Promise<Note | null> {
  const result = await db
    .prepare(
      "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    )
    .bind(input.title, input.content, now, noteId, userId)
    .run();

  if (!result.meta.changes) {
    return null;
  }

  const note = await getNoteById(db, noteId, userId);
  return note;
}

export async function deleteNote(
  db: D1Database,
  noteId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM notes WHERE id = ? AND user_id = ?")
    .bind(noteId, userId)
    .run();

  return result.meta.changes > 0;
}
