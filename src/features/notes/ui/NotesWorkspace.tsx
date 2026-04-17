import NoteEditor from "./NoteEditor.tsx";
import NotesList from "./NotesList.tsx";
import { useNotesWorkspace } from "../model/useNotesWorkspace.ts";

export default function NotesWorkspace() {
  const workspace = useNotesWorkspace();

  return (
    <div className="notes-workspace">
      <NotesList
        errorMessage={
          workspace.listStatus === "error" ? workspace.listError : null
        }
        isLoading={workspace.listStatus === "loading"}
        notes={workspace.notes}
        onCreate={workspace.startNewNote}
        onRetry={workspace.retryLoad}
        onSelect={workspace.openNote}
        selectedId={workspace.selectedId}
      />

      <NoteEditor
        deleteState={workspace.deleteState}
        draft={workspace.draft}
        hasNotes={workspace.notes.length > 0}
        isDirty={workspace.isDirty}
        onChange={workspace.updateDraft}
        onCreate={workspace.startNewNote}
        onDelete={workspace.deleteSelectedNote}
        onSave={workspace.saveDraft}
        saveState={workspace.saveState}
        selectedUpdatedAt={workspace.selectedNote?.updatedAt ?? null}
        validationMessage={
          workspace.validation.ok ? null : workspace.validation.error
        }
      />
    </div>
  );
}
