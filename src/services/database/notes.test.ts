// Mocha/Chai tests for notes.js CRUD operations
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { expect } = chai;
import PouchDB from 'pouchdb';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';
import 'pouchdb-find';

(PouchDB as any).plugin(PouchDBMemoryAdapter);

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
import { TaskEither } from 'fp-ts/TaskEither';

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
    expect(note).to.have.property('_id');
    expect(note.title).to.equal('Test Note');
    createdId = note._id;
  });

  it('get fetches a note by ID', async () => {
    const noteTE = notesModule.get(createdId!);
    const note = await toPromise(noteTE) as NoteDocument;
    expect(note).not.to.be.undefined;
    expect(note._id).to.equal(createdId);
    expect(note.title).to.equal('Test Note');
  });

  it('update updates an existing note', async () => {
    const updatedTE = notesModule.update(createdId!, { 
      title: 'Updated', 
      content: 'World' 
    });
    const updated = await toPromise(updatedTE) as NoteDocument;
    expect(updated.title).to.equal('Updated');
    expect(updated.content).to.equal('World');
  });

  it('remove deletes a note', async () => {
    const removeTE = notesModule.remove(createdId!);
    await toPromise(removeTE);
    
    // Now try to get the deleted note - it should fail
    const getDeletedTE = notesModule.get(createdId!);
    await chai.expect(toPromise(getDeletedTE)).to.be.rejectedWith(Error);
  });

  it('update and then delete works correctly', async () => {
    // Create
    const noteTE = notesModule.create({ title: 'To Update and Delete' });
    const note = await toPromise(noteTE) as NoteDocument;
    
    // Update
    const updatedTE = notesModule.update(note._id, { content: 'Updated content' });
    const updated = await toPromise(updatedTE) as NoteDocument;
    
    expect(updated.content).to.equal('Updated content');
    expect(updated._id).to.equal(note._id);
    expect(updated._rev).not.to.equal(note._rev); // Revision should change
    
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
    expect(note).to.have.property('_id');
    expect(note).to.have.property('createdAt');
    expect(note).to.have.property('updatedAt');
    expect(note.type).to.equal('note');
  });

  it('create with _id reuses that ID', async () => {
    const idToUse = 'custom_id_123';
    const noteTE = notesModule.create({ _id: idToUse, title: 'Custom ID' });
    const note = await toPromise(noteTE) as NoteDocument;
    expect(note._id).to.equal(idToUse);
    
    // Clean up
    await toPromise(notesModule.remove(idToUse));
  });

  it('create with duplicate document ID rejection', async () => {
    // Create a document first
    const docTE = notesModule.create({ title: 'A' });
    const note1 = await toPromise(docTE) as NoteDocument;
    
    const duplicateTE = notesModule.create({ _id: note1._id, title: 'B' });
    await chai.expect(toPromise(duplicateTE)).to.be.rejectedWith(Error);
  });

  it('get with non-existent ID throws', async () => {
    const nonExistentTE = notesModule.get('nonexistent_id');
    await chai.expect(toPromise(nonExistentTE)).to.be.rejectedWith(Error);
  });

  it('get with empty string throws', async () => {
    const emptyIdTE = notesModule.get('');
    await chai.expect(toPromise(emptyIdTE)).to.be.rejectedWith(Error);
  });

  it('getAll returns empty array when no notes', async () => {
    const notesTE = notesModule.getAll();
    const notes = await toPromise(notesTE) as NoteDocument[];
    expect(Array.isArray(notes)).to.equal(true);
    expect(notes.length).to.equal(0);
  });

  it('getAll only returns notes with type "note"', async () => {
    // Add a non-note document directly to the database
    await (testDb as any).put({ _id: 'random_doc', foo: 'bar', type: 'random', _rev: '1-abc' });
    
    // Add a note using our service
    const createTE = notesModule.create({ title: 'Edge' });
    await pipe(
      createTE,
      TE.fold(
        (error) => () => Promise.reject(error),
        (value) => () => Promise.resolve(value)
      )
    )();
    
    // Get all notes and verify only 'note' types are returned
    const notesTE = notesModule.getAll();
    const notes = await toPromise(notesTE) as NoteDocument[];
    expect(notes.every((n: NoteDocument) => n.type === 'note')).to.equal(true);
    
    // Also verify that our non-note document is not in the results
    expect(notes.some((n: NoteDocument) => n._id === 'random_doc')).to.equal(false);
  });

  it('can create and handle multiple documents with different types', async () => {
    // Create a note
    const noteTE = notesModule.create({ 
      title: 'Regular Note', 
      content: 'This is a regular note', 
    });
    const note = await toPromise(noteTE) as NoteDocument;
    
    // Create a non-note document (should not appear in getAll)
    const nonNoteDoc = {
      _id: 'non_note_doc',
      title: 'Not A Note',
      type: 'something_else',
      createdAt: new Date().toISOString(),
    };
    // Insert this directly into PouchDB, bypassing the notes service
    await testDb.put(nonNoteDoc);
    
    // Get all notes and verify only 'note' types are returned
    const notesTE = notesModule.getAll();
    const notes = await toPromise(notesTE) as NoteDocument[];
    expect(notes.every((n) => n.type === 'note')).to.equal(true);
    
    // Also verify that our non-note document is not in the results
    const nonNoteIds = notes.map((n) => n._id).filter(id => id === 'non_note_doc');
    expect(nonNoteIds.length).to.equal(0);
    
    // Clean up
    await toPromise(notesModule.remove(note._id));
    const doc = await testDb.get('non_note_doc');
    await testDb.remove(doc);
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
    expect(afterDate > beforeDate).to.equal(true);
    
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
    await chai.expect(toPromise(secondRemoveTE)).to.be.rejectedWith(Error);
  });
});