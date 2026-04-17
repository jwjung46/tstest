import type { NoteInput } from "../types/notes.ts";

const EMPTY_NOTE_MESSAGE = "Add some note content before saving.";

export function validateNoteInput(input: NoteInput) {
  const trimmedTitle = input.title.trim();
  const trimmedContent = input.content.trim();

  if (!trimmedTitle && !trimmedContent) {
    return {
      ok: false as const,
      error: EMPTY_NOTE_MESSAGE,
    };
  }

  return {
    ok: true as const,
  };
}

export function canSaveNoteDraft(input: NoteInput) {
  return validateNoteInput(input).ok;
}
