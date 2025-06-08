console.log('Executing setupTests.ts: Applying polyfills and mocks...');

// Polyfill for setImmediate, which is used by PouchDB's dependencies like memdown
global.setImmediate = global.setImmediate || ((fn: (...args: any[]) => void, ...args: any[]) => global.setTimeout(fn, 0, ...args));

// Mock PouchDB for testing
const mockPouchDB = jest.fn().mockImplementation(() => ({
  put: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
  allDocs: jest.fn(),
  destroy: jest.fn(),
  createIndex: jest.fn(),
  find: jest.fn(),
  changes: jest.fn().mockReturnValue({
    on: jest.fn(),
    cancel: jest.fn(),
  }),
}));

// Assign mock to global PouchDB
global.PouchDB = mockPouchDB as unknown as typeof PouchDB;
