import { requestJson } from "../../../platform/api/client.ts";
import type {
  Note,
  NoteInput,
  NoteResponse,
  NotesListResponse,
} from "../types/notes.ts";

export async function fetchNotes() {
  const payload = await requestJson<NotesListResponse>("/api/notes");
  return payload.notes;
}

export async function fetchNote(noteId: string) {
  const payload = await requestJson<NoteResponse>(`/api/notes/${noteId}`);
  return payload.note;
}

export async function createNote(input: NoteInput) {
  const payload = await requestJson<NoteResponse>("/api/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.note;
}

export async function updateNote(noteId: string, input: NoteInput) {
  const payload = await requestJson<NoteResponse>(`/api/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return payload.note;
}

export async function deleteNote(noteId: string) {
  await requestJson<{ ok: true }>(`/api/notes/${noteId}`, {
    method: "DELETE",
  });
}

export function upsertNote(notes: Note[], note: Note) {
  const existingIndex = notes.findIndex((entry) => entry.id === note.id);

  if (existingIndex === -1) {
    return [note, ...notes].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  const nextNotes = [...notes];
  nextNotes[existingIndex] = note;
  return nextNotes.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}
