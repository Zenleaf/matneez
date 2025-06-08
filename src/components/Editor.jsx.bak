import React, { useState, useRef, useEffect } from 'react';
import { getNote, saveNote, createInitialNote, debouncedSync, syncNow } from '../services/database';

const NOTE_ID = 'main_note'; // Using a fixed ID for the single note for now
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

import MenuBar from './MenuBar';
import '../editor.css'; // Import custom editor styles

// Slash command menu component
const SlashCommandMenu = ({ editor }) => {
  if (!editor) return null;
  
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);
  
  // Available commands
  const commands = [
    { 
      title: 'Heading 1', 
      description: 'Large section heading',
      icon: 'H1',
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run() 
    },
    { 
      title: 'Heading 2', 
      description: 'Medium section heading',
      icon: 'H2',
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run() 
    },
    { 
      title: 'Heading 3', 
      description: 'Small section heading',
      icon: 'H3',
      command: () => editor.chain().focus().toggleHeading({ level: 3 }).run() 
    },
    { 
      title: 'Bullet List', 
      description: 'Create a simple bullet list',
      icon: '•',
      command: () => editor.chain().focus().toggleBulletList().run() 
    },
    { 
      title: 'Numbered List', 
      description: 'Create a numbered list',
      icon: '1.',
      command: () => editor.chain().focus().toggleOrderedList().run() 
    },
    { 
      title: 'Quote', 
      description: 'Create a blockquote',
      icon: '❝',
      command: () => editor.chain().focus().toggleBlockquote().run() 
    },
  ];
  
  // Filter commands based on query
  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );
  
  // Handle key events for navigation
  const handleKeyDown = (event) => {
    if (!isVisible) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        hideMenu();
        break;
      default:
        break;
    }
  };
  
  // Execute a command and hide the menu
  const executeCommand = (cmd) => {
    // Delete the backslash that triggered the menu
    editor.commands.deleteRange({
      from: editor.state.selection.from - 1 - query.length,
      to: editor.state.selection.from
    });
    
    // Execute the command
    cmd.command();
    hideMenu();
  };
  
  // Hide the menu
  const hideMenu = () => {
    setIsVisible(false);
    setQuery('');
    setSelectedIndex(0);
  };
  
  // Setup event listeners for slash key and text input
  useEffect(() => {
    if (!editor || !editor.view) return;
    
    // Function to check for slash and show menu
    const handleSlashKey = () => {
      const { state, view } = editor;
      const { selection } = state;
      const { empty, from } = selection;
      
      if (!empty) return false;
      
      // Get text before cursor in current node
      const $from = selection.$from;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      
      // Check if the last character is a backslash
      if (textBefore.endsWith('\\')) {
          // Get position using ProseMirror's coordsAtPos
        const { view } = editor;
        const { selection } = editor.state;
        const { from } = selection;
        const coords = view.coordsAtPos(from); // These are window-relative coordinates

        // For fixed positioning, use viewport coordinates directly
        // Add a small offset to position it nicely below the text line
        setPosition({
          top: coords.bottom + 2, // coords.bottom is viewport-relative
          left: coords.left,      // coords.left is viewport-relative
        });
        
        setIsVisible(true);
        setQuery('');
        return true;
      }
      
      // Check if we're already showing the menu and update query
      if (isVisible && textBefore.includes('\\')) {
        const backslashIndex = textBefore.lastIndexOf('\\');
        const newQuery = textBefore.slice(backslashIndex + 1);
        setQuery(newQuery);
        setSelectedIndex(0); // Reset selection when query changes
        return true;
      }
      
      return false;
    };
    
    // Create a transaction handler
    const handleTransaction = () => {
      setTimeout(handleSlashKey, 0);
    };
    
    // Add transaction handler
    editor.on('transaction', handleTransaction);
    
    // Add keyboard event listener for navigation
    document.addEventListener('keydown', handleKeyDown);
    
    // Add click outside listener to hide menu
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        hideMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      editor.off('transaction', handleTransaction);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editor, isVisible, query, selectedIndex]);
  
  if (!isVisible) return null;
  
  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: '#22272e',      // Consistent with editor.css .ProseMirror
        border: '1px solid #30363d', // Consistent with editor.css .ProseMirror
        borderRadius: '6px',
        padding: '4px',
        zIndex: 50,
        minWidth: '220px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        color: '#c9d1d9',           // Consistent with editor.css .ProseMirror text
        fontFamily: 'Inter, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search commands..."
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '4px',
          background: '#1c2128',      // Editor background for input
          border: '1px solid #30363d', // Editor border for input
          color: '#c9d1d9',           // Editor text color for input
          borderRadius: '4px',
          boxSizing: 'border-box',
        }}
        autoFocus
      />
      {filteredCommands.length > 0 ? (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {filteredCommands.map((cmd, index) => (
            <div
              key={index}
              onClick={() => executeCommand(cmd)}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: index === selectedIndex ? '#373e47' : 'transparent', // Hover/selected bg
              }}
            >
              <div style={{
                background: '#373e47',      // Icon background
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {cmd.icon}
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{cmd.title}</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>{cmd.description}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '10px', textAlign: 'center', color: '#484f58' }}> {/* Placeholder color */}
          No commands found
        </div>
      )}
    </div>
  );
};

