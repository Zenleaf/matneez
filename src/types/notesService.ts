import { TaskEither } from 'fp-ts/TaskEither';
import { NoteDocument, NoteInput } from './note';

// Define the return type of the createNotesService function
export interface ReturnTypeCreateNotesService {
  create: (data: NoteInput) => TaskEither<Error, NoteDocument>;
  get: (id: string) => TaskEither<Error, NoteDocument>;
  list: () => TaskEither<Error, NoteDocument[]>;
  update: (id: string, updates: Partial<NoteInput>) => TaskEither<Error, NoteDocument>;
  remove: (id: string) => TaskEither<Error, void>;
  subscribe: (onChange: (change: any) => void) => () => void;
}
