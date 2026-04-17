import { formatNoteTimestamp } from "../lib/note-format.ts";
import { getDisplayTitle, getNotePreview } from "../model/note-state.ts";
import type { Note } from "../types/notes.ts";

type NotesListProps = {
  notes: Note[];
  selectedId: string | null;
  onSelect: (noteId: string) => void;
  onCreate: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

export default function NotesList({
  notes,
  selectedId,
  onSelect,
  onCreate,
  isLoading,
  errorMessage,
  onRetry,
}: NotesListProps) {
  return (
    <section className="notes-pane notes-list-pane">
      <div className="notes-pane__header">
        <div>
          <p className="eyebrow">Notes</p>
          <h2 className="notes-pane__title">Your notes</h2>
        </div>
        <button
          className="notes-button notes-button--primary"
          onClick={onCreate}
          type="button"
        >
          New Note
        </button>
      </div>

      {isLoading ? (
        <div className="notes-feedback" role="status">
          Loading your notes...
        </div>
      ) : null}

      {errorMessage ? (
        <div className="notes-feedback notes-feedback--error" role="alert">
          <p>{errorMessage}</p>
          <button className="notes-button" onClick={onRetry} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !errorMessage && notes.length === 0 ? (
        <div className="notes-feedback">
          No notes yet. Create your first note to start writing.
        </div>
      ) : null}

      {!isLoading && !errorMessage && notes.length > 0 ? (
        <div className="notes-list" role="list" aria-label="Personal notes">
          {notes.map((note) => (
            <button
              className={`notes-list__item${selectedId === note.id ? " notes-list__item--selected" : ""}`}
              key={note.id}
              onClick={() => onSelect(note.id)}
              type="button"
            >
              <div className="notes-list__item-top">
                <strong>{getDisplayTitle(note.title)}</strong>
                <span>{formatNoteTimestamp(note.updatedAt)}</span>
              </div>
              <p>{getNotePreview(note.content)}</p>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
