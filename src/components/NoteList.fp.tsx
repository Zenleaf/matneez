import React, { useEffect, useState, useCallback, useRef } from 'react';
// Import services via window global to match PouchDB pattern
type NotesServiceType = any; // Define proper type when available

interface Note {
  _id: string;
  _rev?: string;
  title: string;
  content: any; // Using 'any' since content could be complex editor state
  updatedAt: string;
  createdAt?: string;
}

export const NoteList: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Service reference to avoid recreating on each render
  const notesServiceRef = useRef<() => NotesServiceType>(() => {
    // Access notes service through the window object like in Editor.fp.tsx
    const PouchDB = (window as any).PouchDB;
    if (!PouchDB) {
      console.error('PouchDB is not loaded');
      return null;
    }
    
    const db = new PouchDB('notes');
    return {
      getAll: () => ({
        fork: (reject: (error: Error) => void, resolve: (notes: Note[]) => void) => {
          db.allDocs({ include_docs: true })
            .then((result: any) => {
              const notes = result.rows
                .map((row: any) => row.doc)
                .filter((doc: any) => doc.title && doc.content) // Filter out design docs
                .sort((a: Note, b: Note) => 
                  new Date(b.updatedAt || '').getTime() - 
                  new Date(a.updatedAt || '').getTime()
                );
              resolve(notes);
            })
            .catch((err: Error) => reject(err));
        }
      }),
      delete: (id: string) => ({
        fork: (reject: (error: Error) => void, resolve: () => void) => {
          db.get(id)
            .then((doc: any) => db.remove(doc))
            .then(() => resolve())
            .catch((err: Error) => reject(err));
        }
      }),
      create: (note: Omit<Note, '_id' | 'updatedAt'>) => ({
        fork: (reject: (error: Error) => void, resolve: (note: Note) => void) => {
          const newNote = {
            ...note,
            _id: `note_${Date.now()}`,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };
          
          db.put(newNote)
            .then(() => resolve(newNote as Note))
            .catch((err: Error) => reject(err));
        }
      })
    };
  });
  
  // Load notes function using the service
  const loadNotes = useCallback(() => {
    setLoading(true);
    
    const notesService = notesServiceRef.current();
    if (!notesService) {
      setError('Notes service is not available');
      setLoading(false);
      return;
    }
    
    notesService.getAll().fork(
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      },
      (loadedNotes: Note[]) => {
        setNotes(loadedNotes);
        setLoading(false);
      }
    );
  }, []);

  // Set up PouchDB change listener for real-time updates
  useEffect(() => {
    // Load notes initially
    loadNotes();
    
    // Set up change listener
    const PouchDB = (window as any).PouchDB;
    if (!PouchDB) return;
    
    const db = new PouchDB('notes');
    const changes = db.changes({
      since: 'now',
      live: true,
      include_docs: true
    });
    
    // Listen for changes
    changes.on('change', () => {
      loadNotes();
    });
    
    return () => {
      // Cancel change listener on unmount
      changes.cancel();
    };
  }, [loadNotes]);

  const handleCreateNote = useCallback(() => {
    const notesService = notesServiceRef.current();
    if (!notesService) {
      setError('Notes service is not available');
      return;
    }
    
    notesService.create({ 
      title: 'New Note', 
      content: JSON.stringify({ type: 'doc', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Start writing here...' }] }
      ]}) 
    }).fork(
      (err: Error) => setError(err.message),
      () => {
        console.log('Note created');
        loadNotes(); // Refresh the list after creating
      }
    );
  }, [loadNotes]);

  const handleDeleteNote = useCallback((id: string) => {
    const notesService = notesServiceRef.current();
    if (!notesService) {
      setError('Notes service is not available');
      return;
    }
    
    notesService.delete(id).fork(
      (err: Error) => setError(err.message),
      () => {
        console.log('Note deleted');
        loadNotes(); // Refresh the list after deleting
      }
    );
  }, [loadNotes]);

  if (loading) {
    return <div>Loading notes...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Notes</h2>
      <button onClick={handleCreateNote}>Create New Note</button>
      
      {notes.length === 0 ? (
        <p>No notes yet. Create one to get started!</p>
      ) : (
        <ul>
          {notes.map(note => (
            <li key={note._id}>
              <h3>{note.title}</h3>
              <p>{typeof note.content === 'string' 
                ? (note.content.substring(0, 100) + '...') 
                : ((typeof note.content === 'object' && note.content !== null)
                  ? 'Rich text content'
                  : 'No content')}</p>
              <small>Last updated: {new Date(note.updatedAt).toLocaleString()}</small>
              <button onClick={() => handleDeleteNote(note._id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