// Extension to handle slash commands
const SlashCommands = Extension.create({
  name: 'slashCommands',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('slashCommands'),
      })
    ];
  },
});

export default function Editor() {
  const [isEditModeActive, setIsEditModeActive] = useState(false);
  const editorContainerRef = useRef(null);
  const [currentDocRev, setCurrentDocRev] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: isLoading ? 'Loading note...' : 'Type \\ for commands or start typing...', // Updated placeholder
      }),
      SlashCommands,
    ],
    content: '', // Content will be loaded from PouchDB
    onUpdate: async ({ editor }) => {
      if (isLoading || !editor.isEditable) return;

      const htmlContent = editor.getHTML();
      try {
        console.log('Editor: Saving note content...');
        const newRev = await saveNote(NOTE_ID, htmlContent, currentDocRev);
        setCurrentDocRev(newRev);
        
        // Always trigger immediate sync with live: true for real-time updates
        console.log('Editor: Triggering immediate sync with live: true');
        syncNow({
          live: true,
          retry: true
        }).catch(syncErr => {
          console.warn('Editor: Immediate sync failed:', syncErr);
        });
        
        // Also trigger debounced sync as a backup
        debouncedSync({
          live: true,
          retry: true
        }).catch(syncErr => {
          console.warn('Editor: Debounced sync failed:', syncErr);
        });
      } catch (err) {
        console.error('Editor: Error saving note through service:', err);
        // Optionally, handle specific errors, e.g., show a notification to the user
      }
    },
  });

  const handleDoubleClick = () => {
    setIsEditModeActive(prev => !prev);
  };

  const handleBlur = () => {
    setIsEditModeActive(false);
  };

  // Function to load note content
  const loadNote = async () => {
    setIsLoading(true);
    try {
      const note = await getNote(NOTE_ID);
      
      // If editor exists, update its content
      if (editor) {
        const currentSelection = editor.state.selection;
        editor.commands.setContent(note.content, false);
        // Try to restore cursor position
        editor.commands.setTextSelection(currentSelection);
        setCurrentDocRev(note._rev);
      }
    } catch (err) {
      console.error('Editor: Error loading note:', err);
      if (err.name === 'not_found') {
        console.log('Editor: Note not found, creating initial note');
        try {
          const initialContent = '<p></p>';
          editor.commands.setContent(initialContent, false);
          const newRev = await createInitialNote(NOTE_ID, initialContent);
          setCurrentDocRev(newRev);
        } catch (createErr) {
          console.error('Editor: Error creating initial note:', createErr);
        }
      }
    } finally {
      setIsLoading(false);
      if (editor) {
        editor.setEditable(true);
      }
    }
  };

  // Effect to initialize the editor and load the note
  useEffect(() => {
    if (!editor) return;
    
    editor.setEditable(false);
    loadNote(); // Load the note when editor is initialized
  }, [editor]); // Runs once when editor is initialized

  // Effect to listen for local database changes (this is the key to real-time sync)
  useEffect(() => {
    if (!editor) return;
    
    // Handler for local database changes - this catches ALL changes to the note
    // including those from sync with other devices
    const handleLocalChange = async (event) => {
      try {
        const { change, timestamp } = event.detail || {};
        if (!change || !change.doc || change.doc._id !== NOTE_ID) return;

        console.log(`Editor: 📝 Local change detected at ${timestamp}`, { id: change.doc._id, rev: change.doc._rev });

        // Compare content; only update if different to avoid cursor jumps
        const newContent = change.doc.content;
        const currentContent = editor.getHTML();
        
        if (currentContent !== newContent) {
          console.log('Editor: Content changed, updating editor...');
          
          // Save current cursor and scroll position
          const currentSelection = editor.state.selection;
          const scrollPosition = window.scrollY;
          
          // Update editor content
          editor.commands.setContent(newContent, false);
          setCurrentDocRev(change.doc._rev);
          
          // Dispatch an event to notify other components
          const updatedEvent = new CustomEvent('note-updated', { 
            detail: { noteId: NOTE_ID, source: 'change', newRev: change.doc._rev } 
          });
          window.dispatchEvent(updatedEvent);
          
          // Try to restore cursor position and scroll position
          try {
            if (currentSelection && editor && editor.state && editor.commands) {
              // Ensure editor is in a valid state to apply selection
              if (editor.state.doc.content.size > 0) { 
                editor.commands.setTextSelection(currentSelection);
              }
            }
            window.scrollTo(0, scrollPosition);
          } catch (posErr) {
            console.warn('Editor: Could not restore cursor position:', posErr);
          }
        } else {
          console.log('Editor: Content unchanged, no update needed');
        }
      } catch (err) {
        console.error('Editor: Error handling local change:', err);
      }
    };

    // Listen for ALL local database changes
    window.addEventListener('pouchdb-local-change', handleLocalChange);
    
    return () => {
      window.removeEventListener('pouchdb-local-change', handleLocalChange);
    };
  }, [editor]);

  // We still listen for sync events for debugging and status updates
  useEffect(() => {
    if (!editor) return;
    
    const handleSyncChange = (event) => {
      try {
        const { direction, change, timestamp } = event.detail || {};
        if (!change) return;
        
        console.log(`Editor: 📡 Sync ${direction} event at ${timestamp}`, { 
          direction, 
          docs: change.docs ? change.docs.map(d => d._id) : 'no docs' 
        });
      } catch (err) {
        console.error('Editor: Error handling sync event:', err);
      }
    };
    
    window.addEventListener('pouchdb-sync-change', handleSyncChange);
    
    return () => {
      window.removeEventListener('pouchdb-sync-change', handleSyncChange);
    };
  }, [editor]);

  // Effect to listen for sync events and local database changes
  useEffect(() => {
    if (!editor) return;
    
    // Handler for sync change events
    const handleSyncChange = async (event) => {
      try {
        const { direction, change, timestamp } = event.detail || {};
        
        if (!change) {
          console.log('Editor: Sync event received with no change data', event.detail);
          return;
        }
        
        console.log(`Editor: 📡 Sync change event at ${timestamp}`, { direction, change });
        
        // Skip if this is our own change (pushed to remote)
        if (direction === 'push') {
          console.log('Editor: Ignoring push event (own change).');
          return;
        }
        
        // If the current note was changed remotely, reload it
        if (direction === 'pull' && change.docs) {
          const currentNoteDoc = change.docs.find(doc => doc._id === NOTE_ID);
          if (currentNoteDoc) {
            console.log('Editor: 📡 Current note changed remotely, reloading...', { noteId: NOTE_ID, newRev: currentNoteDoc._rev });
            
            // Save current cursor and scroll position
            const currentSelection = editor.state.selection;
            const scrollPosition = window.scrollY;
            
            // Reload the note
            await loadNote(); // loadNote will update editor content and currentDocRev
            
            console.log('Editor: Note reloaded. Current rev:', currentDocRev, 'New rev from sync:', currentNoteDoc._rev);

            // Dispatch an event to notify other components
            const updatedEvent = new CustomEvent('note-updated', { 
              detail: { noteId: NOTE_ID, source: 'remote', newRev: currentNoteDoc._rev } 
            });
            window.dispatchEvent(updatedEvent);
            
            // Try to restore cursor position and scroll position
            try {
              if (currentSelection && editor && editor.state && editor.commands) {
                 // Ensure editor is in a valid state to apply selection
                if (editor.state.doc.content.size > 0) { 
                  editor.commands.setTextSelection(currentSelection);
                }
              }
              window.scrollTo(0, scrollPosition);
              console.log('Editor: Cursor and scroll position restored.');
            } catch (posErr) {
              console.warn('Editor: Could not restore cursor position:', posErr);
            }
          } else {
            console.log('Editor: Pull event, but not for the current note.');
          }
        } else {
          console.log('Editor: Sync event not a pull or no docs.', { direction, docs: change.docs });
        }
      } catch (err) {
        console.error('Editor: Error handling sync change:', err);
      }
    };
    
    // Handler for local database changes
    const handleLocalChange = async (event) => {
      try {
        const { change } = event.detail;
        
        // Skip changes that we initiated (those will be handled by the editor directly)
        // We're only interested in changes that came from sync
        if (change && change.doc && change.doc._id === NOTE_ID) {
          // Check if this change came from another source (like sync)
          // by comparing the current editor content with the new content
          const currentContent = editor.getHTML();
          const newContent = change.doc.content;
          
          if (currentContent !== newContent) {
            console.log('%c Editor: Note changed in local DB, reloading content', 'background: #e67e22; color: white; padding: 2px 5px; border-radius: 3px;');
            
            // Save current cursor position
            const currentSelection = editor.state.selection;
            const scrollPosition = window.scrollY;
            
            // Update editor content
            editor.commands.setContent(newContent, false);
            setCurrentDocRev(change.doc._rev);
            
            // Try to restore cursor position and scroll position
            try {
              editor.commands.setTextSelection(currentSelection);
              window.scrollTo(0, scrollPosition);
            } catch (posErr) {
              console.warn('Could not restore cursor position:', posErr);
            }
          }
        }
      } catch (err) {
        console.error('Error handling local change:', err);
      }
    };
    
    // Add event listeners for all sync events
    window.addEventListener('pouchdb-sync-change', handleSyncChange);
    window.addEventListener('pouchdb-local-change', handleLocalChange);
    
    // Log when sync events are received
    const logSyncEvent = (event) => {
      console.log(`Sync event received: ${event.type}`, event.detail);
    };
    
    window.addEventListener('pouchdb-sync-active', logSyncEvent);
    window.addEventListener('pouchdb-sync-paused', logSyncEvent);
    window.addEventListener('pouchdb-sync-complete', logSyncEvent);
    window.addEventListener('pouchdb-sync-error', logSyncEvent);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('pouchdb-sync-change', handleSyncChange);
      window.removeEventListener('pouchdb-local-change', handleLocalChange);
      window.removeEventListener('pouchdb-sync-active', logSyncEvent);
      window.removeEventListener('pouchdb-sync-paused', logSyncEvent);
      window.removeEventListener('pouchdb-sync-complete', logSyncEvent);
      window.removeEventListener('pouchdb-sync-error', logSyncEvent);
    };
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Effect to update placeholder text based on loading state
  useEffect(() => {
    if (editor && editor.extensionManager.extensions.find(ext => ext.name === 'placeholder')) {
      const placeholderExtension = editor.extensionManager.extensions.find(ext => ext.name === 'placeholder');
      placeholderExtension.options.placeholder = isLoading
        ? 'Loading note...'
        : 'Type / for commands or start typing...';
      // Trigger a view update to refresh the placeholder
      if (editor.view.docView) { // Check if docView exists to prevent errors on unmount
         editor.view.dispatch(editor.state.tr);
      }
    }
  }, [editor, isLoading]);

  return (
    <div
      ref={editorContainerRef}
      className="editor-container" 
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative', 
        background: '#1c2128', 
      }}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      tabIndex={0} 
    >
      {/* MenuBar disabled as per user preference */}
      <EditorContent 
        editor={editor} 
        style={{ 
          flexGrow: 1, 
          overflowY: 'auto',
          padding: '1rem',
          height: '100%',
          outline: 'none'
        }} 
      />
      <SlashCommandMenu editor={editor} />

    </div>
  );
}
