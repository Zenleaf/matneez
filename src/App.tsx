import React, { useState, useEffect } from 'react';
import './App.css';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { extractTitleFromContent } from './utils/noteUtils';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor.fp';
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
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  
  // Detect touch device on first interaction
  useEffect(() => {
    const handleTouchStart = () => {
      setIsTouchDevice(true);
      document.removeEventListener('touchstart', handleTouchStart);
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);
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
  
  // Effect to update selected note when notes change - prevent infinite loop
  useEffect(() => {
    if (selectedNoteId && notes.length > 0) {
      // Check if the selected note still exists
      const noteExists = notes.some(note => String(note._id) === String(selectedNoteId));
      
      if (!noteExists) {
        // If not, select the first note
        const firstNoteId = String(notes[0]._id);
        setSelectedNoteId(firstNoteId);
        setCurrentNoteTitle(notes[0].title || 'Untitled Note');
      } else {
        // Find the selected note and update the title only if it's different
        const selectedNote = notes.find(note => String(note._id) === String(selectedNoteId));
        if (selectedNote) {
          const newTitle = selectedNote.title || 'Untitled Note';
          // Use a functional update to avoid reading currentNoteTitle in deps
          setCurrentNoteTitle(prevTitle => prevTitle !== newTitle ? newTitle : prevTitle);
        }
      }
    } else if (!selectedNoteId && notes.length > 0) {
      // If no note is selected but we have notes, select the first one
      const firstNoteId = String(notes[0]._id);
      setSelectedNoteId(firstNoteId);
      setCurrentNoteTitle(notes[0].title || 'Untitled Note');
    }
  }, [notes, selectedNoteId]); // Remove currentNoteTitle from deps to prevent loop
  
  
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
            setSelectedNoteId(String(loadedNotes[0]._id));
          }
          
          // Mark notes as loaded
          setNotesLoaded(true);
        } else {
          // Even if there's an error, we should still mark notes as "loaded"
          // to prevent infinite loading state
          setNotesLoaded(true);
        }
      } catch (error) {
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

  return (
    <>
      <Navbar 
        onBurgerClick={() => setDrawerOpen(true)} 
        selectedNoteId={selectedNoteId} 
        noteTitle={currentNoteTitle} 
      />
      
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h2 className="sidebar-title" style={{color: "rgb(255, 224, 130)"}}>NOTES</h2>
            <button 
              onClick={async () => {
                if (notesService) {
                  pipe(
                    notesService.create({
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
                        // Set the selected note ID
                        setSelectedNoteId(note._id);
                        
                        // Update the notes list immediately with the new note
                        // This ensures the new note appears in the list before we close the sidebar
                        setNotes(prevNotes => {
                          // Create a properly typed note document
                          const newNote: NoteDocument = {
                            ...note,
                            title: 'New Note',
                            content: '',
                            type: 'note' as 'note', // Explicitly type as literal 'note'
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          return [newNote, ...prevNotes];
                        });
                        
                        // Update the current note title
                        setCurrentNoteTitle('New Note');
                        
                        // Always close the drawer when creating a new note
                        setDrawerOpen(false);
                        
                        // Dispatch an event to notify the editor to load the new note
                        const event = new Event('cogneez:doc:change');
                        document.dispatchEvent(event);
                        
                        return note; 
                      }
                    )
                  )();
                }
              }}
              className="new-note-btn"
              aria-label="New note"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
            </button>
          </div>
          
          <div className="note-list">
            {notes.map(note => {
              const isSelected = String(selectedNoteId) === String(note._id);
              
              return (
                <div 
                  key={note._id} 
                  className={`note-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedNoteId(String(note._id));
                    // Close drawer on all devices
                    setDrawerOpen(false);
                  }}
                  onMouseEnter={() => !isTouchDevice && setHoveredNoteId(note._id)}
                  onMouseLeave={() => !isTouchDevice && setHoveredNoteId(null)}
                >
                  <div className="note-item-content">
                    {note.title || 'Untitled Note'}
                  </div>
                  {/* Render delete button when selected or hovered (on non-touch devices) */}
                  {(isSelected || (!isTouchDevice && hoveredNoteId === note._id)) && (
                    <button 
                      className="delete-note-btn"
                      onClick={(e) => {
                      e.stopPropagation();
                      if (notesService && window.confirm('Are you sure you want to delete this note?')) {
                        pipe(
                          notesService.remove(String(note._id)),
                          TE.match(
                            (error) => { 
                              console.error('Failed to delete note:', error); 
                              return null; 
                            },
                            () => {
                              // Note was deleted successfully
                              setSelectedNoteId(null);
                              return null;
                            }
                          )
                        )();
                      }
                    }}
                    aria-label="Delete note"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                  </button>
                  )}
                </div>
              );
            })}
          </div>
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
