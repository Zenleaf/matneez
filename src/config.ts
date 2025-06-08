/**
 * Application Configuration
 */

// Local database configuration
export const LOCAL_DB = {
  name: 'cogneez-notes',
  options: {
    auto_compaction: true,
    revs_limit: 100
  }
};

// Remote database configuration (for sync)
export const REMOTE_DB = {
  // If using environment variables, load them safely
  url: import.meta.env.VITE_COUCHDB_URL || '',
  auth: {
    username: import.meta.env.VITE_COUCHDB_USER || '',
    password: import.meta.env.VITE_COUCHDB_PASS || ''
  },
  options: {
    live: true,
    retry: true,
    heartbeat: 10000,
    timeout: 30000,
  }
};

// General application settings
export const APP_CONFIG = {
  title: 'Cogneez Notespace',
  version: '1.0.0',
  syncEnabled: true,
  autoSaveDelay: 1000, // ms
};
