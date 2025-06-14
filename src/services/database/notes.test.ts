// Vitest tests for notes.js CRUD operations
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PouchDB from 'pouchdb';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';
import PouchDBFind from 'pouchdb-find';

// Register plugins
(PouchDB as any).plugin(PouchDBMemoryAdapter);
(PouchDB as any).plugin(PouchDBFind);

// Define the structure of a Note document
interface NoteDocument {
  _id: string; // In PouchDB, _id is typically present after creation
  _rev: string; // In PouchDB, _rev is present after creation/update
  title: string;
  content: string;
  type: 'note';
  createdAt: string; // Assuming these are ISO date strings
  updatedAt: string;
  [key: string]: any; // Allow other properties for flexibility
}

// For creating/updating a note, some fields are optional or not yet present
interface NoteInput {
  _id?: string; // Optional: PouchDB can generate it
  title?: string;
  content?: string;
  type?: 'note'; // Should default to 'note' or be set by the service
  [key: string]: any;
}

// Custom interface for PouchDB delete response to work around potential typing issues
interface PouchDbDeleteResponse {
  ok: boolean;
  id: string;
  rev: string;
}

// The type for the imported notes module from TaskEither implementation
import { TaskEither } from 'fp-ts/lib/TaskEither.js';

interface NotesService {
  create: (data: NoteInput) => TaskEither<Error, NoteDocument>;
  get: (id: string) => TaskEither<Error, NoteDocument>;
  getAll: () => TaskEither<Error, NoteDocument[]>;
  update: (id: string, data: Partial<NoteInput>) => TaskEither<Error, NoteDocument>;
  remove: (id: string) => TaskEither<Error, void>;
}


// Import the notes service factory and database wrapper
import { createNotesServiceFp } from './notes';

let notesModule: NotesService;
// Use the PouchDB type for direct access to all PouchDB methods
let testDb: any; // Using any for the direct PouchDB instance because of complex typing

beforeEach(async () => {
  // Create a fresh in-memory database for each test
  testDb = new PouchDB('test_notes', { adapter: 'memory' });
  
  // Ensure the database is empty
  try {
    const allDocs = await testDb.allDocs();
    await Promise.all(
      allDocs.rows.map((row: any) => 
        testDb.remove(row.id, row.value.rev)
      )
    );
  } catch (e) {
    // Ignore errors during cleanup
  }
  
  // Create index for updatedAt field to enable sorting
  await testDb.createIndex({
    index: {
      fields: ['updatedAt', 'type']
    }
  });

  // Create a notes service instance with the test database
  notesModule = createNotesServiceFp(testDb as any);
});

afterEach(async () => {
  // Clean up the database after each test
  if (testDb) {
    try {
      await (testDb as any).destroy();
    } catch (e) {}
  }
  delete (global as any).testDb;
});
// fp-ts imports for working with TaskEither
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

// Helper function to convert TaskEither to Promise for testing
function toPromise<E, A>(te: TE.TaskEither<E, A>): Promise<A> {
  // First evaluate the TaskEither to get a Promise<Either<E, A>>
  const eitherPromise = te();
  
  // Then convert the Either to a resolved/rejected Promise
  return eitherPromise.then(either => 
    either._tag === 'Left' ? Promise.reject(either.left) : Promise.resolve(either.right)
  );
}

describe('Notes CRUD Service', () => {
  let createdId: string | undefined;
  const sampleData: NoteInput = { title: 'Test Note', content: 'Hello', type: 'note' };

  // No need for afterAll since we're cleaning up after each test

  // Basic CRUD tests
  it('create creates a new note', async () => {
    const noteTE = notesModule.create(sampleData);
    const note = await toPromise(noteTE) as NoteDocument;
    expect(note).toHaveProperty('_id');
    expect(note.title).toBe('Test Note');
    createdId = note._id;
  });

  it('get fetches a note by ID', async () => {
    // First create a note to ensure we have something to fetch
    const createTE = notesModule.create(sampleData);
    const created = await toPromise(createTE) as NoteDocument;
    createdId = created._id;
    
    // Now fetch it
    const noteTE = notesModule.get(createdId!);
    const note = await toPromise(noteTE) as NoteDocument;
    expect(note).toBeDefined();
    expect(note._id).toBe(createdId);
    expect(note.title).toBe('Test Note');
  });

  it('update updates an existing note', async () => {
    // First create a note to ensure we have something to update
    const createTE = notesModule.create(sampleData);
    const created = await toPromise(createTE) as NoteDocument;
    createdId = created._id;
    
    // Now update it
    const updatedTE = notesModule.update(createdId!, { 
      title: 'Updated', 
      content: 'World' 
    });
    const updated = await toPromise(updatedTE) as NoteDocument;
    expect(updated.title).toBe('Updated');
    expect(updated.content).toBe('World');
  });

  it('remove deletes a note', async () => {
    // First create a note to ensure we have something to delete
    const createTE = notesModule.create(sampleData);
    const created = await toPromise(createTE) as NoteDocument;
    createdId = created._id;
    
    // Now delete it
    const removeTE = notesModule.remove(createdId!);
    await toPromise(removeTE);
    
    // Now try to get the deleted note - it should fail
    const getDeletedTE = notesModule.get(createdId!);
    await expect(toPromise(getDeletedTE)).rejects.toThrow(Error);
  });

  it('update and then delete works correctly', async () => {
    // Create
    const noteTE = notesModule.create({ title: 'To Update and Delete' });
    const note = await toPromise(noteTE) as NoteDocument;
    
    // Update
    const updatedTE = notesModule.update(note._id, { content: 'Updated content' });
    const updated = await toPromise(updatedTE) as NoteDocument;
    
    expect(updated.content).toBe('Updated content');
    expect(updated._id).toBe(note._id);
    expect(updated._rev).not.toBe(note._rev); // Revision should change
    
    // Delete
    const removeTE = notesModule.remove(note._id);
    await toPromise(removeTE);
  });
});

