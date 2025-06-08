// This file contains type declarations for global variables

// PouchDB types
declare namespace PouchDB {
  interface Database<Content extends {} = {}> {
    put(doc: any): Promise<any>;
    get(id: string): Promise<any>;
    remove(doc: any): Promise<any>;
    allDocs(options?: any): Promise<any>;
    destroy(): Promise<void>;
    createIndex(options: any): Promise<any>;
    find(request: any): Promise<any>;
    changes(options?: any): any;
  }
}

declare const PouchDB: {
  new<Content extends {} = {}>(name?: string, options?: any): PouchDB.Database<Content>;
  plugin(plugin: any): void;
};

declare global {
  interface Window {
    PouchDB: typeof PouchDB;
  }
  const PouchDB: typeof PouchDB;
}
