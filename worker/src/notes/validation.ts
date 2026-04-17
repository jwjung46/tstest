import type { NoteInput } from "./types.ts";

export const EMPTY_NOTE_MESSAGE = "Add some note content before saving.";

export function normalizeNoteInput(input: NoteInput): NoteInput {
  return {
    title: input.title.trim(),
    content: input.content,
  };
}

export function validateNoteInput(input: NoteInput) {
  const trimmedTitle = input.title.trim();
  const trimmedContent = input.content.trim();

  if (!trimmedTitle && !trimmedContent) {
    return {
      ok: false as const,
      message: EMPTY_NOTE_MESSAGE,
    };
  }

  return {
    ok: true as const,
  };
}
