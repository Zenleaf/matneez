import { TaskEither, tryCatch, right, left, chain, map } from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import type { NoteDocument, NoteInput } from '../../types/note';
import type { Database } from './db.fp';

const isNote = (doc: any): doc is NoteDocument => doc && doc.type === 'note';

const ensureNote = (doc: any): TaskEither<Error, NoteDocument> =>
  isNote(doc) ? right(doc) : left(new Error('Document is not a note'));

export const createNotesServiceFp = (db: Database<NoteDocument>) => {
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

  const getAll = (): TaskEither<Error, NoteDocument[]> =>
    pipe(
      tryCatch(() => db.find({
        selector: { type: 'note' },
        sort: [{ updatedAt: 'desc' }],
        limit: 1000,
      }), (e) => e as Error),
      map((res: { docs: NoteDocument[] }) => res.docs)
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

  return {
    create,
    get,
    getAll,
    update,
    remove,
  };
};
