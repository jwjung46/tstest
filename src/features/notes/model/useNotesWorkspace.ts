import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../platform/api/client.ts";
import type { Note, NoteInput } from "../types/notes.ts";
import {
  deleteNote,
  fetchNotes,
  updateNote,
  createNote,
  upsertNote,
} from "../services/notes-api.ts";
import {
  getDefaultSelectedNoteId,
  getSelectionAfterDelete,
} from "./note-state.ts";
import { validateNoteInput } from "./note-validation.ts";

type Draft =
  | {
      mode: "existing";
      noteId: string;
      title: string;
      content: string;
      initialTitle: string;
      initialContent: string;
    }
  | {
      mode: "new";
      noteId: null;
      title: string;
      content: string;
      initialTitle: "";
      initialContent: "";
    };

function createDraftFromNote(note: Note): Draft {
  return {
    mode: "existing",
    noteId: note.id,
    title: note.title,
    content: note.content,
    initialTitle: note.title,
    initialContent: note.content,
  };
}

function createNewDraft(): Draft {
  return {
    mode: "new",
    noteId: null,
    title: "",
    content: "",
    initialTitle: "",
    initialContent: "",
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

export function useNotesWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [listStatus, setListStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<{
    status: "idle" | "saving" | "error";
    message: string | null;
  }>({
    status: "idle",
    message: null,
  });
  const [deleteState, setDeleteState] = useState<{
    status: "idle" | "deleting" | "error";
    message: string | null;
  }>({
    status: "idle",
    message: null,
  });

  useEffect(() => {
    let isActive = true;

    async function load() {
      setListStatus("loading");
      setListError(null);

      try {
        const loadedNotes = await fetchNotes();

        if (!isActive) {
          return;
        }

        setNotes(loadedNotes);
        setListStatus("ready");

        const nextSelectedId = getDefaultSelectedNoteId(loadedNotes);
        setSelectedId(nextSelectedId);
        setDraft(
          nextSelectedId
            ? createDraftFromNote(
                loadedNotes.find((note) => note.id === nextSelectedId)!,
              )
            : null,
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setListStatus("error");
        setListError(
          getErrorMessage(error, "Your notes could not be loaded right now."),
        );
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  const selectedNote = useMemo(
    () =>
      selectedId
        ? (notes.find((note) => note.id === selectedId) ?? null)
        : null,
    [notes, selectedId],
  );
  const isDirty = draft
    ? draft.title !== draft.initialTitle ||
      draft.content !== draft.initialContent
    : false;
  const validation = draft
    ? validateNoteInput({
        title: draft.title,
        content: draft.content,
      })
    : { ok: true as const };

  function shouldDiscardDraft() {
    return !isDirty || window.confirm("Discard your unsaved note changes?");
  }

  function openNote(noteId: string) {
    if (noteId === selectedId) {
      return;
    }

    if (!shouldDiscardDraft()) {
      return;
    }

    const note = notes.find((entry) => entry.id === noteId);

    if (!note) {
      return;
    }

    setSelectedId(note.id);
    setDraft(createDraftFromNote(note));
    setSaveState({
      status: "idle",
      message: null,
    });
    setDeleteState({
      status: "idle",
      message: null,
    });
  }

  function startNewNote() {
    if (!shouldDiscardDraft()) {
      return;
    }

    setSelectedId(null);
    setDraft(createNewDraft());
    setSaveState({
      status: "idle",
      message: null,
    });
    setDeleteState({
      status: "idle",
      message: null,
    });
  }

  function updateDraft(patch: Partial<NoteInput>) {
    setDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            ...patch,
          }
        : currentDraft,
    );
    setSaveState({
      status: "idle",
      message: null,
    });
  }

  async function retryLoad() {
    setListStatus("loading");
    setListError(null);

    try {
      const loadedNotes = await fetchNotes();
      setNotes(loadedNotes);
      setListStatus("ready");

      const nextSelectedId = getDefaultSelectedNoteId(loadedNotes);
      setSelectedId(nextSelectedId);
      setDraft(
        nextSelectedId
          ? createDraftFromNote(
              loadedNotes.find((note) => note.id === nextSelectedId)!,
            )
          : null,
      );
    } catch (error) {
      setListStatus("error");
      setListError(
        getErrorMessage(error, "Your notes could not be loaded right now."),
      );
    }
  }

  async function saveDraft() {
    if (!draft) {
      return;
    }

    const currentInput = {
      title: draft.title,
      content: draft.content,
    };
    const currentValidation = validateNoteInput(currentInput);

    if (!currentValidation.ok) {
      setSaveState({
        status: "error",
        message: currentValidation.error,
      });
      return;
    }

    setSaveState({
      status: "saving",
      message: null,
    });

    try {
      const savedNote =
        draft.mode === "new"
          ? await createNote(currentInput)
          : await updateNote(draft.noteId, currentInput);

      setNotes((currentNotes) => upsertNote(currentNotes, savedNote));
      setSelectedId(savedNote.id);
      setDraft(createDraftFromNote(savedNote));
      setSaveState({
        status: "idle",
        message: null,
      });
    } catch (error) {
      setSaveState({
        status: "error",
        message: getErrorMessage(error, "Your note could not be saved."),
      });
    }
  }

  async function deleteSelectedNote() {
    if (!draft || draft.mode !== "existing") {
      return;
    }

    const confirmed = window.confirm("Delete this note permanently?");

    if (!confirmed) {
      return;
    }

    setDeleteState({
      status: "deleting",
      message: null,
    });

    try {
      await deleteNote(draft.noteId);

      const nextSelectedId = getSelectionAfterDelete(notes, draft.noteId);
      const remainingNotes = notes.filter((note) => note.id !== draft.noteId);
      const nextSelectedNote = nextSelectedId
        ? (remainingNotes.find((note) => note.id === nextSelectedId) ?? null)
        : null;

      setNotes(remainingNotes);
      setSelectedId(nextSelectedId);
      setDraft(nextSelectedNote ? createDraftFromNote(nextSelectedNote) : null);
      setDeleteState({
        status: "idle",
        message: null,
      });
      setSaveState({
        status: "idle",
        message: null,
      });
    } catch (error) {
      setDeleteState({
        status: "error",
        message: getErrorMessage(error, "Your note could not be deleted."),
      });
    }
  }

  return {
    notes,
    selectedId,
    selectedNote,
    draft,
    listStatus,
    listError,
    saveState,
    deleteState,
    isDirty,
    validation,
    openNote,
    startNewNote,
    updateDraft,
    retryLoad,
    saveDraft,
    deleteSelectedNote,
  };
}
