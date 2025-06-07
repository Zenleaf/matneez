import { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import SyncStatus from './components/SyncStatus';
import { initializeDatabase } from './services/database';

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbStatus, setDbStatus] = useState({
    localInitialized: false,
    remoteConnected: false,
    syncActive: false
  });
  
  // Initialize database on component mount
  useEffect(() => {
    const initDb = async () => {
      try {
        const status = await initializeDatabase();
        setDbStatus(status);
        setDbInitialized(true);
        console.log('Database initialized:', status);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setDbInitialized(true); // Still mark as initialized so the UI renders
      }
    };
    
    initDb();
  }, [])

  return (
    <>
      <Navbar onBurgerClick={() => setDrawerOpen(true)} />
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {/* Main Content */}
      <div style={{
        paddingTop: 56, // Account for the fixed navbar height
        height: '100vh', // Make the container span the full viewport height
        boxSizing: 'border-box', // Ensure paddingTop is included within the 100vh
        background: '#1c2128', // Dark background for the main content area
        display: 'flex', // Allow Editor to fill space
        flexDirection: 'column',
        position: 'relative'
      }}>
        {!dbInitialized ? (
          <div style={{ padding: 20, color: '#c9d1d9', textAlign: 'center' }}>
            Initializing database...
          </div>
        ) : (
          <>
            <Editor />
            <div style={{ position: 'absolute', bottom: 16, right: 16 }}>
              <SyncStatus />
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default App
