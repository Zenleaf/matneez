export interface NoteDocument {
  _id: string;
  _rev: string;
  title: string;
  content: string;
  type: 'note';
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface NoteInput {
  _id?: string;
  title?: string;
  content?: string;
  type?: 'note';
  [key: string]: any;
}
