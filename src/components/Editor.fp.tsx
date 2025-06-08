import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, BubbleMenu } from '@tiptap/react';
import '../editor.css'; // Import editor styles
import { createNotesService } from '../services/notes/notes.service';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as F from 'fp-ts/function';
import type { Database } from '../types/db';

interface EditorProps {
  noteId?: string;
}

type EditorMode = 'reading' | 'editing';

interface SelectionState {
  open: boolean;
  position: { x: number; y: number };
  text: string;
  html: string;
}

interface CommandItem {
  title: string;
  description: string;
  icon: string; // Or React.ReactNode if using icons as components
  command: (editor: TiptapEditor) => void;
}

export const Editor: React.FC<EditorProps> = ({ noteId }) => {
  const [selectedNodeState, setSelectedNodeState] = useState<SelectionState>({ open: false, position: { x: 0, y: 0 }, text: '', html: '' });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialContent, setInitialContent] = useState<any>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('reading');
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');

  // Initialize database and notes service
  const notesServiceRef = useRef(() => {
    if (typeof window !== 'undefined' && (window as any).PouchDB) {
      const pouchdb = new (window as any).PouchDB('notes');
      const db: Database = {
        get: (id: string) => pouchdb.get(id),
        put: (doc: any) => pouchdb.put(doc),
        remove: (doc: any, rev?: string) => 
          typeof doc === 'string' ? pouchdb.remove(doc, rev) : pouchdb.remove(doc),
        find: (query: any) => pouchdb.find(query),
        changes: (options: any = {}) => ({
          on: (event: string, handler: (change: any) => void) => 
            pouchdb.changes(options).on(event, handler),
          off: (event: string, handler: (change: any) => void) => 
            pouchdb.changes(options).off(event, handler),
          cancel: () => pouchdb.changes(options).cancel()
        }),
        destroy: () => pouchdb.destroy(),
        sync: (remoteDb: string | Database<any>, options?: any) => 
          pouchdb.sync(remoteDb, options),
        info: () => pouchdb.info(),
        createIndex: (options: any) => pouchdb.createIndex(options)
      };
      return createNotesService(db);
    }
    throw new Error('PouchDB not available');
  });

  // Create editor instance
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Double-tap to edit, press \\ for commands...'
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'editor-content',
        style: `
          height: 100%;
          width: 100%;
          padding: 3rem 12rem 3rem 3rem;
          box-sizing: border-box;
          -webkit-overflow-scrolling: touch;
          overflow-y: auto;
          outline: none;
          position: relative;
          z-index: 1;
          user-select: text;
          -webkit-user-select: text;
          -webkit-touch-callout: default;
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        `
      },
      handleDOMEvents: {
        blur: () => {
          setEditorMode('reading');
          return false;
        }
      },
    },
    onUpdate: ({ editor }) => {
      if (isApplyingRemoteUpdate.current) return;
      
      const content = editor.getJSON();
      const contentStr = JSON.stringify(content);
      const currentTitle = '';
      
      // Skip if content hasn't changed
      if (lastSavedContent.current === contentStr) return;
      
      // Clear any pending save
      if (pendingSave.current) {
        clearTimeout(pendingSave.current);
      }
      
      // Clear any pending save
      if (pendingSave.current) {
        clearTimeout(pendingSave.current);
      }
      
      // Use a shorter debounce for better responsiveness
      pendingSave.current = window.setTimeout(async () => {
        try {
          if (!noteId) return;
          
          const notesService = notesServiceRef.current();
          if (!notesService) return;
          
          // Skip if content hasn't changed since last save
          if (lastSavedContent.current === contentStr) return;
          
          // Get latest doc to handle conflicts
          const result = await notesService.get(noteId)();
          if (E.isRight(result)) {
            const currentDoc = result.right;
            const contentString = JSON.stringify(content);
            
            // Skip if content is the same as the one we're about to save
            if (currentDoc.content === contentString) {
              lastSavedContent.current = contentStr;
              return;
            }
            
            const update = {
              ...currentDoc,
              title: currentTitle,
              content: contentString,
              updatedAt: new Date().toISOString()
            };
            
            const saveResult = await notesService.update(noteId, update)();
            if (E.isRight(saveResult)) {
              lastSavedContent.current = contentStr;
              if (saveResult.right?.rev) {
                pendingSave.current = saveResult.right.rev;
              }
            }
          }
        } catch (error) {
          console.error('Error saving note:', error);
        }
      }, 100); // Reduced from 500ms to 100ms for better responsiveness
      
      return () => {
        if (pendingSave.current) {
          clearTimeout(pendingSave.current);
        }
      };
    },
  });

  // Save note function with debounce
  const saveNote = useCallback((title: string, content: any): Promise<void> => {
    if (!noteId || !content) return Promise.resolve();
    
    setIsSaving(true);
    
    return new Promise<void>((resolve, reject) => {
      const notesService = notesServiceRef.current();
      
      notesService.update(noteId, { 
        title, 
        content,
        updatedAt: new Date().toISOString()
      })().then(result => {
        if (E.isLeft(result)) {
          setError('Failed to save note');
          console.error('Error saving note:', result.left);
          reject(result.left);
        } else {
          setLastSaved(new Date());
          setError(null);
          resolve();
        }
      }).catch(err => {
        setError(err.message || 'Failed to save note');
        console.error('Exception saving note:', err);
        reject(err);
      }).finally(() => {
        setIsSaving(false);
      });
    });
  }, [noteId]);

  // Load note when noteId changes
  useEffect(() => {
    if (!noteId) {
      setTitle('');
      setInitialContent(null);
      return;
    }

    const loadNote = async () => {
      setError(null);
      try {
        const notesService = notesServiceRef.current();
        const result = await notesService.get(noteId)();
        
        if (E.isLeft(result)) {
          setError('Failed to load note');
          console.error('Error loading note:', result.left);
        } else {
          const note = result.right;
          setTitle(note.title || '');
          
          // Parse content if it's a string, otherwise use as is or default
          let contentToSet;
          try {
            contentToSet = typeof note.content === 'string' 
              ? JSON.parse(note.content) 
              : note.content || { type: 'doc', content: [] };
          } catch (e) {
            console.error('Error parsing note content:', e);
            contentToSet = { type: 'doc', content: [] };
          }
          
          // Update last saved content reference
          lastSavedContent.current = JSON.stringify(contentToSet);
          
          // If editor already exists, update its content directly
          if (editor) {
            editor.commands.setContent(contentToSet);
          } else {
            // Otherwise set initial content for when editor initializes
            setInitialContent(contentToSet);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load note');
        console.error('Error in loadNote:', err);
      }
    };
    
    loadNote();
  }, [noteId, editor]);

  // Update editor content when initial content changes
  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  // Track tap events and timeouts for mobile interaction
  const lastTapTime = useRef(0);
  const tapTimeout = useRef<number | null>(null);
  const tapPosition = useRef({ x: 0, y: 0 });
  
  // Handle entering edit mode for double-tap and button interactions
  const handleEnterEditMode = useCallback((position?: { x: number, y: number }) => {
    setEditorMode('editing');
    
    if (editor) {
      setTimeout(() => {
        if (position) {
          // Focus at specific position
          const pos = editor.view.posAtCoords({ left: position.x, top: position.y });
          if (pos) {
            const { TextSelection } = editor.state.selection.constructor as any;
            const tr = editor.state.tr;
            const resolvedPos = editor.state.doc.resolve(pos.pos);
            const selection = TextSelection.near(resolvedPos);
            tr.setSelection(selection);
            editor.view.dispatch(tr);
          }
        }
        editor.commands.focus();
      }, 10);
    }
  }, [editor]);
  
  // Set up simplified event handlers for mobile and desktop
  useEffect(() => {
    const editorElement = editor?.options.element;
    if (!editorElement) return;

    // Mobile touch handler with double-tap detection
    const handleTouch = (e: Event) => {
      const touchEvent = e as unknown as TouchEvent;
      if (!touchEvent.touches || touchEvent.touches.length === 0) return;
      
      // Get touch position
      const touch = touchEvent.touches[0];
      tapPosition.current = { x: touch.clientX, y: touch.clientY };
      const currentTime = Date.now();
      const timeSinceLastTap = currentTime - lastTapTime.current;
      
      // Check for double tap (two taps within 300ms)
      if (timeSinceLastTap < 300 && timeSinceLastTap > 10) {  
        // It's a double tap - enter edit mode
        if (tapTimeout.current) {
          window.clearTimeout(tapTimeout.current);
          tapTimeout.current = null;
        }
        
        e.preventDefault();
        handleEnterEditMode(tapPosition.current);
      } else {
        // First tap - start timer to detect potential second tap
        if (tapTimeout.current) {
          window.clearTimeout(tapTimeout.current);
        }
        
        tapTimeout.current = window.setTimeout(() => {
          tapTimeout.current = null;
        }, 300);
      }
      
      lastTapTime.current = currentTime;
    };

    // Desktop click handler - simpler as no double-click needed
    const handleClick = (e: Event) => {
      const mouseEvent = e as unknown as MouseEvent;
      
      // For desktop, a single click can enter edit mode
      if (editorMode !== 'editing') {
        handleEnterEditMode({ x: mouseEvent.clientX, y: mouseEvent.clientY });
      }
    };

    // Add event listeners with proper type casting
    editorElement.addEventListener('touchstart', handleTouch as EventListener, { 
      passive: false  // Need this to allow preventDefault
    });
    
    editorElement.addEventListener('click', handleClick as EventListener, false);
    
    // Clean up
    return () => {
      editorElement.removeEventListener('touchstart', handleTouch as EventListener);
      editorElement.removeEventListener('click', handleClick as EventListener);
      
      if (tapTimeout.current) {
        window.clearTimeout(tapTimeout.current);
      }
    };
  }, [editor, editorMode, handleEnterEditMode]);

  
  // Track last saved content to detect changes
  const lastSavedContent = useRef<any>(null);
  const isApplyingRemoteUpdate = useRef(false);
  const pendingSave = useRef<number | null>(null);
  
  // Set up PouchDB changes feed for real-time updates
  useEffect(() => {
    if (!noteId || !editor) return;
    
    const db = new (window as any).PouchDB('notes');
    
    const changes = db.changes({
      since: 'now',
      live: true,
      include_docs: true,
      doc_ids: [noteId],
      conflicts: true
    });
    
    let lastChangeTime = 0;
    const MIN_CHANGE_INTERVAL = 50; // ms
    
    changes.on('change', async (change: any) => {
      if (!change.doc || isApplyingRemoteUpdate.current) return;
      
      const now = Date.now();
      if (now - lastChangeTime < MIN_CHANGE_INTERVAL) {
        return; // Skip if changes are coming in too fast
      }
      lastChangeTime = now;
      
      try {
        const doc = change.doc;
        
        // Skip if this is our own pending save
        if (pendingSave.current === doc._rev) {
          pendingSave.current = null;
          return;
        }
        
        // Optimistically update the UI
        requestAnimationFrame(() => {
          try {
            const currentContent = editor.getJSON();
            
            // Parse remote content if it's a string
            let remoteContent;
            try {
              remoteContent = typeof doc.content === 'string' 
                ? JSON.parse(doc.content)
                : doc.content;
              
              // Skip if content is the same
              if (JSON.stringify(currentContent) !== JSON.stringify(remoteContent)) {
                isApplyingRemoteUpdate.current = true;
                editor.commands.setContent(remoteContent);
                lastSavedContent.current = JSON.stringify(remoteContent);
              }
            } catch (e) {
              console.error('Error parsing remote content:', e);
              return;
            }
          } finally {
            isApplyingRemoteUpdate.current = false;
          }
        });
        
      } catch (error) {
        console.error('Error applying remote update:', error);
        isApplyingRemoteUpdate.current = false;
      }
    });
    
    return () => {
      changes.cancel();
    };
  }, [noteId, editor]);

  useEffect(() => {
    const editorContainer = editorContainerRef.current;
    if (editorContainer) {
      const handleDoubleClick = () => {
        handleEnterEditMode();
      };

      const lastTapTime = { current: 0 };
      const handleTap = () => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
          handleEnterEditMode();
        }
        lastTapTime.current = now;
      };

      editorContainer.addEventListener('dblclick', handleDoubleClick);
      editorContainer.addEventListener('click', handleTap);
      editorContainer.addEventListener('touchend', handleTap);

      return () => {
        // Check editorContainer again for safety in cleanup as it might be null if component unmounted quickly
        if (editorContainerRef.current) { 
          editorContainerRef.current.removeEventListener('dblclick', handleDoubleClick);
          editorContainerRef.current.removeEventListener('click', handleTap);
          editorContainerRef.current.removeEventListener('touchend', handleTap);
        }
      };
    }
  }, [handleEnterEditMode]); // editorContainerRef is stable, so not needed as dependency

