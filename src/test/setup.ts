// Vitest setup file
import { beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import PouchDB from 'pouchdb';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';
import { JSDOM } from 'jsdom';

// Register the memory adapter
(PouchDB as any).plugin(PouchDBMemoryAdapter);

// Create a clean database before each test
export const createTestDB = (name: string = 'test-db'): PouchDB.Database => {
  // Use the memory adapter for tests
  return new PouchDB(name, { adapter: 'memory' });
};

// Clean up database after tests
export const cleanupTestDB = async (db: PouchDB.Database): Promise<void> => {
  try {
    await db.destroy();
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
};

// Setup DOM environment for tests that need it
export const setupDOMEnvironment = (): void => {
  // JSDOM is already set up by Vitest with jsdom environment
  // We just need to add PouchDB to the window
  (window as any).PouchDB = PouchDB;
  
  // Mock any additional browser APIs if needed
  if (!(window as any).matchMedia) {
    (window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  }
};

// Setup global before/after hooks
beforeAll(() => {
  setupDOMEnvironment();
});

// Expose PouchDB for tests
export { PouchDB };

