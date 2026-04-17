import EmptyState from "../../../shared/ui/EmptyState.tsx";
import { formatNoteTimestamp } from "../lib/note-format.ts";
import { getDisplayTitle } from "../model/note-state.ts";
import type { NoteInput } from "../types/notes.ts";

type NoteEditorProps = {
  hasNotes: boolean;
  draft:
    | (NoteInput & {
        mode: "new" | "existing";
        noteId: string | null;
      })
    | null;
  selectedUpdatedAt?: string | null;
  isDirty: boolean;
  validationMessage: string | null;
  saveState: {
    status: "idle" | "saving" | "error";
    message: string | null;
  };
  deleteState: {
    status: "idle" | "deleting" | "error";
    message: string | null;
  };
  onChange: (patch: Partial<NoteInput>) => void;
  onSave: () => void;
  onDelete: () => void;
  onCreate: () => void;
};

export default function NoteEditor({
  hasNotes,
  draft,
  selectedUpdatedAt,
  isDirty,
  validationMessage,
  saveState,
  deleteState,
  onChange,
  onSave,
  onDelete,
  onCreate,
}: NoteEditorProps) {
  if (!draft) {
    return (
      <EmptyState
        eyebrow="Editor"
        title="No note selected"
        description={
          hasNotes
            ? "Choose a note from the list or start a new one."
            : "Your note editor will appear here after you create the first note."
        }
      />
    );
  }

  return (
    <section className="notes-pane notes-editor">
      <div className="notes-pane__header">
        <div>
          <p className="eyebrow">Editor</p>
          <h2 className="notes-pane__title">
            {draft.mode === "new" ? "New note" : getDisplayTitle(draft.title)}
          </h2>
          {draft.mode === "existing" && selectedUpdatedAt ? (
            <p className="hint">
              Last updated {formatNoteTimestamp(selectedUpdatedAt)}
            </p>
          ) : (
            <p className="hint">Manual save only.</p>
          )}
        </div>
        <div className="notes-editor__actions">
          <button
            className="notes-button notes-button--primary"
            disabled={
              saveState.status === "saving" || deleteState.status === "deleting"
            }
            onClick={onSave}
            type="button"
          >
            {saveState.status === "saving" ? "Saving..." : "Save"}
          </button>
          {draft.mode === "existing" ? (
            <button
              className="notes-button notes-button--danger"
              disabled={
                saveState.status === "saving" ||
                deleteState.status === "deleting"
              }
              onClick={onDelete}
              type="button"
            >
              {deleteState.status === "deleting" ? "Deleting..." : "Delete"}
            </button>
          ) : (
            <button className="notes-button" onClick={onCreate} type="button">
              Reset
            </button>
          )}
        </div>
      </div>

      <label className="notes-field">
        <span className="notes-field__label">Title</span>
        <input
          className="notes-field__control"
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="Untitled"
          type="text"
          value={draft.title}
        />
      </label>

      <label className="notes-field notes-field--editor">
        <span className="notes-field__label">Content</span>
        <textarea
          className="notes-field__control notes-field__control--textarea"
          onChange={(event) => onChange({ content: event.target.value })}
          placeholder="Write your note here"
          value={draft.content}
        />
      </label>

      <div className="notes-status-stack" aria-live="polite">
        {validationMessage ? (
          <p className="notes-feedback notes-feedback--error">
            {validationMessage}
          </p>
        ) : null}
        {saveState.status === "error" && saveState.message ? (
          <p className="notes-feedback notes-feedback--error">
            {saveState.message}
          </p>
        ) : null}
        {deleteState.status === "error" && deleteState.message ? (
          <p className="notes-feedback notes-feedback--error">
            {deleteState.message}
          </p>
        ) : null}
        {!validationMessage && saveState.status === "idle" ? (
          <p className="hint">
            {isDirty ? "You have unsaved changes." : "No unsaved changes."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
