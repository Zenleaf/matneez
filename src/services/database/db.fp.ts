import { TaskEither, tryCatch } from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

export interface Database<T> {
  get: (id: string) => Promise<T>;
  put: (doc: T) => Promise<any>;
  remove: (doc: T) => Promise<any>;
  find: (query: any) => Promise<{ docs: T[] }>;
  changes: (options: any) => any;
}

export const createDb = <T>(db: Database<T>) => ({
  get: (id: string): TaskEither<Error, T> => tryCatch(() => db.get(id), (e) => e as Error),
  put: (doc: T): TaskEither<Error, any> => tryCatch(() => db.put(doc), (e) => e as Error),
  remove: (doc: T): TaskEither<Error, void> => tryCatch(() => db.remove(doc), (e) => e as Error),
  find: (query: any): TaskEither<Error, T[]> => pipe(
    tryCatch(() => db.find(query), (e) => e as Error),
    TE.map((res: { docs: T[] }) => res.docs)
  ),
  changes: (options: any) => ({
    on: (event: string, callback: (change: any) => void) => {
      const changes = db.changes({ ...options, include_docs: true });
      changes.on(event, callback);
      return () => changes.cancel();
    }
  })
});

// Example usage:
/*
import PouchDB from 'pouchdb';
import { createDb } from './db.fp';

const db = createDb(new PouchDB('notes'));

db.get('note_123')
  .fork(
    error => console.error('Error:', error),
    doc => console.log('Document:', doc)
  );

db.put({ _id: 'note_123', title: 'Hello', content: 'World' })
  .fork(
    error => console.error('Error:', error),
    result => console.log('Saved:', result)
  );

const unsubscribe = db.changes({ since: 'now', live: true })
  .on('change', change => {
    console.log('Document changed:', change);
  });

// Later, to stop listening to changes
// unsubscribe();
*/
