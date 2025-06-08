import React, { useState, useEffect } from 'react';
import './App.css';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { extractTitleFromContent } from './utils/noteUtils';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { Editor } from './components/Editor.fp';
import SyncStatus from './components/SyncStatus';

// Services
import { createLocalDb } from './services/database/localDatabase';
import { createRemoteDatabaseService } from './services/database/remoteDatabase';
import { createNotesService } from './services/notes/notes.service';
import { createSyncService } from './services/sync/syncService';

// Types
import type { Database, BaseDocument } from './types/db';
import type { NoteDocument } from './types/note';

// Define the return type of createNotesService
type NotesService = ReturnType<typeof createNotesService>;

interface AppState {
  initialized: boolean;
  error: string | null;
  db: Database | null;
  notesService: NotesService | null;
  syncService: ReturnType<typeof createSyncService> | null;
  dbStatus: {
    localInitialized: boolean;
    remoteConnected: boolean;
    syncActive: boolean;
  };
}

const App: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentNoteTitle, setCurrentNoteTitle] = useState<string>('Cogneez');
  const [appState, setAppState] = useState<AppState>({
    initialized: false,
    error: null,
    db: null,
    notesService: null,
    syncService: null,
    dbStatus: {
      localInitialized: false,
      remoteConnected: false,
      syncActive: false
    }
  });
  
  // Track if notes have been loaded
  const [notesLoaded, setNotesLoaded] = useState(false);

  // Listen for title updates from the Editor component
  useEffect(() => {
    const handleTitleChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.noteId === selectedNoteId) {
        setCurrentNoteTitle(customEvent.detail.title || 'Untitled Note');
      }
    };
    
    document.addEventListener('cogneez:note:title', handleTitleChange);
    
    return () => {
      document.removeEventListener('cogneez:note:title', handleTitleChange);
    };
  }, [selectedNoteId]);
  
  // Effect to update selected note when notes change
  useEffect(() => {
    console.log('Effect running with selectedNoteId:', selectedNoteId);
    console.log('Notes count:', notes.length);
    
    if (selectedNoteId && notes.length > 0) {
      // Check if the selected note still exists
      const noteExists = notes.some(note => String(note._id) === String(selectedNoteId));
      console.log('Selected note exists in list:', noteExists);
      
      if (!noteExists) {
        // If not, select the first note
        console.log('Selecting first note as fallback:', notes[0]._id);
        setSelectedNoteId(String(notes[0]._id));
        // Update current note title
        setCurrentNoteTitle(notes[0].title || 'Untitled Note');
      } else {
        // Find the selected note and update the title
        const selectedNote = notes.find(note => String(note._id) === String(selectedNoteId));
        if (selectedNote) {
          console.log('Found selected note, updating title:', selectedNote.title);
          setCurrentNoteTitle(selectedNote.title || 'Untitled Note');
        }
      }
    } else if (!selectedNoteId && notes.length > 0) {
      // If no note is selected but we have notes, select the first one
      console.log('No note selected, selecting first note:', notes[0]._id);
      setSelectedNoteId(String(notes[0]._id));
      // Update current note title
      setCurrentNoteTitle(notes[0].title || 'Untitled Note');
    }
  }, [notes, selectedNoteId]);
  
  
  // Load notes and subscribe to changes
  useEffect(() => {
    const { notesService } = appState;
    if (!notesService) return;
    
    const loadNotes = async () => {
      try {
        const result = await notesService.list()();
        if (E.isRight(result)) {
          // Process notes to ensure titles are extracted from content if not already set
          const loadedNotes = result.right.map((note: NoteDocument) => {
            if (!note.title && note.content) {
              // If note has no title but has content, extract title from content
              try {
                const content = typeof note.content === 'string' ? 
                  JSON.parse(note.content) : note.content;
                const extractedTitle = extractTitleFromContent(content);
                return { ...note, title: extractedTitle };
              } catch (e) {
                // If parsing fails, just return the original note
                return note;
              }
            }
            return note;
          });
          
          setNotes(loadedNotes);
          
          // If no note is selected but we have notes, select the first one
          if (!selectedNoteId && loadedNotes.length > 0) {
            console.log('Setting initial selected note ID:', loadedNotes[0]._id);
            setSelectedNoteId(String(loadedNotes[0]._id));
          }
          
          // Mark notes as loaded
          setNotesLoaded(true);
        } else {
          console.error('Failed to load notes:', result.left);
          // Even if there's an error, we should still mark notes as "loaded"
          // to prevent infinite loading state
          setNotesLoaded(true);
        }
      } catch (error) {
        console.error('Error loading notes:', error);
        // Even in case of exception, mark notes as loaded
        setNotesLoaded(true);
      }
    };
    
    loadNotes();
    
    // Subscribe to changes
    const unsubscribe = notesService.subscribe((change: any) => {
      // Reload notes list
      loadNotes();
      
      // Dispatch event for editor to update if this is the selected note
      if (change && change.id === selectedNoteId) {
        const event = new Event('cogneez:doc:change');
        document.dispatchEvent(event);
      }
    });
    
    // Set up sync status updates
    const updateSyncStatus = (status: any) => {
      setAppState(prev => ({
        ...prev,
        dbStatus: {
          ...prev.dbStatus,
          isRemoteConnected: status.isRemoteConnected,
          syncActive: status.isActive
        }
      }));
    };
    
    const syncService = appState.syncService;
    if (syncService) {
      const unsubscribeSync = syncService.subscribe(updateSyncStatus);
      return () => {
        if (unsubscribe) unsubscribe();
        unsubscribeSync();
      };
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [appState.notesService, appState.syncService, selectedNoteId]);

  // Initialize app on mount
  useEffect(() => {
    const init = async () => {
      try {
        const db = createLocalDb<NoteDocument>('notes');
        const notesService = createNotesService(db);
        
        // Initialize remote database service if URL is provided
        let syncService = null;
        
        if (import.meta.env.VITE_COUCHDB_URL) {
          const remoteDbService = createRemoteDatabaseService(
            window.PouchDB,
            {
              url: import.meta.env.VITE_COUCHDB_URL,
              dbName: import.meta.env.VITE_COUCHDB_DATABASE || 'cogneez_notes',
              username: import.meta.env.VITE_COUCHDB_USERNAME || '',
              password: import.meta.env.VITE_COUCHDB_PASSWORD || ''
            }
          );

          // Create a function to get the remote database
          const getRemoteDb = () => {
            const remoteDb = remoteDbService.getRemoteDatabase();
            if (!remoteDb) {
              throw new Error('Failed to connect to remote database');
            }
            return remoteDb;
          };

          syncService = createSyncService(
            () => db,
            getRemoteDb,
            { 
              enabled: import.meta.env.VITE_SYNC_ENABLED === 'true', 
              interval: parseInt(import.meta.env.VITE_SYNC_INTERVAL || '30000', 10) 
            },
            {
              onStatusChange: (status) => {
                console.log('Sync status changed:', status);
                setAppState(prev => ({
                  ...prev,
                  dbStatus: {
                    ...prev.dbStatus,
                    syncActive: status.isActive,
                    remoteConnected: status.isRemoteConnected
                  }
                }));
              },
              onSyncComplete: (result) => {
                E.fold(
                  (error) => console.error('Sync failed:', error),
                  () => console.log('Sync completed successfully')
                )(result);
              }
            }
          );
        } else {
          console.warn('VITE_COUCHDB_URL is not set. Sync with remote database is disabled.');
        }

        // Initialize the database
        await db.info(); // Test the connection
        
        setAppState({
          initialized: true,
          error: null,
          db,
          notesService,
          syncService,
          dbStatus: {
            localInitialized: true,
            remoteConnected: false,
            syncActive: false
          }
        });
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setAppState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          initialized: true
        }));
      }
    };

    init();
  }, []);

  const { initialized, error, dbStatus, db, notesService, syncService } = appState;

  // Show loading screen until both initialization and note loading are complete
  if (!initialized || !notesLoaded) {
    // Enhanced loading state that matches the app's design
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1c2128',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        color: '#c9d1d9'
      }}>
        <h1 className="text-2xl font-bold mb-4">Cogneez</h1>
        <div className="text-center">{initialized ? 'Loading notes...' : 'Initializing...'}</div>
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  
  if (!db || !notesService) {
    return <div>Error: Failed to initialize database</div>;
  }

  console.log('App.tsx render: selectedNoteId is', selectedNoteId);

  return (
    <>
      <Navbar 
        onBurgerClick={() => setDrawerOpen(true)} 
        selectedNoteId={selectedNoteId} 
        noteTitle={currentNoteTitle} 
      />
      
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="sidebar-header">
          <h2>Notes</h2>
          <button
            onClick={() => {
              if (appState.notesService) {
                pipe(
                  appState.notesService.create({
                    title: 'New Note',
                    content: '',
                    type: 'note',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }),
                  TE.match(
                    (error) => { 
                      console.error('Failed to create note:', error); 
                      return null; 
                    },
                    (note) => { 
                      setSelectedNoteId(note._id); 
                      return note; 
                    }
                  )
                )();
              }
              if (window.innerWidth < 768) { 
                setDrawerOpen(false); 
              }
            }}
            className="new-note-btn"
            aria-label="New note"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div className="notes-list">
          {notes.map(note => {
            const isSelected = String(selectedNoteId) === String(note._id);
            
            return (
              <div 
                key={note._id} 
                className={`note-item ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedNoteId(String(note._id));
                  if (window.innerWidth < 768) { 
                    setDrawerOpen(false); 
                  }
                }}
              >
                <div className="note-title">{note.title || 'Untitled Note'}</div>
                <div className="note-preview">
                  {note.content ? 
                    (typeof note.content === 'string' ? 
                      (note.content.trim() === '' ? 'No content' : note.content.substring(0, 80) + (note.content.length > 80 ? '...' : '')) : 
                      '[Rich Content]') : 
                    'No content'}
                </div>
                <div className="note-date">
                  {new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </Sidebar>
      
      <div className="main-content">
        {selectedNoteId ? (
          <div className="editor-container">
            <Editor noteId={selectedNoteId} />
            
            {/* Sync Status */}
            {appState.syncService && (
              <div className="sync-status-container">
                <SyncStatus 
                  syncService={{
                    getSyncStatus: async () => ({
                      isActive: appState.dbStatus.syncActive,
                      isPeriodicSyncActive: false,
                      isRemoteConnected: appState.dbStatus.remoteConnected
                    }),
                    syncNow: async () => {
                      if (appState.syncService) {
                        const result = await appState.syncService.startSync()();
                        return E.fold(
                          (error: Error) => { console.error('Sync failed:', error); return false; },
                          (success: boolean) => success
                        )(result);
                      }
                      return false;
                    }
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="no-note-selected">
            <div className="placeholder-icon">📝</div>
            <p className="placeholder-text">Select a note to view or edit</p>
            <p className="placeholder-subtext">Or, create a new note using the button in the sidebar.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default App;
