import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [count, setCount] = useState(0)

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
        flexDirection: 'column'
      }}>
        <Editor />
      </div>
    </>
  )
}

export default App
