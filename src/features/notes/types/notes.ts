export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteInput = {
  title: string;
  content: string;
};

export type NotesListResponse = {
  notes: Note[];
};

export type NoteResponse = {
  note: Note;
};
