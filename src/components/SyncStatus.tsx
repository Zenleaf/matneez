import React, { useState, useEffect } from 'react';
import { CloudCheck, CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import './SyncStatus.css';

export interface SyncStatusProps {
  syncService: {
    getSyncStatus: () => Promise<{
      isActive: boolean;
      isPeriodicSyncActive: boolean;
      isRemoteConnected: boolean;
    }>;
    syncNow: () => Promise<boolean>;
  };
}

const SyncStatus: React.FC<SyncStatusProps> = ({ syncService }) => {
  const [status, setStatus] = useState({
    isActive: false,
    isPeriodicSyncActive: false,
    isRemoteConnected: false
  });
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    const updateStatus = async () => {
      try {
        const currentStatus = await syncService.getSyncStatus();
        if (mounted && currentStatus) {
          setStatus(currentStatus);
        }
      } catch (error) {
        setStatus({
          isActive: false,
          isPeriodicSyncActive: false,
          isRemoteConnected: false
        });
      }
    };
    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [syncService]);

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncService.syncNow();
      if (result) {
        setLastSynced(new Date());
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="sync-status">
      <button onClick={handleManualSync} disabled={syncing} className="sync-btn">
        <RefreshCw className={syncing ? 'spin' : ''} size={18} />
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
      <span className="sync-indicator">
        {status.isActive ? <CloudCheck color="#4ade80" /> : <CloudOff color="#f87171" />}
        {status.isRemoteConnected ? <Wifi color="#60a5fa" /> : <WifiOff color="#f87171" />}
      </span>
      <span className="sync-meta">
        {lastSynced ? `Last synced: ${lastSynced.toLocaleTimeString()}` : ''}
      </span>
    </div>
  );
};

export default SyncStatus;
