import React, { useState, useEffect } from 'react';
import './App.css';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

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

  // Load notes and subscribe to changes
  useEffect(() => {
    const { notesService } = appState;
    if (!notesService) return;
    
    const loadNotes = async () => {
      try {
        const result = await notesService.list()();
        if (E.isRight(result)) {
          const loadedNotes = result.right;
          setNotes(loadedNotes);
          
          // If no note is selected but we have notes, select the first one
          if (!selectedNoteId && loadedNotes.length > 0) {
            setSelectedNoteId(loadedNotes[0]._id);
          }
        } else {
          console.error('Failed to load notes:', result.left);
        }
      } catch (error) {
        console.error('Error loading notes:', error);
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

  if (!initialized) {
    return <div>Loading...</div>;
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
      <Navbar onBurgerClick={() => setDrawerOpen(true)} />
      <Sidebar 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)}
      >
        {/* Sidebar internal content structure */}
        <div className="sidebar-content p-4 h-full overflow-y-auto bg-gray-900">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Notes</h2>
          <button 
            onClick={() => {
              if (appState.notesService) {
                pipe(
                  appState.notesService.create({
                    title: 'New Note',
                    content: '', // Editor handles JSON
                    type: 'note',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }),
                  TE.match(
                    (error) => { console.error('Failed to create note:', error); return null; },
                    (note) => { setSelectedNoteId(note._id); return note; }
                  )
                )();
              }
            }}
            className="new-note-button w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded mb-4 transition duration-150"
          >
            + New Note
          </button>
          <div className="notes-list space-y-2">
            {notes.map(note => (
              <div 
                key={note._id} 
                className={`note-item p-3 rounded-lg cursor-pointer transition duration-150 ${selectedNoteId === note._id ? 'bg-blue-500' : 'hover:bg-gray-700 bg-gray-800'}`}
                onClick={() => {
                  setSelectedNoteId(note._id);
                  if (window.innerWidth < 768) { setDrawerOpen(false); }
                }}
              >
                <h3 className={`font-semibold truncate ${selectedNoteId === note._id ? 'text-white' : 'text-gray-300'}`}>{note.title || 'Untitled Note'}</h3>
                <p className={`text-sm truncate ${selectedNoteId === note._id ? 'text-blue-100' : 'text-gray-500'}`}>
                  {note.content ? 
                    (typeof note.content === 'string' ? 
                      (note.content.trim() === '' ? 'Empty note' : note.content.substring(0, 60) + (note.content.length > 60 ? '...' : '')) : 
                      '[Rich Content]') : 
                    'Empty note'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Sidebar>
      
      {/* Main content area - simple absolute positioning for full viewport */}
      <div style={{
        position: 'absolute',
        top: '56px', 
        left: 0,
        right: 0,
        bottom: 0,
        background: '#1c2128'
      }}>
        {selectedNoteId ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', padding: '16px' }}>
            <Editor noteId={selectedNoteId} />
            
            {syncService && (
              <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 50 }}>
                <SyncStatus 
                  syncService={{
                    getSyncStatus: () => Promise.resolve({
                      isActive: dbStatus.syncActive,
                      isPeriodicSyncActive: false,
                      isRemoteConnected: dbStatus.remoteConnected
                    }),
                    syncNow: async () => {
                      if (!syncService) return false;
                      const result = await syncService.startSync()();
                      return E.fold(
                        (error: Error) => { console.error('Sync failed:', error); return false; },
                        (success: boolean) => success
                      )(result);
                    }
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="no-note-selected flex flex-col items-center justify-center h-full text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="text-lg">Select a note to view or edit</p>
            <p className="text-sm">Or, create a new note using the button in the sidebar.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default App;
