import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { constVoid, constFalse, constTrue } from 'fp-ts/function';
import type { Database, SyncResponse } from '../../types/db';

export interface SyncConfig {
  readonly enabled: boolean;
  readonly interval: number;
  readonly [key: string]: unknown;
}

export interface SyncStatus {
  readonly isActive: boolean;
  readonly isPeriodicSyncActive: boolean;
  readonly isRemoteConnected: boolean;
  readonly lastSync?: Date;
  readonly error?: Error;
}

export interface SyncHandlers {
  onSyncStart?: () => void;
  onSyncComplete?: (result: E.Either<Error, boolean>) => void;
  onStatusChange?: (status: SyncStatus) => void;
}

export interface SyncService {
  readonly startSync: (options?: object) => TE.TaskEither<Error, boolean>;
  readonly debouncedSync: (options?: object) => TE.TaskEither<Error, boolean>;
  readonly stopSync: () => T.Task<void>;
  readonly getStatus: () => SyncStatus;
  readonly subscribe: (handler: (status: SyncStatus) => void) => () => void;
}

const DEFAULT_STATUS: SyncStatus = {
  isActive: false,
  isPeriodicSyncActive: false,
  isRemoteConnected: false,
};

export const createSyncService = (
  getLocalDb: () => Database,
  getRemoteDb: () => Database,
  config: SyncConfig,
  handlers: SyncHandlers = {}
): SyncService => {
  let currentStatus: SyncStatus = { ...DEFAULT_STATUS };
  let syncHandler: SyncResponse<any> | null = null;
  let syncInterval: NodeJS.Timeout | null = null;
  let debounceTimer: NodeJS.Timeout | null = null;
  const subscribers: Array<(status: SyncStatus) => void> = [];
  const DEBOUNCE_DELAY = 500;

  const notifySubscribers = (status: SyncStatus) => {
    currentStatus = status;
    subscribers.forEach(handler => handler(status));
    handlers.onStatusChange?.(status);
  };

  const updateStatus = (updates: Partial<SyncStatus>): SyncStatus => {
    const newStatus = { ...currentStatus, ...updates };
    notifySubscribers(newStatus);
    return newStatus;
  };

  const withSyncHandling = <A>(
    task: TE.TaskEither<Error, A>,
    onStart: () => void = constVoid,
    onComplete: (result: E.Either<Error, A>) => void = constVoid
  ): TE.TaskEither<Error, A> => {
    return pipe(
      TE.Do,
      TE.chainFirstIOK(() => () => onStart()),
      TE.chain(() => task),
      TE.fold(
        error => {
          onComplete(E.left(error));
          return TE.left(error);
        },
        result => {
          onComplete(E.right(result));
          return TE.right(result);
        }
      )
    );
  };
  const startSync = (options: object = {}): TE.TaskEither<Error, boolean> => {
    return withSyncHandling(
      TE.tryCatch(
        async () => {
          if (!config.enabled) return false;
          
          const localDb = getLocalDb();
          const remoteDb = getRemoteDb();
          
          if (!localDb || !remoteDb) {
            throw new Error('Local or remote database not available');
          }

          // Cancel any existing sync
          if (syncHandler) {
            syncHandler.cancel();
            syncHandler = null;
          }

          updateStatus({
            isActive: true,
            isRemoteConnected: true,
            error: undefined
          });

          return new Promise<boolean>((resolve, reject) => {
            try {
              const sync = localDb.sync(remoteDb, { 
                live: true, 
                retry: true,
                batch_size: 100,
                batches_limit: 10,
                ...options 
              });
              
              // Store the sync handler
              syncHandler = sync;
              
              // Set up event listeners
              sync.on('change', () => {
                updateStatus({ isActive: true });
              });
              
              sync.on('paused', () => {
                updateStatus({ isActive: false });
                resolve(true);
              });
              
              sync.on('error', (error: unknown) => {
                const err = error instanceof Error ? error : new Error(String(error));
                updateStatus({ 
                  isActive: false, 
                  isRemoteConnected: false,
                  error: err 
                });
                reject(err);
              });
              
              sync.on('complete', () => {
                updateStatus({ isActive: false });
                resolve(true);
              });
              
              // Initial sync check
              sync.on('active', () => {
                updateStatus({ isActive: true });
              });
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              updateStatus({ 
                isActive: false,
                isRemoteConnected: false,
                error: err 
              });
              reject(err);
            }
          });
        },
        (error): Error => 
          error instanceof Error 
            ? error 
            : new Error('Unknown error during sync')
      ),
      () => {
        handlers.onSyncStart?.();
        updateStatus({ isActive: true });
      },
      result => {
        handlers.onSyncComplete?.(result);
        updateStatus({ 
          isActive: false, 
          lastSync: new Date(),
          error: E.isLeft(result) ? result.left : undefined
        });
      }
    );
  };

  const debouncedSync = (options: PouchDB.Replication.SyncOptions = {}): TE.TaskEither<Error, boolean> => {
    return TE.tryCatch(
      () =>
        new Promise<boolean>((resolve) => {
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(async () => {
            try {
              const result = await startSync(options)();
              if (E.isRight(result)) {
                resolve(result.right);
              } else {
                console.error('Debounced sync failed:', result.left);
                resolve(false);
              }
            } catch (error) {
              const err = error instanceof Error ? error : new Error('Unknown error in debouncedSync');
              console.error('Debounced sync failed:', err);
              resolve(false);
            }
          }, DEBOUNCE_DELAY);
        }),
      (error) => {
        const err = error instanceof Error ? error : new Error('Unknown error in debouncedSync');
        console.error('Debounced sync failed:', err);
        return err;
      }
    );
  };

  const stopSync = (): T.Task<void> =>
    pipe(
      TE.tryCatch(
        () => {
          if (syncHandler) {
            syncHandler.cancel();
            syncHandler = null;
          }
          if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
          }
          updateStatus({ 
            isActive: false, 
            isPeriodicSyncActive: false,
            isRemoteConnected: false
          });
          return Promise.resolve();
        },
        (error) => {
          const err = error instanceof Error ? error : new Error('Failed to stop sync');
          console.error('Error stopping sync:', err);
          return err;
        }
      ),
      TE.fold(
        (error) => T.fromIO(() => console.error('Failed to stop sync:', error)),
        () => T.of(undefined)
      )
    );

  const subscribe = (handler: (status: SyncStatus) => void): (() => void) => {
    subscribers.push(handler);
    // Immediately send current status to new subscriber
    handler(currentStatus);
    return () => {
      const index = subscribers.indexOf(handler);
      if (index >= 0) {
        subscribers.splice(index, 1);
      }
    };
  };

  // Initialize with default status
  updateStatus(DEFAULT_STATUS);

  // Start periodic sync if enabled
  if (config.enabled && config.interval > 0) {
    syncInterval = setInterval(
      () => startSync()().catch(constVoid),
      config.interval
    );
    updateStatus({ isPeriodicSyncActive: true });
  }

  return {
    startSync,
    debouncedSync,
    stopSync,
    getStatus: () => currentStatus,
    subscribe
  };
};