// Command menu state
const [showCommandMenu, setShowCommandMenu] = useState(false);
const [commandMenuPosition, setCommandMenuPosition] = useState({ top: 0, left: 0 });
const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
const commandMenuRef = useRef<HTMLDivElement>(null);

// Available commands
const commands: CommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Big section heading',
    icon: 'H1',
    command: (editor: TiptapEditor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    command: (editor: TiptapEditor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: '•',
    command: (editor: TiptapEditor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: '1.',
    command: (editor: TiptapEditor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Code Block',
    description: 'Insert a code block',
    icon: '</>',
    command: (editor: TiptapEditor) => editor.chain().focus().toggleCodeBlock().run(),
  },
];

const executeCommand = (item: CommandItem) => {
  if (editor) {
    item.command(editor);
    setShowCommandMenu(false); // Hide menu after execution
  }
};

  // Handle slash command
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!editor) return;

    // Show command menu on backslash
    if (e.key === '\\') {
      e.preventDefault();
      const { from } = editor.state.selection;
      const { top, left } = editor.view.coordsAtPos(from);
      setCommandMenuPosition({ top: top + 24, left });
      setShowCommandMenu(true);
      setSelectedCommandIndex(0);
      return;
    }

    // Handle command menu navigation
    if (showCommandMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev < commands.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const command = commands[selectedCommandIndex];
        if (command) {
          command.command(editor);
          setShowCommandMenu(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandMenu(false);
      }
    }
  }, [editor, showCommandMenu, selectedCommandIndex, commands]);
