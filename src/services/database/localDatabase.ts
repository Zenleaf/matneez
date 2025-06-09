import * as TE from 'fp-ts/TaskEither';
import type { Database, BaseDocument, PouchDBDocument, SyncResponse, ChangesResponse } from '../../types/db';
import type { NoteDocument } from '../../types/note';

// Global PouchDB declaration
declare global {
  interface Window {
    PouchDB: {
      new<T extends PouchDBDocument = PouchDBDocument>(name?: string, options?: any): Database<T>;
      plugin(plugin: any): void;
    };
  }
}

// Get PouchDB from window or throw if not available
const getPouchDB = () => {
  if (typeof window === 'undefined') {
    throw new Error('PouchDB can only be used in the browser');
  }
  
  if (!window.PouchDB) {
    throw new Error('PouchDB is not available. Make sure it is properly loaded via CDN.');
  }
  
  return window.PouchDB;
};

// Define the change event type
interface LocalChangesResponse<T> {
  id: string;
  changes: Array<{ rev: string }>;
  doc?: T;
  deleted?: boolean;
}

// Factory to create a new PouchDB instance
export const createLocalDb = <T extends Record<string, any>>(
  dbName: string
): Database<T & PouchDBDocument> => {
  const PouchDB = getPouchDB();
  
  // Create the database instance
  const db = new PouchDB<T & BaseDocument>(dbName);

  // Return a properly typed database interface
  return {
    get: (id: string) => db.get(id).then(doc => ({
      ...doc,
      _id: doc._id,
      _rev: doc._rev || ''
    })),
    
    // Create an index for querying
    // Note: PouchDB Find plugin may show deprecation warnings for db.type() 
    // This is a known issue with the plugin itself, not our code
    createIndex: (options: {
      index: {
        fields: string[];
        ddoc?: string;
        name?: string;
        [key: string]: any;
      };
      [key: string]: any;
    }) => {
      return db.createIndex(options);
    },
    
    put: async (doc: Partial<T & BaseDocument> & { _id: string; _rev?: string }) => {
      const result = await db.put({
        ...doc,
        _id: doc._id,
        _rev: doc._rev
      });
      return {
        ...doc as T & BaseDocument,
        _id: result.id,
        _rev: result.rev
      };
    },
    
    remove: async (doc: (T & BaseDocument) | string, rev?: string) => {
      if (typeof doc === 'string') {
        if (!rev) {
          const existingDoc = await db.get(doc);
          rev = existingDoc._rev;
        }
        return db.remove(doc, rev!);
      }
      return db.remove(doc);
    },
    
    find: async (request: any) => {
      const result = await db.find(request);
      return {
        docs: result.docs.map(doc => ({
          ...doc,
          _id: doc._id,
          _rev: doc._rev || ''
        }))
      };
    },
    
    changes: (options: any = {}) => {
      const changes = db.changes({
        ...options,
        include_docs: true,
        live: options.live || false,
        since: options.since || 'now'
      });
      
      const handlers: Record<string, ((change: LocalChangesResponse<any>) => void)[]> = {};
      
      const changesResponse = {
        on: (event: 'change' | 'complete' | 'error', handler: (change: LocalChangesResponse<any>) => void) => {
          if (!handlers[event]) {
            handlers[event] = [];
          }
          handlers[event].push(handler);
          changes.on(event, handler);
        },
        off: (event: 'change' | 'complete' | 'error', handler: (change: LocalChangesResponse<any>) => void) => {
          if (handlers[event]) {
            const index = handlers[event].indexOf(handler);
            if (index > -1) {
              handlers[event].splice(index, 1);
            }
            changes.off(event, handler);
          }
        },
        cancel: () => changes.cancel()
      };
      
      return changesResponse;
    },
    
    sync: (remoteDb: string | Database<any>, options: any = {}) => {
      const sync = db.sync(remoteDb, {
        live: true,
        retry: true,
        ...options
      });

      const handlers: Record<string, Array<(info: any) => void>> = {};

      const syncResponse: SyncResponse<any> = {
        addListener: (event: string, handler: (info: any) => void) => {
          if (!handlers[event]) handlers[event] = [];
          handlers[event].push(handler);
          sync.on(event, handler);
        },
        on: (event: string, handler: (info: any) => void) => {
          if (!handlers[event]) handlers[event] = [];
          handlers[event].push(handler);
          sync.on(event, handler);
        },
        once: (event: string, handler: (info: any) => void) => {
          const onceHandler = (info: any) => {
            handler(info);
            sync.off(event, onceHandler);
          };
          sync.on(event, onceHandler);
        },
        removeListener: (event: string, handler: (info: any) => void) => {
          if (handlers[event]) {
            const index = handlers[event].indexOf(handler);
            if (index > -1) {
              handlers[event].splice(index, 1);
            }
          }
          sync.off(event, handler);
        },
        off: (event: string, handler: (info: any) => void) => {
          if (handlers[event]) {
            const index = handlers[event].indexOf(handler);
            if (index > -1) {
              handlers[event].splice(index, 1);
            }
          }
          sync.off(event, handler);
        },
        removeAllListeners: (event?: string) => {
          if (event) {
            if (handlers[event]) {
              handlers[event].forEach(handler => {
                sync.off(event, handler);
              });
              delete handlers[event];
            }
          } else {
            Object.keys(handlers).forEach(event => {
              handlers[event].forEach(handler => {
                sync.off(event, handler);
              });
            });
            Object.keys(handlers).forEach(key => delete handlers[key]);
          }
        },
        cancel: () => {
          sync.cancel();
          Object.keys(handlers).forEach(key => delete handlers[key]);
        }
      };

      return syncResponse;
    },
    
    info: async () => {
      const info = await db.info();
      return {
        db_name: info.db_name,
        doc_count: info.doc_count,
        update_seq: typeof info.update_seq === 'string' ? 
          parseInt(info.update_seq, 10) || 0 : 
          info.update_seq || 0
      };
    },
    
    destroy: () => db.destroy()
  };
};

