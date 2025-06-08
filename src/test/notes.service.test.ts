import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDB, cleanupTestDB } from './setup';
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';

// Register PouchDB plugins
(PouchDB as any).plugin(PouchDBFind);
(PouchDB as any).plugin(PouchDBMemoryAdapter);

// Define types for our tests
interface Note {
  _id: string;
  _rev?: string;
  title: string;
  content: any;
  updatedAt: string;
  createdAt?: string;
}

// Create a NotesService class for testing
class NotesService {
  private db: PouchDB.Database;
  
  constructor(dbName: string = 'test-notes') {
    this.db = createTestDB(dbName);
  }
  
  // Create an index for testing purposes
  async createIndex() {
    try {
      // Cast to any to access createIndex method
      return (this.db as any).createIndex({
        index: {
          fields: ['updatedAt', 'type']
        }
      });
    } catch (error) {
      console.warn('Index creation failed, may not be supported:', error);
      return Promise.resolve(); // Continue even if index creation fails
    }
  }
  
  // Create a new note
  create(note: Omit<Note, '_id' | 'updatedAt' | '_rev'>) {
    return {
      fork: (reject: (error: Error) => void, resolve: (note: Note) => void) => {
        const newNote = {
          ...note,
          _id: `note_${Date.now()}`,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        
        this.db.put(newNote)
          .then(() => resolve(newNote as Note))
          .catch((err: Error) => reject(err));
      }
    };
  }
  
  // Get a note by ID
  getById(id: string) {
    return {
      fork: (reject: (error: Error) => void, resolve: (note: Note) => void) => {
        this.db.get(id)
          .then((doc) => resolve(doc as Note))
          .catch((err: Error) => reject(err));
      }
    };
  }
  
  // Get all notes
  getAll() {
    return {
      fork: (reject: (error: Error) => void, resolve: (notes: Note[]) => void) => {
        this.db.allDocs({ include_docs: true })
          .then((result: any) => {
            const notes = result.rows
              .map((row: any) => row.doc)
              .filter((doc: any) => doc && doc.title && doc.content) // Filter out design docs
              .sort((a: any, b: any) => 
                new Date(b.updatedAt || '').getTime() - 
                new Date(a.updatedAt || '').getTime()
              ) as Note[];
            
            resolve(notes);
          })
          .catch((err: Error) => reject(err));
      }
    };
  }
  
  // Update a note
  update(id: string, updates: Partial<Omit<Note, '_id' | '_rev'>>) {
    return {
      fork: (reject: (error: Error) => void, resolve: (note: Note) => void) => {
        // First get the current document to get the _rev
        this.db.get(id)
          .then((doc) => {
            const updatedDoc = {
              ...doc,
              ...updates,
              updatedAt: new Date().toISOString()
            };
            
            return this.db.put(updatedDoc);
          })
          .then(() => this.db.get(id))
          .then((doc) => resolve(doc as Note))
          .catch((err: Error) => reject(err));
      }
    };
  }
  
  // Delete a note
  delete(id: string) {
    return {
      fork: (reject: (error: Error) => void, resolve: () => void) => {
        this.db.get(id)
          .then((doc) => this.db.remove(doc))
          .then(() => resolve())
          .catch((err: Error) => reject(err));
      }
    };
  }
  
  // Clean up test database
  async cleanup() {
    return cleanupTestDB(this.db);
  }
}

describe('NotesService', () => {
  let notesService: NotesService;
  
  beforeEach(async () => {
    // Create a fresh notes service before each test with a unique name to avoid conflicts
    const dbName = `test-notes-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    notesService = new NotesService(dbName);
    
    // Create the index for updatedAt field
    await notesService.createIndex();
  });
  
  afterEach(async () => {
    // Clean up after each test
    await notesService.cleanup();
  });
  
  describe('CRUD operations', () => {
    it('should create a new note', () => {
      return new Promise<void>((resolve, reject) => {
        const noteData = {
          title: 'Test Note',
          content: 'This is a test note'
        };
        
        notesService.create(noteData).fork(
          (err) => reject(err),
          (note) => {
            expect(note).toBeTypeOf('object');
            expect(note._id).toBeTypeOf('string');
            expect(note.title).toBe(noteData.title);
            expect(note.content).toBe(noteData.content);
            expect(note.updatedAt).toBeTypeOf('string');
            expect(note.createdAt).toBeTypeOf('string');
            resolve();
          }
        );
      });
    });
    
    it('should retrieve a note by ID', () => {
      return new Promise<void>((resolve, reject) => {
        const noteData = {
          title: 'Test Note for Retrieval',
          content: 'This note will be retrieved by ID'
        };
        
        notesService.create(noteData).fork(
          (err) => reject(err),
          (createdNote) => {
            notesService.getById(createdNote._id).fork(
              (err) => reject(err),
              (retrievedNote) => {
                expect(retrievedNote).toBeTypeOf('object');
                expect(retrievedNote._id).toBe(createdNote._id);
                expect(retrievedNote.title).toBe(noteData.title);
                expect(retrievedNote.content).toBe(noteData.content);
                resolve();
              }
            );
          }
        );
      });
    });
    
    it('should retrieve all notes', () => {
      return new Promise<void>((resolve, reject) => {
        const noteData1 = { title: 'Note 1', content: 'Content 1' };
        const noteData2 = { title: 'Note 2', content: 'Content 2' };
        
        // Helper function to add delay between operations
        const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
        
        // Create first note
        notesService.create(noteData1).fork(
          (err) => reject(err),
          async () => {
            // Add a small delay to ensure timestamps are different
            await delay(100);
            
            // Create second note
            notesService.create(noteData2).fork(
              (err) => reject(err),
              async () => {
                // Add another small delay before retrieving
                await delay(100);
                
                // Get all notes
                notesService.getAll().fork(
                  (err) => reject(err),
                  (notes) => {
                    expect(notes).toBeInstanceOf(Array);
                    expect(notes.length).toBeGreaterThanOrEqual(2);
                    
                    // Check that our notes are in the results
                    const titles = notes.map(note => note.title);
                    expect(titles).toContain(noteData1.title);
                    expect(titles).toContain(noteData2.title);
                    
                    // Check sorting (most recent first)
                    const timestamps = notes.map(note => 
                      new Date(note.updatedAt).getTime()
                    );
                    
                    // Verify descending order
                    for (let i = 0; i < timestamps.length - 1; i++) {
                      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
                    }
                    
                    resolve();
                  }
                );
              }
            );
          }
        );
      });
    });
    
    it('should update a note', () => {
      return new Promise<void>((resolve, reject) => {
        const originalNote = { title: 'Original Title', content: 'Original Content' };
        const updates = { title: 'Updated Title', content: 'Updated Content' };
        
        notesService.create(originalNote).fork(
          (err) => reject(err),
          (createdNote) => {
            notesService.update(createdNote._id, updates).fork(
              (err) => reject(err),
              (updatedNote) => {
                expect(updatedNote).toBeTypeOf('object');
                expect(updatedNote._id).toBe(createdNote._id);
                expect(updatedNote.title).toBe(updates.title);
                expect(updatedNote.content).toBe(updates.content);
                expect(updatedNote._rev).not.toBe(createdNote._rev);
                expect(new Date(updatedNote.updatedAt).getTime())
                  .toBeGreaterThanOrEqual(new Date(createdNote.updatedAt).getTime());
                resolve();
              }
            );
          }
        );
      });
    });
    
    it('should delete a note', () => {
      return new Promise<void>((resolve, reject) => {
        const noteData = { title: 'Note to Delete', content: 'This note will be deleted' };
        
        notesService.create(noteData).fork(
          (err) => reject(err),
          (createdNote) => {
            notesService.delete(createdNote._id).fork(
              (err) => reject(err),
              () => {
                // Try to get the deleted note
                notesService.getById(createdNote._id).fork(
                  (err) => {
                    // We expect an error for missing document
                    expect(err).toBeDefined();
                    expect(err.name).toBe('not_found');
                    resolve();
                  },
                  () => {
                    // If we get here, the note wasn't deleted
                    reject(new Error('Note was not deleted properly'));
                  }
                );
              }
            );
          }
        );
      });
    });
  });
  
  describe('Edge cases', () => {
    it('should handle retrieval of non-existent notes', () => {
      return new Promise<void>((resolve, reject) => {
        notesService.getById('non-existent-id').fork(
          (err) => {
            expect(err).toBeDefined();
            expect(err.name).toBe('not_found');
            resolve();
          },
          () => {
            reject(new Error('Retrieved a non-existent note'));
          }
        );
      });
    });
    
    it('should handle update of non-existent notes', () => {
      return new Promise<void>((resolve, reject) => {
        notesService.update('non-existent-id', { title: 'Updated' }).fork(
          (err) => {
            expect(err).toBeDefined();
            expect(err.name).toBe('not_found');
            resolve();
          },
          () => {
            reject(new Error('Updated a non-existent note'));
          }
        );
      });
    });
    
    it('should handle deletion of non-existent notes', () => {
      return new Promise<void>((resolve, reject) => {
        notesService.delete('non-existent-id').fork(
          (err) => {
            expect(err).toBeDefined();
            expect(err.name).toBe('not_found');
            resolve();
          },
          () => {
            reject(new Error('Deleted a non-existent note'));
          }
        );
      });
    });
    
    it('should handle complex content objects', () => {
      return new Promise<void>((resolve, reject) => {
        const complexContent = {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'World' }] }
          ]
        };
        
        const noteData = {
          title: 'Complex Note',
          content: complexContent
        };
        
        notesService.create(noteData).fork(
          (err) => reject(err),
          (createdNote) => {
            notesService.getById(createdNote._id).fork(
              (err) => reject(err),
              (retrievedNote) => {
                expect(retrievedNote.content).toEqual(complexContent);
                resolve();
              }
            );
          }
        );
      });
    });
    
    it('should handle concurrent updates (optimistic concurrency)', () => {
      return new Promise<void>((resolve, reject) => {
        const noteData = { 
          title: 'Concurrent Test', 
          content: 'Original content'
        };
        
        // Create a note
        notesService.create(noteData).fork(
          (err) => reject(err),
          (createdNote) => {
            // First update
            const update1 = notesService.update(createdNote._id, { 
              content: 'Update 1' 
            });
            
            // Second update (would normally create a conflict)
            const update2 = notesService.update(createdNote._id, { 
              content: 'Update 2' 
            });
            
            // Execute both updates, second should win in this case
            update1.fork(
              (err) => reject(err),
              () => {
                update2.fork(
                  (err) => reject(err),
                  (finalNote) => {
                    expect(finalNote.content).toBe('Update 2');
                    resolve();
                  }
                );
              }
            );
          }
        );
      });
    });
  });
});
