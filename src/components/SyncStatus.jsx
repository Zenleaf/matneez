import React, { useState, useEffect } from 'react';
import { getSyncStatus, syncNow } from '../services/database';
import { CloudCheck, CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import './SyncStatus.css';

const SyncStatus = () => {
  const [status, setStatus] = useState({
    isActive: false,
    isPeriodicSyncActive: false,
    isRemoteConnected: false
  });
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  // Update status every 5 seconds
  useEffect(() => {
    const updateStatus = () => {
      try {
        const currentStatus = getSyncStatus();
        if (currentStatus) {
          setStatus(currentStatus);
        }
      } catch (error) {
        console.error('Error getting sync status:', error);
        // Set default status when there's an error
        setStatus({
          isActive: false,
          isPeriodicSyncActive: false,
          isRemoteConnected: false
        });
      }
    };

    // Initial update
    updateStatus();

    // Set up interval
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      const result = await syncNow();
      if (result) {
        console.log('Manual sync initiated successfully');
        setLastSynced(new Date());
      } else {
        console.warn('Manual sync could not be initiated');
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      // Update status to reflect the error
      setStatus(prev => ({
        ...prev,
        isActive: false
      }));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="sync-status">
      <div className="sync-indicators">
        {status.isRemoteConnected ? (
          <Wifi size={16} className="icon connected" />
        ) : (
          <WifiOff size={16} className="icon disconnected" />
        )}
        
        {status.isActive ? (
          <CloudCheck size={16} className="icon active" />
        ) : (
          <CloudOff size={16} className="icon inactive" />
        )}
        
        <button 
          className="sync-button" 
          onClick={handleManualSync}
          disabled={syncing || !status.isRemoteConnected}
        >
          <RefreshCw 
            size={16} 
            className={`icon ${syncing ? 'syncing' : ''}`} 
          />
        </button>
      </div>
      
      {lastSynced && (
        <div className="last-synced">
          Last synced: {lastSynced.toLocaleTimeString()}
        </div>
      )}

    </div>
  );
};

export default SyncStatus;
