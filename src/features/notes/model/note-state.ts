import type { Note } from "../types/notes.ts";

type SelectableNote = Pick<Note, "id" | "updatedAt">;

export function sortNotesByUpdatedAtDesc<T extends SelectableNote>(notes: T[]) {
  return [...notes].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function getDefaultSelectedNoteId(notes: SelectableNote[]) {
  return notes[0]?.id ?? null;
}

export function buildWorkspaceSelectionState(notes: Note[]) {
  const selectedId = getDefaultSelectedNoteId(notes);
  const selectedNote = selectedId
    ? (notes.find((note) => note.id === selectedId) ?? null)
    : null;

  return {
    selectedId,
    selectedNote,
  };
}

export function getSelectionAfterDelete(
  notes: SelectableNote[],
  deletedId: string,
) {
  const index = notes.findIndex((note) => note.id === deletedId);

  if (index === -1) {
    return getDefaultSelectedNoteId(notes);
  }

  return notes[index + 1]?.id ?? notes[index - 1]?.id ?? null;
}

export function getDisplayTitle(title: string) {
  return title.trim() || "Untitled";
}

export function getNotePreview(content: string) {
  const preview = content.replace(/\s+/g, " ").trim();
  return preview || "No content yet.";
}
