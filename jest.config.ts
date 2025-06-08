import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    // Use ts-jest for .ts/.tsx files
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        // If you still need babel for some JS/JSX files or specific babel plugins:
        babelConfig: true, // This will make ts-jest use your babel.config.cjs
      },
    ],
    // If you have .js/.jsx files that need babel transformation (e.g., from node_modules or existing JS tests)
    '^.+\\.jsx?$': 'babel-jest', // Ensure babel-jest is configured if used
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // If you have CSS/image imports, you might need to mock them
    // '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|pouchdb|pouchdb-adapter-memory|pouchdb-find|pouchdb-utils|pouchdb-errors|pouchdb-fetch|pouchdb-json|pouchdb-md5|pouchdb-promise|pouchdb-replication|pouchdb-mapreduce-utils|relational-pouch|spark-md5|@tiptap)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  // collectCoverage: true,
  // coverageProvider: 'v8',
  // coverageDirectory: 'coverage',
};

export default config;
