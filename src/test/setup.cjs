// Test setup file (CommonJS)
const PouchDB = require('pouchdb');
const PouchDBMemoryAdapter = require('pouchdb-adapter-memory');

// Register the memory adapter
PouchDB.plugin(PouchDBMemoryAdapter);

// Create a clean database before each test
const createTestDB = (name = 'test-db') => {
  // Use the memory adapter for tests
  return new PouchDB(name, { adapter: 'memory' });
};

// Clean up database after tests
const cleanupTestDB = async (db) => {
  try {
    await db.destroy();
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
};

// Setup DOM mock for tests that need it
const setupDOMEnvironment = () => {
  // Mock minimal document API
  global.document = {
    createElement: () => ({
      style: {},
      setAttribute: () => {},
      appendChild: () => {},
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 100 })
    }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  
  // Mock minimal window API
  global.window = {
    PouchDB,
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    setTimeout,
    clearTimeout,
    matchMedia: () => ({ matches: false })
  };
};

// Export utilities
module.exports = {
  PouchDB,
  createTestDB,
  cleanupTestDB,
  setupDOMEnvironment
};
