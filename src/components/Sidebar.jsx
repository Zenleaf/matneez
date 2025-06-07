import React from 'react';

export default function Sidebar({ open, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      width: open ? '100vw' : 0,
      zIndex: 3000,
      pointerEvents: open ? 'auto' : 'none',
      transition: 'background 0.3s',
    }}>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: open ? 'rgba(0,0,0,0.3)' : 'transparent',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.3s',
          pointerEvents: open ? 'auto' : 'none',
          zIndex: 3000,
        }}
      />
      {/* Drawer */}
      <aside style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100vh',
        width: 280,
        background: '#23272f',
        color: '#fff',
        boxShadow: '2px 0 16px rgba(0,0,0,0.28)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s',
        zIndex: 3001,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            alignSelf: 'flex-end',
            fontSize: 28,
            color: '#fff',
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          &times;
        </button>
        <div style={{fontWeight: 'bold', marginBottom: 16}}>Sidebar</div>
        <ul style={{listStyle: 'none', padding: 0}}>
          <li><a href="#" style={{color: '#fff', textDecoration: 'none', display: 'block', padding: '8px 0'}}>Home</a></li>
          <li><a href="#" style={{color: '#fff', textDecoration: 'none', display: 'block', padding: '8px 0'}}>Notes</a></li>
          <li><a href="#" style={{color: '#fff', textDecoration: 'none', display: 'block', padding: '8px 0'}}>Settings</a></li>
        </ul>
      </aside>
    </div>
  );
}
