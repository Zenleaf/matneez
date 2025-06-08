import React, { useEffect, useState } from 'react';
import { NotesService } from '../services/notes/notes.service';

interface Note {
  _id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export const NoteList: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load notes on component mount
  useEffect(() => {
    const loadNotes = () => {
      setLoading(true);
      
      NotesService.getAll()
        .fork(
          err => {
            setError(err.message);
            setLoading(false);
          },
          loadedNotes => {
            setNotes(loadedNotes);
            setLoading(false);
          }
        );
    };

    // Initial load
    loadNotes();

    // Subscribe to changes
    const unsubscribe = NotesService.subscribe(change => {
      if (change.type === 'UPDATED' || change.type === 'DELETED') {
        loadNotes(); // Refresh the list on changes
      }
    });

    return () => {
      unsubscribe(); // Clean up subscription on unmount
    };
  }, []);

  const handleCreateNote = () => {
    NotesService.create({ 
      title: 'New Note', 
      content: 'Start writing here...' 
    }).fork(
      err => setError(err.message),
      () => console.log('Note created')
    );
  };

  const handleDeleteNote = (id: string) => {
    NotesService.delete(id).fork(
      err => setError(err.message),
      () => console.log('Note deleted')
    );
  };

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
              <p>{note.content.substring(0, 100)}...</p>
              <small>Last updated: {new Date(note.updatedAt).toLocaleString()}</small>
              <button onClick={() => handleDeleteNote(note._id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
