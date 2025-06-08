import type { NoteDocument } from '../../types/note';
import type { SyncStatus } from '../sync/syncService';

export interface DatabaseAPI {
  initializeDatabase: () => Promise<{ localInitialized: boolean; remoteConnected: boolean; syncActive: boolean }>;
  getNote: (id: string) => Promise<NoteDocument>;
  saveNote: (id: string, content: string, rev?: string | null) => Promise<string>;
  createInitialNote: (id: string, content: string) => Promise<string>;
  getAllNotes: (options?: object) => Promise<NoteDocument[]>;
  deleteNote: (id: string, rev: string) => Promise<any>;
  getSyncStatus: () => SyncStatus;
  syncNow: (options?: object) => Promise<any>;
  debouncedSync: (options?: object) => Promise<any>;
  cleanupDatabases: () => Promise<void>;
}

export interface DatabaseDependencies {
  localDbService: any;
  remoteDbService: any;
  syncService: any;
  config: any;
}

export const createDatabaseAPI = ({
  localDbService,
  remoteDbService,
  syncService,
  config
}: DatabaseDependencies): DatabaseAPI => {
  return {
    initializeDatabase: async () => {
      const localDb = localDbService.getDatabase();
      if (!localDb) throw new Error('Failed to initialize local database');
      localDbService.startChangeListener?.();
      let remoteConnected = false;
      if (config.enabled) {
        try {
          const remote = remoteDbService.getRemoteDatabase();
          if (remote) {
            remoteConnected = await remoteDbService.testRemoteConnection();
          }
        } catch {
          remoteConnected = false;
        }
      }
      let syncActive = false;
      if (config.enabled) {
        try {
          const liveSyncHandler = await syncService.startSync({ live: true, retry: true });
          const periodicSyncHandler = await syncService.startPeriodicSync();
          syncActive = !!(liveSyncHandler || periodicSyncHandler);
        } catch {
          syncActive = false;
        }
      }
      return {
        localInitialized: true,
        remoteConnected,
        syncActive
      };
    },
    getNote: (id: string) => localDbService.getNote(id),
    saveNote: (id: string, content: string, rev?: string | null) => localDbService.saveNote(id, content, rev),
    createInitialNote: (id: string, content: string) => localDbService.createInitialNote(id, content),
    getAllNotes: (options?: object) => localDbService.getAllNotes(options),
    deleteNote: (id: string, rev: string) => localDbService.deleteNote(id, rev),
    getSyncStatus: () => syncService.getSyncStatus(),
    syncNow: (options?: object) => syncService.startSync(options),
    debouncedSync: (options?: object) => syncService.debouncedSync(options),
    cleanupDatabases: async () => {
      await localDbService.destroyDB?.();
      await remoteDbService.closeRemoteConnection?.();
    }
  };
};
