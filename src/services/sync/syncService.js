/**
 * Sync service for PouchDB/CouchDB
 * Handles synchronization between local PouchDB and remote CouchDB
 */

import { getDatabase } from '../database/localDatabase';
import { getRemoteDatabase, isRemoteConnected } from '../database/remoteDatabase';
import { SYNC_CONFIG } from '../../config';

// Debug flag - set to true to see detailed sync logs
const DEBUG = true;

// Debug logging helper
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('%c[SyncService]', 'color: #9b59b6; font-weight: bold;', ...args);
  }
};

// Global sync state
let syncHandler = null;
let syncInterval = null;
let syncDebounceTimer = null;
const DEBOUNCE_DELAY = 500; // 500ms for more responsive sync

/**
 * Debounced sync function - will only trigger sync after a delay
 * to prevent too many sync operations when typing quickly
 * @param {Object} options Sync options to override defaults
 * @returns {Promise<Object|null>} Promise that resolves to sync handler or null
 */
export const debouncedSync = (options = {}) => {
  return new Promise((resolve) => {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }
    
    syncDebounceTimer = setTimeout(async () => {
      // ALWAYS use live: true for real-time updates
      const syncOptions = {
        live: true,  // Force live sync
        retry: true, // Always retry
        ...options,
        live: true,  // Re-apply to ensure it's not overridden
      };
      
      debugLog('Debounced sync triggered with options:', syncOptions);
      const result = await startSync(syncOptions);
      resolve(result);
    }, DEBOUNCE_DELAY);
  });
};

/**
 * Start synchronization between local and remote databases
 * @param {Object} options Sync options to override defaults
 * @returns {Object|null} Sync handler or null if sync is not enabled/possible
 */
export const startSync = async (options = {}) => {
  // Don't sync if it's disabled in config
  if (!SYNC_CONFIG.enabled) {
    debugLog('Sync is disabled in configuration');
    return null;
  }

  // Stop any existing sync first
  stopSync();
  
  try {
    const localDb = getDatabase();
    const remoteDb = getRemoteDatabase();
    
    if (!localDb) {
      debugLog('Cannot start sync: Local database not available');
      return null;
    }
    
    if (!remoteDb) {
      debugLog('Cannot start sync: Remote database not available');
      return null;
    }
    
    // Test remote connection
    try {
      const isConnected = await isRemoteConnected();
      if (!isConnected) {
        debugLog('Cannot start sync: Remote database not connected');
        return null;
      }
    } catch (connErr) {
      debugLog('Error testing remote connection:', connErr);
      // Continue anyway - the sync will retry if needed
    }
    
    // ALWAYS use live: true by default for real-time updates
    // Only override if explicitly set to false
    const syncOptions = {
      live: options.live !== false,  // Default to true unless explicitly set to false
      retry: true,                  // Always retry if connection is lost
      batch_size: 5,                // Smaller batch size for more frequent updates
      batches_limit: 2,             // Process fewer batches at once for more frequent updates
      heartbeat: 1000,              // Send heartbeat every second to keep connection alive
      timeout: false,               // Never timeout the sync
      back_off_function: (delay) => {
        if (delay === 0) return 1000;  // First retry after 1 second
        if (delay >= 60000) return 60000; // Max 1 minute delay
        return delay * 1.5; // Increase delay by 50% each time
      },
      ...options,                   // Apply user options
      // Force these critical options regardless of user input
      live: options.live !== false, // Re-apply live option to ensure it's not overridden
    };
    
    debugLog('Starting sync with options:', syncOptions);

    // Start bidirectional sync
    syncHandler = localDb.sync(remoteDb, syncOptions)
      .on('change', (change) => {
        debugLog('Sync change detected:', change);
        
        // Log direction of sync
        if (change.direction === 'pull') {
          debugLog('⬇️ Received changes from remote');
        } else {
          debugLog('⬆️ Sent changes to remote');
        }
        
        if (change.docs && change.docs.length) {
          debugLog('Changed documents:', change.docs.map(doc => doc._id || doc.id));
        }
        
        // Dispatch a single custom event for sync changes
        try {
          const event = new CustomEvent('pouchdb-sync-change', { 
            detail: { 
              direction: change.direction,
              change,
              timestamp: new Date().toISOString()
            } 
          });
          window.dispatchEvent(event);
        } catch (err) {
          console.error('Error dispatching sync change event:', err);
        }
      })
      .on('paused', (info) => {
        if (DEBUG) console.log('%c Sync paused', 'background: #f39c12; color: white; padding: 2px 5px; border-radius: 3px;', info);
        
        try {
          const syncPausedEvent = new CustomEvent('pouchdb-sync-paused', { 
            detail: { info } 
          });
          window.dispatchEvent(syncPausedEvent);
        } catch (err) {
          console.error('Error dispatching sync paused event:', err);
        }
      })
      .on('active', () => {
        if (DEBUG) console.log('%c Sync active', 'background: #2ecc71; color: white; padding: 2px 5px; border-radius: 3px;');
        
        try {
          const syncActiveEvent = new CustomEvent('pouchdb-sync-active');
          window.dispatchEvent(syncActiveEvent);
        } catch (err) {
          console.error('Error dispatching sync active event:', err);
        }
      })
      .on('denied', (err) => {
        console.error('%c Sync denied', 'background: #e74c3c; color: white; padding: 2px 5px; border-radius: 3px;', err);
      })
      .on('complete', (info) => {
        if (DEBUG) console.log('%c Sync completed', 'background: #9b59b6; color: white; padding: 2px 5px; border-radius: 3px;', info);
        
        try {
          const syncCompleteEvent = new CustomEvent('pouchdb-sync-complete', { 
            detail: { info } 
          });
          window.dispatchEvent(syncCompleteEvent);
        } catch (err) {
          console.error('Error dispatching sync complete event:', err);
        }
      })
      .on('error', (err) => {
        console.error('%c Sync error', 'background: #c0392b; color: white; padding: 2px 5px; border-radius: 3px;', err);
        
        try {
          const syncErrorEvent = new CustomEvent('pouchdb-sync-error', { 
            detail: { error: err } 
          });
          window.dispatchEvent(syncErrorEvent);
        } catch (eventErr) {
          console.error('Error dispatching sync error event:', eventErr);
        }
      });
    
    console.log('Sync started with options:', syncOptions);
    return syncHandler;
  } catch (err) {
    console.error('Error starting sync:', err);
    return null;
  }
};

/**
 * Stop synchronization
 */
export const stopSync = () => {
  if (syncHandler) {
    syncHandler.cancel();
    syncHandler = null;
    console.log('Sync stopped');
  }
  
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('Sync interval cleared');
  }
};

/**
 * Start periodic sync at specified intervals
 * @param {number} interval Interval in milliseconds
 * @returns {number} Interval ID
 */
export const startPeriodicSync = (interval = SYNC_CONFIG.interval) => {
  // Clear any existing interval
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  // Start initial sync with live: true
  startSync({ live: true });
  
  // Set up interval for future syncs
  syncInterval = setInterval(async () => {
    try {
      // Always use live: true for real-time updates
      await startSync({ live: true });
    } catch (err) {
      debugLog('Error in periodic sync:', err);
    }
  }, interval);
  
  debugLog(`Periodic sync started with ${interval}ms interval`);
  return syncInterval;
};

/**
 * Get the current sync status
 * @returns {Object} Sync status
 */
export const getSyncStatus = () => {
  return {
    isActive: !!syncHandler,
    isPeriodicSyncActive: !!syncInterval,
    isRemoteConnected: isRemoteConnected(),
  };
};
