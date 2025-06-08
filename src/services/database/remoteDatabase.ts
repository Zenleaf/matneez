export interface RemoteDbConfig {
  url: string;
  dbName: string;
  username: string;
  password: string;
}

export interface RemoteDatabaseService {
  getRemoteDatabase: () => any | null;
  isRemoteConnected: () => boolean;
  closeRemoteConnection: () => Promise<void>;
  testRemoteConnection: () => Promise<boolean>;
}

export const createRemoteDatabaseService = (
  PouchDB: any,
  config: RemoteDbConfig
): RemoteDatabaseService => {
  let remoteDbInstance: any = null;
  let isConnected = false;

  const getRemoteDatabase = (): any | null => {
    if (!config.username || !config.password) {
      console.warn('Remote database credentials not configured');
      return null;
    }
    if (!remoteDbInstance) {
      try {
        const remoteDbUrl = `${config.url}/${config.dbName}`;
        const options = {
          auth: { username: config.username, password: config.password },
          skip_setup: false
        };
        remoteDbInstance = new PouchDB(remoteDbUrl, options);
        isConnected = true;
        console.log('Remote database connected:', remoteDbUrl);
      } catch (err) {
        console.error('Error connecting to remote database:', err);
        isConnected = false;
        throw err;
      }
    }
    return remoteDbInstance;
  };

  const isRemoteConnected = (): boolean => isConnected;

  const closeRemoteConnection = async (): Promise<void> => {
    if (remoteDbInstance) {
      await remoteDbInstance.close();
      remoteDbInstance = null;
      isConnected = false;
    }
  };

  const testRemoteConnection = async (): Promise<boolean> => {
    try {
      const db = getRemoteDatabase();
      if (!db) return false;
      await db.info();
      return true;
    } catch {
      return false;
    }
  };

  return {
    getRemoteDatabase,
    isRemoteConnected,
    closeRemoteConnection,
    testRemoteConnection
  };
};