// Editor styles and state
const editorStyles = {
  '--color-primary': '#3b82f6',
  '--color-bg': '#111827',
  '--color-surface': '#1f2937',
  '--color-text': '#e5e7eb',
  '--color-text-secondary': '#9ca3af',
  '--color-border': '#374151',
  '--color-hover': '#374151',
} as React.CSSProperties;



  return (
    <div 
      ref={editorContainerRef}
      className="editor-container"
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: '#1c2128',
        color: '#c9d1d9',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // Optimize for touch devices
        isolation: 'isolate',
        touchAction: 'auto',
        userSelect: 'text',
        WebkitUserSelect: 'text'
      }}
      // No need for custom onTouchStart handler here anymore
      // The event listeners we added will handle touch events
    >
      {/* Command Menu */}
      {showCommandMenu && (
        <div
          ref={commandMenuRef}
          className="absolute z-50 w-64 bg-gray-800 rounded-md shadow-lg border border-gray-700 overflow-hidden"
          style={{
            top: `${commandMenuPosition.top}px`,
            left: `${commandMenuPosition.left}px`,
          }}
        >
          <div className="p-1">
            <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
              Type to filter, ↓↑ to navigate, Enter to select
            </div>
            <div className="max-h-80 overflow-y-auto">
              {commands.map((command, index) => (
                <button
                  key={command.title}
                  className={`w-full text-left px-3 py-2 flex items-center space-x-3 ${
                    index === selectedCommandIndex ? 'bg-gray-700' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => executeCommand(command)}
                >
                  <div className="w-8 h-8 rounded-md bg-gray-700 flex items-center justify-center text-sm font-medium">
                    {command.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{command.title}</div>
                    <div className="text-xs text-gray-400 truncate">{command.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Title header removed as requested */}
      
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {editor && (
          <BubbleMenu 
            editor={editor} 
            tippyOptions={{ duration: 100, theme: 'dark' }}
            className="bg-gray-800 p-1 rounded shadow-lg flex space-x-1"
          >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1 px-2 rounded ${editor.isActive('bold') ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1 px-2 rounded ${editor.isActive('italic') ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1 px-2 rounded ${editor.isActive('code') ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              title="Code"
            >
              &lt;&gt;
            </button>
          </BubbleMenu>
        )}
        {/* EditorContent is now directly inside the scrollable, padded, flex-1 container */}
        <EditorContent 
          editor={editor} 
          onBlur={() => setEditorMode('reading')}
          style={{
            height: '100%',
            width: '100%',
            flex: '1 1 auto',
            overflow: 'auto',
            textAlign: 'left',
            margin: '0',
            pointerEvents: 'auto',
            cursor: editorMode === 'editing' ? 'text' : 'default',
            '--tw-prose-body': 'var(--color-text)',
            '--tw-prose-headings': 'var(--color-text)',
            '--tw-prose-links': 'var(--color-primary)',
            '--tw-prose-code': 'var(--color-text)',
            '--tw-prose-code-bg': 'var(--color-surface)',
            '--tw-prose-hr': 'var(--color-border)',
            '--tw-prose-quote-borders': 'var(--color-border)',
            '--tw-prose-quotes': 'var(--color-text-secondary)',
            '--tw-prose-pre-bg': 'var(--color-surface)',
            '--tw-prose-pre-code': 'var(--color-text)',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

export default Editor;
