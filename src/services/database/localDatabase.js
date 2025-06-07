/**
 * Local PouchDB database service
 * Handles all interactions with the local PouchDB instance
 */

// Using global PouchDB from CDN
const PouchDB = window.PouchDB;
import { LOCAL_DB } from '../../config';

let dbInstance = null;
let isDestroyed = false;

/**
 * Get the database instance (singleton pattern)
 * @returns {Object} PouchDB instance
 */
export const getDatabase = () => {
  if (isDestroyed) {
    console.warn('Attempting to use destroyed database. Creating a new instance.');
    dbInstance = null;
    isDestroyed = false;
  }

  if (!dbInstance) {
    try {
      dbInstance = new PouchDB(LOCAL_DB.name);
      console.log('Local database initialized:', LOCAL_DB.name);
      
      // Start listening for changes
      startChangeListener();
      
      // Create indexes for better query performance
      dbInstance.createIndex({
        index: { fields: ['type', 'updatedAt'] }
      }).catch(err => console.error('Error creating index:', err));
    } catch (err) {
      console.error('Error initializing local database:', err);
      throw err;
    }
  }
  
  return dbInstance;
};

/**
 * Safely destroy the database instance
 * @returns {Promise} Promise that resolves when the database is destroyed
 */
export const destroyDatabase = async () => {
  if (dbInstance) {
    // Cancel any change listeners
    if (window._pouchDbChangeListener) {
      window._pouchDbChangeListener.cancel();
      window._pouchDbChangeListener = null;
    }
    
    await dbInstance.destroy();
    dbInstance = null;
    isDestroyed = true;
    console.log('Local database destroyed');
  }
};

/**
 * Start listening for changes to the local database
 * This helps ensure we catch all changes, even those from sync
 * @returns {Object|null} Change listener or null
 */
export const startChangeListener = () => {
  if (!dbInstance) {
    console.warn('Cannot start change listener: Database not initialized');
    return null;
  }
  
  // Cancel any existing change listener
  if (window._pouchDbChangeListener) {
    window._pouchDbChangeListener.cancel();
  }
  
  // Start a new change listener with immediate updates
  window._pouchDbChangeListener = dbInstance.changes({
    since: 'now',
    live: true,
    include_docs: true,
    timeout: false, // Never timeout
    heartbeat: 1000, // Send heartbeat every second to keep connection alive
  }).on('change', (change) => {
    console.log('%c Local DB Change', 'background: #8e44ad; color: white; padding: 2px 5px; border-radius: 3px;', change);
    
    // Dispatch a custom event for local changes
    try {
      // Add a timestamp to help track when changes occur
      const timestamp = new Date().toISOString();
      const localChangeEvent = new CustomEvent('pouchdb-local-change', {
        detail: { change, timestamp }
      });
      window.dispatchEvent(localChangeEvent);
      
      // Log more detailed information about the change
      if (change.doc) {
        console.log(`Document ID: ${change.doc._id}, Rev: ${change.doc._rev}`);
        console.log(`Change detected at: ${timestamp}`);
      }
    } catch (err) {
      console.error('Error dispatching local change event:', err);
    }
  }).on('error', (err) => {
    console.error('Error in local changes feed:', err);
    
    // Try to restart the change listener after an error
    setTimeout(() => {
      console.log('Attempting to restart change listener after error...');
      startChangeListener();
    }, 5000);
  });
  
  console.log('Local database change listener started');
  return window._pouchDbChangeListener;
};

/**
 * Get a document by ID
 * @param {string} id Document ID
 * @returns {Promise<Object>} Document
 */
export const getDocument = async (id) => {
  const db = getDatabase();
  try {
    return await db.get(id);
  } catch (err) {
    throw err;
  }
};

/**
 * Save a document
 * @param {string} id Document ID
 * @param {Object} content Document content
 * @param {string} [rev] Document revision (for updates)
 * @returns {Promise<string>} New document revision
 */
export const saveDocument = async (id, content, rev = null) => {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  try {
    let doc;
    
    if (rev) {
      // Update existing document
      doc = {
        _id: id,
        _rev: rev,
        content,
        updatedAt: now
      };
    } else {
      // Try to get existing document first
      try {
        const existingDoc = await db.get(id);
        doc = {
          ...existingDoc,
          content,
          updatedAt: now
        };
      } catch (err) {
        // Document doesn't exist, create new one
        if (err.name === 'not_found') {
          doc = {
            _id: id,
            content,
            createdAt: now,
            updatedAt: now,
            type: 'note'
          };
        } else {
          throw err;
        }
      }
    }
    
    const result = await db.put(doc);
    return result.rev;
  } catch (err) {
    if (err.name === 'conflict') {
      console.warn('Conflict detected when saving document. Retrying with latest revision.');
      const latestDoc = await db.get(id);
      return saveDocument(id, content, latestDoc._rev);
    }
    
    console.error('Error saving document:', err);
    throw err;
  }
};

/**
 * Create a new document
 * @param {string} id Document ID
 * @param {Object} content Document content
 * @returns {Promise<string>} New document revision
 */
export const createDocument = async (id, content) => {
  const now = new Date().toISOString();
  const doc = {
    _id: id,
    content,
    createdAt: now,
    updatedAt: now,
    type: 'note'
  };
  
  const db = getDatabase();
  try {
    const result = await db.put(doc);
    return result.rev;
  } catch (err) {
    console.error('Error creating document:', err);
    throw err;
  }
};

/**
 * Query documents by type
 * @param {string} type Document type
 * @param {Object} options Query options
 * @returns {Promise<Array>} Documents
 */
export const queryDocumentsByType = async (type, options = {}) => {
  const db = getDatabase();
  
  const queryOptions = {
    selector: {
      type: type
    },
    sort: [{ updatedAt: 'desc' }],
    ...options
  };
  
  try {
    const result = await db.find(queryOptions);
    return result.docs;
  } catch (err) {
    console.error('Error querying documents:', err);
    throw err;
  }
};

/**
 * Delete a document
 * @param {string} id Document ID
 * @param {string} rev Document revision
 * @returns {Promise<Object>} Result
 */
export const deleteDocument = async (id, rev) => {
  const db = getDatabase();
  
  try {
    return await db.remove(id, rev);
  } catch (err) {
    console.error('Error deleting document:', err);
    throw err;
  }
};
