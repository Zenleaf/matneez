/**
 * Main database service
 * Provides a unified interface for database operations
 */

import * as LocalDB from './localDatabase';
import * as RemoteDB from './remoteDatabase';
import * as SyncService from '../sync/syncService';
import { SYNC_CONFIG } from '../../config';

/**
 * Initialize the database system
 * @returns {Promise<Object>} Initialization status
 */
export const initializeDatabase = async () => {
  try {
    // Initialize local database
    const localDb = LocalDB.getDatabase();
    if (!localDb) {
      throw new Error('Failed to initialize local database');
    }
    
    // Start local change listener regardless of remote status
    LocalDB.startChangeListener();
    
    // Initialize remote if sync is enabled
    let remoteConnected = false;
    if (SYNC_CONFIG.enabled) {
      try {
        const remote = RemoteDB.getRemoteDatabase();
        if (remote) {
          remoteConnected = await RemoteDB.testRemoteConnection();
        }
      } catch (err) {
        console.error('Remote database initialization failed:', err);
        // Continue anyway - we'll still try to sync with retry enabled
      }
    }
    
    // Start sync even if remote connection test failed
    // The sync will retry automatically when connection is available
    let syncActive = false;
    if (SYNC_CONFIG.enabled) {
      try {
        // Always start with live sync enabled
        const liveSyncHandler = await SyncService.startSync({
          live: true,
          retry: true
        });
        
        // Then, start periodic sync for backup
        const periodicSyncHandler = await SyncService.startPeriodicSync();
        
        syncActive = !!(liveSyncHandler || periodicSyncHandler);
        
        console.log('Sync initialized successfully:', { 
          liveSyncActive: !!liveSyncHandler,
          periodicSyncActive: !!periodicSyncHandler
        });
      } catch (err) {
        console.error('Sync initialization failed:', err);
        // Continue anyway - the app can still work offline
      }
    }
    
    return {
      localInitialized: true,
      remoteConnected,
      syncActive
    };
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  }
};

/**
 * Get a note by ID
 * @param {string} id Note ID
 * @returns {Promise<Object>} Note document
 */
export const getNote = async (id) => {
  try {
    return await LocalDB.getDocument(id);
  } catch (err) {
    throw err;
  }
};

/**
 * Save a note
 * @param {string} id Note ID
 * @param {string} content Note content (HTML)
 * @param {string} [rev] Document revision (for updates)
 * @returns {Promise<string>} New document revision
 */
export const saveNote = async (id, content, rev = null) => {
  try {
    return await LocalDB.saveDocument(id, content, rev);
  } catch (err) {
    throw err;
  }
};

/**
 * Create initial note
 * @param {string} id Note ID
 * @param {string} content Initial content
 * @returns {Promise<string>} Document revision
 */
export const createInitialNote = async (id, content) => {
  try {
    return await LocalDB.createDocument(id, content);
  } catch (err) {
    throw err;
  }
};

/**
 * Get all notes
 * @param {Object} options Query options
 * @returns {Promise<Array>} Notes
 */
export const getAllNotes = async (options = {}) => {
  try {
    return await LocalDB.queryDocumentsByType('note', options);
  } catch (err) {
    throw err;
  }
};

/**
 * Delete a note
 * @param {string} id Note ID
 * @param {string} rev Document revision
 * @returns {Promise<Object>} Result
 */
export const deleteNote = async (id, rev) => {
  try {
    return await LocalDB.deleteDocument(id, rev);
  } catch (err) {
    throw err;
  }
};

/**
 * Get sync status
 * @returns {Object} Sync status
 */
export const getSyncStatus = () => {
  return SyncService.getSyncStatus();
};

/**
 * Manually trigger sync
 * @param {Object} options Sync options to override defaults
 * @returns {Promise<Object|null>} Sync handler or null
 */
export const syncNow = async (options = {}) => {
  // Always force live: true for real-time updates
  return await SyncService.startSync({
    live: true,
    retry: true,
    ...options,
    live: true // Re-apply to ensure it's not overridden
  });
};

/**
 * Trigger a debounced sync (waits for user to stop typing)
 * @returns {Promise<Object|null>} Promise that resolves to sync handler or null
 */
export const debouncedSync = async () => {
  return await SyncService.debouncedSync({ live: false });
};

/**
 * Clean up database connections
 * @returns {Promise<void>}
 */
export const cleanupDatabases = async () => {
  try {
    SyncService.stopSync();
    await RemoteDB.closeRemoteConnection();
    await LocalDB.destroyDatabase();
  } catch (err) {
    console.error('Error cleaning up databases:', err);
    throw err;
  }
};