describe('Notes CRUD Service Edge Cases', () => {
  // Edge case tests
  it('create with missing fields still creates a note', async () => {
    const noteTE = notesModule.create({});
    const note = await toPromise(noteTE) as NoteDocument;
    expect(note).toHaveProperty('_id');
    expect(note).toHaveProperty('createdAt');
    expect(note).toHaveProperty('updatedAt');
    expect(note.type).toBe('note');
  });

  it('create with _id reuses that ID', async () => {
    const idToUse = 'custom_id_123';
    const noteTE = notesModule.create({ _id: idToUse, title: 'Custom ID' });
    const note = await toPromise(noteTE) as NoteDocument;
    expect(note._id).toBe(idToUse);
    
    // Clean up
    await toPromise(notesModule.remove(idToUse));
  });

  it('create with duplicate document ID rejection', async () => {
    // Create a document first
    const docTE = notesModule.create({ title: 'A' });
    const note1 = await toPromise(docTE) as NoteDocument;
    
    const duplicateTE = notesModule.create({ _id: note1._id, title: 'B' });
    await expect(toPromise(duplicateTE)).rejects.toThrow(Error);
  });

  it('get with non-existent ID throws', async () => {
    const nonExistentTE = notesModule.get('nonexistent_id');
    await expect(toPromise(nonExistentTE)).rejects.toThrow(Error);
  });

  it('get with empty string throws', async () => {
    const emptyIdTE = notesModule.get('');
    await expect(toPromise(emptyIdTE)).rejects.toThrow(Error);
  });

  it('getAll returns empty array when no notes', async () => {
    // Modify the test to handle the case where sorting isn't available
    // by using allDocs instead of find when the database is empty
    const getAllTE = notesModule.getAll();
    const notes = await toPromise(getAllTE) as NoteDocument[];
    expect(notes).toBeInstanceOf(Array);
    expect(notes.length).toBe(0);
  });

  it('getAll only returns notes with type "note"', async () => {
    // Create an index for the type field to enable filtering
    await testDb.createIndex({
      index: { fields: ['type'] }
    });
    
    // Add a non-note document directly to the database
    await testDb.put({ _id: 'random_doc', foo: 'bar', type: 'random' });
    
    // Add a note using our service
    const createTE = notesModule.create({ title: 'Edge' });
    await toPromise(createTE);
    
    // Get all notes
    const getAllTE = notesModule.getAll();
    const notes = await toPromise(getAllTE) as NoteDocument[];
    
    // Should only include documents with type=note
    expect(notes.length).toBe(1);
    expect(notes[0].type).toBe('note');
  });

  it('can create and handle multiple documents with different types', async () => {
    // Create an index for the type field to enable filtering
    await testDb.createIndex({
      index: { fields: ['type'] }
    });
    
    // Create a non-note document
    await testDb.put({
      _id: 'config',
      type: 'config',
      theme: 'dark',
      updatedAt: new Date().toISOString()
    });
    
    // Create a note
    const createTE = notesModule.create({ title: 'Test Note' });
    await toPromise(createTE);
    
    // Get all notes - should only return the note, not the config
    const getAllTE = notesModule.getAll();
    const notes = await toPromise(getAllTE) as NoteDocument[];
    
    expect(notes.length).toBe(1);
    expect(notes[0].type).toBe('note');
    expect(notes[0].title).toBe('Test Note');
  });

  it('update with no changes still updates updatedAt', async () => {
    const createTE = notesModule.create({ title: 'ToUpdate' });
    const note = await toPromise(createTE) as NoteDocument;
    
    const beforeDate = new Date(note.updatedAt);
    
    // Delay to ensure timestamps are different
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const updateTE = notesModule.update(note._id, { title: 'ToUpdate' }); // Same title
    const updated = await toPromise(updateTE) as NoteDocument;
    
    const afterDate = new Date(updated.updatedAt);
    expect(afterDate > beforeDate).toBe(true);
    
    // Clean up
    await toPromise(notesModule.remove(note._id));
  });

  it('remove twice throws on second delete', async () => {
    const createTE = notesModule.create({ title: 'ToDelete' });
    const note = await toPromise(createTE) as NoteDocument;
    
    // First delete
    const removeTE = notesModule.remove(note._id);
    await toPromise(removeTE);
    
    // Second delete should fail
    const secondRemoveTE = notesModule.remove(note._id);
    await expect(toPromise(secondRemoveTE)).rejects.toThrow(Error);
  });
});