// Pure DB operations
export const getDocument = <T extends { _id: string; _rev?: string }>(
  db: Database<T>
) => (id: string): Promise<T> => db.get(id);

export const saveDocument = <T extends { _id: string; _rev?: string }>(
  db: Database<T>
) => (doc: T): Promise<any> => db.put(doc);

export const deleteDocument = <T extends { _id: string; _rev?: string }>(
  db: Database<T>
) => (doc: T): Promise<any> => db.remove(doc);

export const queryDocumentsByType = <T extends { _id: string; _rev?: string }>(
  db: Database<T>
) => (type: string, options: any = {}): Promise<T[]> =>
  db.find({
    selector: { type, ...(options.selector || {}) },
    sort: options.sort || [{ updatedAt: 'desc' }],
    limit: options.limit || 1000,
    ...options
  }).then((result: any) => result.docs);

export const destroyDatabase = <T extends { _id: string; _rev?: string }>(
  db: Database<T>
): Promise<void> => db.destroy();

export const listenToChanges = <T extends { _id: string; _rev?: string }>(
  db: Database<T>
) => (
  onChange: (change: ChangesResponse<T>) => void
): TE.TaskEither<Error, () => void> => {
  return TE.tryCatch(
    async () => {
      try {
        const changes = db.changes({
          since: 'now',
          live: true,
          include_docs: true
        });
        
        changes.on('change', (change: any) => {
          // Forward the change to the provided onChange handler
          const changeEvent: ChangesResponse<T> = {
            id: change.id,
            changes: change.changes,
            doc: change.doc,
            deleted: change.deleted
          };
          onChange(changeEvent);
        });
        
        return () => {
          if ('off' in changes) {
            (changes as any).off('change', onChange);
          }
          if ('cancel' in changes) {
            (changes as any).cancel();
          }
        };
      } catch (error) {
        throw error;
      }
    },
    (error) => new Error(
      error instanceof Error ? error.message : 'Failed to listen to changes'
    )
  );
};
