/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COUCHDB_URL: string;
  readonly VITE_COUCHDB_USERNAME: string;
  readonly VITE_COUCHDB_PASSWORD: string;
  readonly VITE_COUCHDB_DATABASE: string;
  readonly VITE_SYNC_ENABLED: string;
  readonly VITE_SYNC_INTERVAL: string;
  [key: string]: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
