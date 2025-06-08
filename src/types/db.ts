// Base document interface that all documents must implement
export interface BaseDocument {
  _id: string;
  _rev?: string;
  [key: string]: any;
}

// PouchDB document type
export type PouchDBDocument = {
  _id: string;
  _rev?: string;
  [key: string]: any;
};

// Changes response type
export interface ChangesResponse<T> {
  id: string;
  changes: Array<{ rev: string }>;
  doc?: T;
  deleted?: boolean;
  seq?: any;
}

// Sync response type
export interface SyncResponse<T = any> {
  // Standard event emitter methods
  addListener(event: string, listener: (...args: any[]) => void): void;
  on(event: string, listener: (...args: any[]) => void): void;
  once(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  removeAllListeners(event?: string | symbol): void;
  cancel(): void;
  
  // PouchDB specific methods and events
  on(event: 'change', handler: (info: any) => void): void;
  on(event: 'paused', handler: (info: any) => void): void;
  on(event: 'active', handler: () => void): void;
  on(event: 'denied', handler: (info: any) => void): void;
  on(event: 'complete', handler: (info: any) => void): void;
  on(event: 'error', handler: (error: any) => void): void;
}

// Simplified database interface with only the methods we need
export interface Database<T extends PouchDBDocument = PouchDBDocument> {
  // Core methods
  get(docId: string): Promise<T>;
  put(doc: Partial<T> & { _id: string; _rev?: string }): Promise<T & { _id: string; _rev: string }>;
  remove(doc: T | string, rev?: string): Promise<{ ok: boolean; id: string; rev: string }>;
  
  // Query methods
  find(request: any): Promise<{ docs: T[] }>;
  
  // Changes feed
  changes(options?: any): {
    on: (event: 'change' | 'complete' | 'error', handler: (change: ChangesResponse<T>) => void) => void;
    off: (event: 'change' | 'complete' | 'error', handler: (change: ChangesResponse<T>) => void) => void;
    cancel: () => void;
  };
  
  // Destroy database
  destroy(): Promise<void>;
  
  // Index management
  createIndex(options: {
    index: {
      fields: string[];
      ddoc?: string;
      name?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }): Promise<any>;
  
  // Replication
  sync(remoteDb: string | Database<any>, options?: any): SyncResponse<T>;
  
  // Info about the database
  info(): Promise<{ 
    db_name: string; 
    doc_count: number; 
    update_seq: number | string;
    instance_start_time?: string;
    disk_format_version?: number;
    update_seq_interval?: number;
    [key: string]: any;
  }>;
}

// Type guard to check if an object is a Database
export function isDatabase(obj: any): obj is Database {
  return (
    obj && 
    typeof obj.get === 'function' &&
    typeof obj.put === 'function' &&
    typeof obj.remove === 'function' &&
    typeof obj.find === 'function' &&
    typeof obj.changes === 'function' &&
    typeof obj.destroy === 'function' &&
    typeof obj.sync === 'function' &&
    typeof obj.info === 'function'
  );
}
