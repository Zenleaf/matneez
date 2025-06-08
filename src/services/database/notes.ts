import { TaskEither, tryCatch, right, left, chain, map } from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import type { NoteDocument, NoteInput } from '../../types/note';
import type { Database } from './db.fp';

// Extended PouchDB interface to include methods we need
interface PouchDBExtended<T> extends Omit<Database<T>, 'find'> {
  allDocs(options?: { include_docs?: boolean }): Promise<{
    total_rows: number;
    offset: number;
    rows: Array<{
      id: string;
      key: string;
      value: { rev: string };
      doc?: T;
    }>;
  }>;
  createIndex?(options: { index: { fields: string[] } }): Promise<any>;
  find?(options: { selector: any; sort?: any[]; limit?: number }): Promise<{ docs: T[] }>;
}

const isNote = (doc: any): doc is NoteDocument => doc && doc.type === 'note';

const ensureNote = (doc: any): TaskEither<Error, NoteDocument> =>
  isNote(doc) ? right(doc) : left(new Error('Document is not a note'));

export const createNotesServiceFp = (db: Database<NoteDocument>) => {
  // Cast to extended PouchDB type
  const pouchDb = db as PouchDBExtended<NoteDocument>;
  const create = (data: NoteInput): TaskEither<Error, NoteDocument> => {
    const now = new Date().toISOString();
    const noteId = data._id || `note_${Date.now()}`;
    const noteDoc: NoteDocument = {
      ...data,
      _id: noteId,
      title: data.title || '',
      content: data.content || '',
      type: 'note',
      createdAt: now,
      updatedAt: now,
    } as NoteDocument;
    return pipe(
    tryCatch(() => db.put(noteDoc), (e) => e as Error),
    chain(() => tryCatch(() => db.get(noteId), (e) => e as Error)),
    chain(ensureNote)
  );
  };

  const get = (id: string): TaskEither<Error, NoteDocument> =>
    pipe(
      tryCatch(() => db.get(id), (e) => e as Error),
      chain(ensureNote)
    );

  // Simplified getAll implementation that works with or without indexes
  const getAll = (): TaskEither<Error, NoteDocument[]> => {
    // Use allDocs as a reliable fallback that doesn't require indexes
    return pipe(
      tryCatch(() => {
        return pouchDb.allDocs({ include_docs: true });
      }, (e) => e as Error),
      map((result) => {
        // Filter and sort the documents manually
        return result.rows
          .map(row => row.doc as NoteDocument)
          .filter(doc => doc && doc.type === 'note')
          .sort((a, b) => {
            const dateA = new Date(a.updatedAt || 0).getTime();
            const dateB = new Date(b.updatedAt || 0).getTime();
            return dateB - dateA; // descending order (newest first)
          });
      })
    );
  };
  
  // Helper method for tests to create index
  const createIndex = (): TaskEither<Error, any> => {
    if (!pouchDb.createIndex) {
      return right(null); // No-op if createIndex doesn't exist
    }
    
    return tryCatch(() => {
      const createIndexFn = pouchDb.createIndex as (options: { index: { fields: string[] } }) => Promise<any>;
      return createIndexFn({
        index: { fields: ['updatedAt', 'type'] }
      });
    }, (e) => e as Error);
  };

  const update = (id: string, updates: Partial<NoteInput>): TaskEither<Error, NoteDocument> =>
    pipe(
      get(id),
      map((doc: NoteDocument) => ({
        ...doc,
        ...updates,
        updatedAt: new Date().toISOString(),
      })),
      chain((updatedDoc: NoteDocument) =>
        pipe(
          tryCatch(() => db.put(updatedDoc), (e) => e as Error),
          chain(() => get(id))
        )
      )
    );

  const remove = (id: string): TaskEither<Error, void> =>
    pipe(
      get(id),
      chain((doc: NoteDocument) => tryCatch(() => db.remove(doc), (e) => e as Error)),
      map(() => undefined)
    );

  return {
    create,
    get,
    getAll,
    update,
    remove,
    createIndex, // Export the createIndex method for tests
  };
};
