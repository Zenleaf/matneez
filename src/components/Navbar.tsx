import React, { useState, useEffect } from 'react';

export interface NavbarProps {
  onBurgerClick: () => void;
  selectedNoteId?: string | null;
  noteTitle?: string;
}

const Navbar: React.FC<NavbarProps> = ({ onBurgerClick, selectedNoteId, noteTitle: propNoteTitle }) => {
  const [noteTitle, setNoteTitle] = useState<string>(propNoteTitle || 'Cogneez');
  
  // Update noteTitle when prop changes
  useEffect(() => {
    if (propNoteTitle) {
      setNoteTitle(propNoteTitle);
    }
  }, [propNoteTitle]);
  
  // Listen for title updates from the Editor component
  useEffect(() => {
    const handleTitleChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.noteId === selectedNoteId) {
        setNoteTitle(customEvent.detail.title || 'Untitled Note');
      }
    };
    
    document.addEventListener('cogneez:note:title', handleTitleChange);
    
    return () => {
      document.removeEventListener('cogneez:note:title', handleTitleChange);
    };
  }, [selectedNoteId]);
  
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      background: '#181c24',
      color: '#fff',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      zIndex: 2000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <button
        aria-label="Open sidebar"
        onClick={onBurgerClick}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          fontSize: 28,
          marginLeft: 16,
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span style={{display: 'inline-block', width: 24, height: 24}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </span>
      </button>
      <span 
        style={{
          marginLeft: 16, 
          fontWeight: 'bold', 
          fontSize: 20,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 'calc(100% - 80px)'
        }}
        title={noteTitle} // Show full title on hover
      >
        {noteTitle}
      </span>
    </nav>
  );
};

export default Navbar;
