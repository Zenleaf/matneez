/**
 * Configuration module that centralizes all environment variables
 * and provides defaults for development environments
 */

// Local PouchDB configuration
export const LOCAL_DB = {
  name: 'cogneez_notes_local',
};

// Remote CouchDB configuration
export const REMOTE_DB = {
  url: import.meta.env.VITE_COUCHDB_URL || 'http://localhost:5984',
  username: import.meta.env.VITE_COUCHDB_USERNAME,
  password: import.meta.env.VITE_COUCHDB_PASSWORD,
  dbName: import.meta.env.VITE_COUCHDB_DATABASE || 'cogneez_notes',
};

// Sync configuration
export const SYNC_CONFIG = {
  enabled: import.meta.env.VITE_SYNC_ENABLED === 'true',
  interval: parseInt(import.meta.env.VITE_SYNC_INTERVAL || '30000', 10),
  live: true,
  retry: true,
};

// Feature flags
export const FEATURES = {
  multipleNotes: false, // Future feature: support multiple notes
};

// App metadata
export const APP_META = {
  version: '0.1.0',
};
