import * as R from 'ramda';
import { TaskEither, tryCatch, right, left, chain, map } from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import type { NoteDocument, NoteInput } from '../../types/note';
import type { Database } from '../../types/db';

// Helper functions
const isNote = (doc: any): doc is NoteDocument => doc && doc.type === 'note';

const ensureNote = (doc: any): TaskEither<Error, NoteDocument> =>
  isNote(doc) ? right(doc) : left(new Error('Document is not a note'));

// Factory for functional notes service
export const createNotesService = (db: Database) => {
  // Create index for sorting by updatedAt
  const initializeIndexes = async () => {
    try {
      await db.createIndex({
        index: {
          fields: ['type', 'updatedAt'],
          ddoc: 'idx-type-updatedAt',
          name: 'type-updatedAt-index'
        }
      });
    } catch (error) {
      console.warn('Failed to create index:', error);
    }
  };
  
  // Initialize indexes
  initializeIndexes();
  const create = (data: NoteInput): TaskEither<Error, NoteDocument> => {
    const now = new Date().toISOString();
    const noteId = data._id || `note_${Date.now()}`;
    const noteDoc: Omit<NoteDocument, '_rev'> & { _id: string } = {
      ...data,
      _id: noteId,
      title: data.title || '',
      content: data.content || '',
      type: 'note',
      createdAt: data.createdAt || now,
      updatedAt: now,
      tags: data.tags || [],
    };
    return pipe(
      tryCatch(
        () => db.put(noteDoc) as Promise<NoteDocument>,
        (e) => e as Error
      ),
      chain(() => tryCatch(() => db.get(noteId) as Promise<NoteDocument>, (e) => e as Error)),
      chain(ensureNote)
    );
  };

  const get = (id: string): TaskEither<Error, NoteDocument> =>
    pipe(
      tryCatch(() => db.get(id), (e) => e as Error),
      chain(ensureNote)
    );

  const list = (): TaskEither<Error, NoteDocument[]> =>
    pipe(
      tryCatch<Error, { docs: Array<Record<string, any>> }>(
        async () => {
          // Ensure the index exists before querying
          await db.createIndex({
            index: {
              fields: ['type', 'updatedAt'],
              ddoc: 'idx-type-updatedAt',
              name: 'type-updatedAt-index'
            }
          });
          
          return db.find({
            selector: { 
              type: 'note',
              updatedAt: { $exists: true }
            },
            sort: [{ type: 'desc' }, { updatedAt: 'desc' }],
            limit: 1000,
            use_index: 'idx-type-updatedAt'
          });
        },
        (e) => {
          console.error('Error in list notes:', e);
          return e as Error;
        }
      ),
      map((res) => res.docs.filter(isNote))
    );

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

  const subscribe = (onChange: (change: any) => void) => {
    const changes = db.changes({ since: 'now', live: true, include_docs: true });
    changes.on('change', onChange);
    return () => changes.cancel();
  };

  return {
    create,
    get,
    list,
    update,
    remove,
    subscribe,
  };
};
