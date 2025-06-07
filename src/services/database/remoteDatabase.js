/**
 * Remote CouchDB database service
 * Handles all interactions with the remote CouchDB instance
 */

// Using global PouchDB from CDN
const PouchDB = window.PouchDB;
import { REMOTE_DB } from '../../config';

let remoteDbInstance = null;
let isConnected = false;

/**
 * Get the remote database instance
 * @returns {Object|null} PouchDB instance or null if not configured
 */
export const getRemoteDatabase = () => {
  // Don't create a connection if credentials aren't provided
  if (!REMOTE_DB.username || !REMOTE_DB.password) {
    console.warn('Remote database credentials not configured');
    return null;
  }

  if (!remoteDbInstance) {
    try {
      const remoteDbUrl = `${REMOTE_DB.url}/${REMOTE_DB.dbName}`;
      
      // Configure auth options
      const options = {
        auth: {
          username: REMOTE_DB.username,
          password: REMOTE_DB.password
        },
        skip_setup: false // Allow database creation if it doesn't exist
      };
      
      remoteDbInstance = new PouchDB(remoteDbUrl, options);
      isConnected = true;
      console.log('Remote database connected:', remoteDbUrl);
    } catch (err) {
      console.error('Error connecting to remote database:', err);
      isConnected = false;
      throw err;
    }
  }
  
  return remoteDbInstance;
};

/**
 * Check if the remote database is connected
 * @returns {boolean} True if connected
 */
export const isRemoteConnected = () => {
  return isConnected;
};

/**
 * Close the remote database connection
 * @returns {Promise} Promise that resolves when the connection is closed
 */
export const closeRemoteConnection = async () => {
  if (!remoteDbInstance) return;
  
  try {
    await remoteDbInstance.close();
    remoteDbInstance = null;
    isConnected = false;
    console.log('Remote database connection closed');
  } catch (err) {
    console.error('Error closing remote database connection:', err);
    throw err;
  }
};

/**
 * Test the remote database connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export const testRemoteConnection = async () => {
  try {
    const remote = getRemoteDatabase();
    if (!remote) return false;
    
    // Try to get database info as a connection test
    await remote.info();
    return true;
  } catch (err) {
    console.error('Remote database connection test failed:', err);
    return false;
  }
};
