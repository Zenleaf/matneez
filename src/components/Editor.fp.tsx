import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Editor as TiptapEditor, useEditor, EditorContent, BubbleMenu, Range } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useAtom } from 'jotai';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as F from 'fp-ts/function';
import { extractTitleFromContent } from '../utils/noteUtils';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { NoteDocument } from '../types/note';
import {
  editorModeAtom,
  editorTitleAtom,
  editorErrorAtom,
  editorLastSavedAtom,
  editorIsSavingAtom,
  editorInstanceAtom,
  createDatabaseServiceAtom,
  currentNoteIdAtom
} from '../state/atoms';

import '../editor.css';
import '../backslash-menu.css';
import BackslashMenuWorking from '../extensions/BackslashMenuWorking';
import ReactDOM from 'react-dom';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Database } from '../services/database/db.fp';
import { createNotesServiceFp } from '../services/database/notes';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

import { createDb } from '../services/database/db.fp';
import { pipe } from 'fp-ts/function';

interface EditorProps {
  noteId: string;
  initialContent?: string;
  initialTitle?: string;
  onTitleChange?: (title: string) => void;
}

const Editor: React.FC<EditorProps> = ({ 
  noteId, 
  initialContent = '', 
  initialTitle = '', 
  onTitleChange 
}) => {
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle);
  const [editorMode, setEditorMode] = useState<'reading' | 'editing'>('editing');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const notesService = useRef<any>(null);
  const lastSavedContent = useRef<string>('');
  const lastSavedRevRef = useRef<string>('');
  const isApplyingRemoteUpdate = useRef(false);
  const debounceTimeoutRef = useRef<number | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const lastTapTime = useRef(0);
  const tapTimeout = useRef<number | null>(null);
  const tapPosition = useRef({ x: 0, y: 0 });

  // Jotai atoms
  const [editorModeAtomState, setEditorModeAtom] = useAtom(editorModeAtom);
  const [titleAtom, setTitleAtom] = useAtom(editorTitleAtom);
  const [errorAtom, setErrorAtom] = useAtom(editorErrorAtom);
  const [lastSavedAtom, setLastSavedAtom] = useAtom(editorLastSavedAtom);
  const [isSavingAtom, setIsSavingAtom] = useAtom(editorIsSavingAtom);
  const [editorAtom, setEditorAtom] = useAtom(editorInstanceAtom);
  const [dbAtom] = useAtom(createDatabaseServiceAtom);
  const [currentNoteId, setCurrentNoteId] = useAtom(currentNoteIdAtom);

  // Get the global notes service instead of creating our own database
  useEffect(() => {
    // Access the global notes service that was created in App.tsx
    const globalAppState = (window as any).cogneezAppState;
    if (globalAppState && globalAppState.notesService) {
      notesService.current = globalAppState.notesService;
    } else {
      console.warn('Global notes service not available - creating fallback');
      // Fallback to creating our own service if global one isn't available
      const PouchDB = (window as any).PouchDB;
      if (PouchDB) {
        const rawDb = new PouchDB('notes');
        notesService.current = {
          get: (id: string) => TE.tryCatch(
            () => rawDb.get(id), 
            (e) => e as Error
          ),
          update: (id: string, updates: any) => TE.tryCatch(
            () => {
              return rawDb.get(id).then((doc: any) => {
                const updated = { ...doc, ...updates, updatedAt: new Date().toISOString() };
                return rawDb.put(updated).then(() => updated);
              });
            },
            (e) => e as Error
          )
        };
      }
    }
    
    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const extractTitleFromContent = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Try to find a heading first
    const firstHeading = tempDiv.querySelector('h1, h2, h3, h4, h5, h6');
    if (firstHeading && firstHeading.textContent?.trim()) {
      return firstHeading.textContent.trim().substring(0, 100); // Limit to 100 chars
    }
    
    // If no heading, try to get first paragraph
    const firstParagraph = tempDiv.querySelector('p');
    if (firstParagraph && firstParagraph.textContent?.trim()) {
      return firstParagraph.textContent.trim().substring(0, 50) + '...'; // Limit to 50 chars with ellipsis
    }
    
    // If no paragraph, get any text content
    const textContent = tempDiv.textContent?.trim();
    if (textContent) {
      return textContent.substring(0, 50) + '...'; // Limit to 50 chars with ellipsis
    }
    
    return 'Untitled Note';
  };

  // Updated saveNote function to use the global notes service
  const saveNote = useCallback(async (html: string) => {
    if (!noteId || !notesService.current) {
      console.warn('Cannot save: missing noteId or notesService');
      return;
    }
    
    // Debounce saves to prevent excessive calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(async () => {
      try {
        setIsSaving(true);
        console.log('🔄 Saving note:', noteId);
        
        // Extract title from the current editor content
        const extractedTitle = extractTitleFromContent(html) || 'Untitled Note';
        setTitle(extractedTitle);
        
        // Use the global notes service for consistent storage
        const updateResult = await notesService.current.update(noteId, {
          content: html, // Store HTML directly as the App expects it
          title: extractedTitle
        })();
        
        if (E.isRight(updateResult)) {
          setLastSaved(new Date());
          lastSavedContent.current = html;
          console.log('✅ Note saved successfully:', noteId);
          
          // Dispatch title change event for the navbar
          const event = new CustomEvent('cogneez:note:title', { 
            detail: { noteId, title: extractedTitle } 
          });
          document.dispatchEvent(event);
        } else {
          console.error('❌ Failed to save note:', updateResult.left);
          setError(`Failed to save: ${updateResult.left.message}`);
        }
      } catch (err) {
        console.error('❌ Save error:', err);
        setError(`Save error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsSaving(false);
      }
    }, 500); // 500ms debounce
  }, [noteId]);

  const editorInstance = useEditor({
    extensions: [
      StarterKit.configure({
        // Keep all StarterKit extensions enabled
      }),
      Underline,
      TaskList,
      TaskItem,
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      Typography,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Subscript,
      Superscript,
      Placeholder.configure({
        placeholder: 'Type / for commands...',
      }),
      BackslashMenuWorking,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      // Auto-save on every update with debouncing handled in saveNote
      saveNote(html);
      
      // Update title
      const extractedTitle = extractTitleFromContent(html) || 'Untitled Note';
      setTitle(extractedTitle);
      setTitleAtom(extractedTitle);
      if (onTitleChange) {
        onTitleChange(extractedTitle);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  // Set editor instance in atom
  useEffect(() => {
    setEditorAtom(editorInstance);
    // Auto-focus the editor when it's ready
    if (editorInstance) {
      setTimeout(() => {
        editorInstance.commands.focus();
      }, 100);
    }
  }, [editorInstance, setEditorAtom]);

  // Load note when noteId changes
  useEffect(() => {
    if (!noteId) {
      setTitleAtom('');
      if (editorInstance) {
        editorInstance.commands.setContent({ type: 'doc', content: [] });
      }
      return;
    }

    setCurrentNoteId(noteId);
    const loadNoteData = async () => {
      if (!notesService.current) {
        setErrorAtom('Database not initialized');
        return;
      }
      setErrorAtom(null);
      try {
        // Use the global notes service for consistent loading
        const noteResult = await notesService.current.get(noteId)();
        
        if (E.isLeft(noteResult)) {
          console.error('Note not found or error loading:', noteResult.left);
          const errorMessage = noteResult.left instanceof Error 
            ? noteResult.left.message 
            : 'Unknown error loading note';
          setErrorAtom(`Failed to load note: ${errorMessage}`);
          return;
        }
        
        const note = noteResult.right as NoteDocument;
        let extractedTitle = note.title || '';
        let noteContent = note.content || '';
        
        // Handle both JSON and HTML content formats
        if (typeof noteContent === 'string') {
          try {
            // Try to parse as JSON first (for new format)
            const parsed = JSON.parse(noteContent);
            if (parsed && typeof parsed === 'object') {
              // Convert JSON back to HTML for Tiptap
              noteContent = '<p></p>'; // Default if conversion fails
              extractedTitle = extractedTitle || extractTitleFromContent(noteContent);
            }
          } catch {
            // If JSON parsing fails, treat as HTML (legacy format)
            // noteContent is already a string, no conversion needed
            extractedTitle = extractedTitle || extractTitleFromContent(noteContent);
          }
        }
        
        if (!extractedTitle) {
          extractedTitle = extractTitleFromContent(noteContent) || 'Untitled Note';
        }
        
        setTitleAtom(extractedTitle);
        
        if (editorInstance && !isApplyingRemoteUpdate.current) {
          console.log('🔄 Loading note content into editor');
          const currentContent = editorInstance.getHTML();
          if (currentContent !== noteContent) {
            editorInstance.commands.setContent(noteContent);
          }
        }
        
        lastSavedContent.current = noteContent;
        setContent(noteContent);
        setTitle(extractedTitle);
        
        // Clear any previous errors
        setError(null);
        setErrorAtom(null);
      } catch (error) {
        console.error('❌ Error loading note:', error);
        setErrorAtom(`Error loading note: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    
    loadNoteData();
  }, [noteId, editorInstance, notesService, setTitleAtom, setErrorAtom, setCurrentNoteId]);

  // Handle entering edit mode
  const handleEnterEditMode = useCallback((position?: { x: number, y: number }) => {
    setEditorMode('editing');
    
    if (editorInstance) {
      setTimeout(() => {
        if (position) {
          const pos = editorInstance.view.posAtCoords({ left: position.x, top: position.y });
          if (pos) {
            editorInstance.commands.setTextSelection(pos.pos);
          }
        }
        editorInstance.commands.focus();
      }, 0);
    }
  }, [editorInstance, setEditorMode]);

  // Set up event listeners
  useEffect(() => {
    if (!editorInstance) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleEnterEditMode = () => {
      setEditorMode('editing');
    };

    editorInstance.view.dom.addEventListener('touchstart', handleTouchStart, { passive: false });
    editorInstance.view.dom.addEventListener('touchmove', handleTouchMove, { passive: false });
    editorInstance.view.dom.addEventListener('touchend', handleTouchEnd, { passive: false });
    editorInstance.view.dom.addEventListener('click', handleEnterEditMode);

    return () => {
      editorInstance.view.dom.removeEventListener('touchstart', handleTouchStart);
      editorInstance.view.dom.removeEventListener('touchmove', handleTouchMove);
      editorInstance.view.dom.removeEventListener('touchend', handleTouchEnd);
      editorInstance.view.dom.removeEventListener('click', handleEnterEditMode);
    };
  }, [editorInstance, setEditorMode]);

  // Listen for external note changes via custom events (App.tsx handles the database changes)
  useEffect(() => {
    if (!noteId || !editorInstance) return;
    
    const handleDocChange = () => {
      // Reload the current note when external changes are detected
      const loadNoteData = async () => {
        if (!notesService.current) return;
        
        try {
          const noteResult = await notesService.current.get(noteId)();
          
          if (E.isRight(noteResult)) {
            const note = noteResult.right as NoteDocument;
            let noteContent = note.content || '';
            
            // Handle both JSON and HTML content formats
            if (typeof noteContent === 'string') {
              try {
                const parsed = JSON.parse(noteContent);
                if (parsed && typeof parsed === 'object') {
                  noteContent = '<p></p>'; // Default if conversion fails
                }
              } catch {
                // If JSON parsing fails, treat as HTML (legacy format)
              }
            }
            
            const currentContent = editorInstance.getHTML();
            if (currentContent !== noteContent) {
              console.log('🔄 Applying external change to editor');
              editorInstance.commands.setContent(noteContent);
              lastSavedContent.current = noteContent;
            }
          }
        } catch (error) {
          console.error('❌ Error loading external change:', error);
        }
      };
      
      loadNoteData();
    };
    
    // Listen for the custom event dispatched by App.tsx when notes change
    document.addEventListener('cogneez:doc:change', handleDocChange);
    
    return () => {
      document.removeEventListener('cogneez:doc:change', handleDocChange);
    };
  }, [noteId, editorInstance, notesService]);

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
        isolation: 'isolate',
        touchAction: 'auto',
        userSelect: 'text',
        WebkitUserSelect: 'text'
      }}
    >
      <EditorBubbleMenu />
      
      <EditorContent 
        editor={editorInstance} 
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
  );
};

export default Editor;
