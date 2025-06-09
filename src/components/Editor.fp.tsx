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
import {
  editorModeAtom,
  editorTitleAtom,
  editorErrorAtom,
  editorLastSavedAtom,
  editorIsSavingAtom,
  editorInstanceAtom,
  createDatabaseServiceAtom,
  currentNoteIdAtom,
  commandMenuAtom
} from '../state/atoms';

import '../editor.css';
import '../backslash-menu.css';
import BackslashMenuWorking from '../extensions/BackslashMenuWorking';
import ReactDOM from 'react-dom';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Database } from '../services/database/db.fp';
import { NoteDocument } from '../types/note';
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
  const db = useRef<any>(null);
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
  const [commandMenu, setCommandMenu] = useAtom(commandMenuAtom);

  // Ensure db is initialized properly
  useEffect(() => {
    if (!db.current) {
      const PouchDB = (window as any).PouchDB;
      if (!PouchDB) {
        console.error('PouchDB is not loaded');
        setError('PouchDB is not available');
        return;
      }
      db.current = createDb(new PouchDB('notes'));
    }
    
    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Simple promise-based saveNote to avoid fp-ts complexity
  const saveNote = useCallback(async (html: string) => {
    if (!noteId || !db.current) return;
    
    // Debounce saves to prevent excessive calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(async () => {
      try {
        setIsSaving(true);
        
        // Use direct PouchDB calls instead of fp-ts TaskEither
        try {
          // First try to get the document to get current revision
          const existingDoc = await db.current.get(noteId);
          
          // Update the existing document
          const updatedDoc = await db.current.put({
            ...existingDoc,
            content: html,
            title: title || 'Untitled Note',
            updatedAt: new Date().toISOString()
          });
          
          lastSavedContent.current = html;
          lastSavedRevRef.current = updatedDoc.rev;
          setLastSaved(new Date());
          setError(null);
          
        } catch (updateError: any) {
          // If document doesn't exist, create it
          if (updateError.status === 404 || updateError.name === 'not_found') {
            try {
              const newDoc = await db.current.put({
                _id: noteId,
                content: html,
                title: title || 'Untitled Note',
                type: 'note',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              
              lastSavedContent.current = html;
              lastSavedRevRef.current = newDoc.rev;
              setLastSaved(new Date());
              setError(null);
              
            } catch (createError) {
              setError('Failed to save note');
              console.error('Error creating note:', createError);
            }
          } else {
            setError('Failed to save note');
            console.error('Error updating note:', updateError);
          }
        }
      } catch (error) {
        setError('Failed to save note');
        console.error('Error in saveNote:', error);
      } finally {
        setIsSaving(false);
      }
    }, 500); // 500ms debounce
  }, [noteId, title, db]);

  const extractTitleFromContent = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const firstHeading = tempDiv.querySelector('h1, h2, h3');
    return firstHeading ? firstHeading.textContent || '' : '';
  };

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
      saveNote(html);
      const title = extractTitleFromContent(html);
      if (title) {
        setTitleAtom(title);
        if (onTitleChange) {
          onTitleChange(title);
        }
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
      if (!db.current) {
        setErrorAtom('Database not initialized');
        return;
      }
      setErrorAtom(null);
      try {
        // Use direct PouchDB call instead of fp-ts TaskEither
        const note = await db.current.get(noteId);
        
        let extractedTitle = note.title || '';
        
        if (!extractedTitle && note.content) {
          try {
            // For now, just use a simple fallback since title extraction is complex
            extractedTitle = 'Untitled Note';
          } catch (e) {
            console.error('Error extracting title from content:', e);
            extractedTitle = 'Untitled Note';
          }
        }
        
        setTitleAtom(extractedTitle);
        
        const titleEvent = new CustomEvent('cogneez:note:title', { 
          detail: { title: extractedTitle, noteId } 
        });
        document.dispatchEvent(titleEvent);
        
        let contentToSet;
        try {
          contentToSet = typeof note.content === 'string' 
            ? JSON.parse(note.content) 
            : note.content || { type: 'doc', content: [] };
        } catch (e) {
          console.error('Error parsing note content:', e);
          contentToSet = { type: 'doc', content: [] };
        }
        
        lastSavedContent.current = JSON.stringify(contentToSet);
        
        if (editorInstance) {
          editorInstance.commands.setContent(contentToSet);
        }
      } catch (err: any) {
        setErrorAtom(err.message || 'Failed to load note');
        console.error('Error in loadNote:', err);
      }
    };
    
    loadNoteData();
  }, [noteId, editorInstance, db, setTitleAtom, setErrorAtom, setCurrentNoteId]);

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

  // Set up PouchDB changes feed
  useEffect(() => {
    if (!noteId || !editorInstance) return;
    if (!db.current) return;
    const changes = db.current.changes({
      since: 'now',
      live: true,
      include_docs: true,
      doc_ids: [noteId],
      conflicts: true
    });
    
    let lastChangeTime = 0;
    const MIN_CHANGE_INTERVAL = 50;
    
    changes.on('change', async (change: any) => {
      if (!change.doc || isApplyingRemoteUpdate.current) return;
      
      const now = Date.now();
      if (now - lastChangeTime < MIN_CHANGE_INTERVAL) return;
      lastChangeTime = now;
      
      try {
        const doc = change.doc;
        
        if (lastSavedRevRef.current === doc._rev) {
          lastSavedRevRef.current = '';
          return;
        }
        
        requestAnimationFrame(() => {
          try {
            const currentContent = editorInstance.getJSON();
            
            let remoteContent;
            try {
              remoteContent = typeof doc.content === 'string' 
                ? JSON.parse(doc.content)
                : doc.content;
              
              if (JSON.stringify(currentContent) !== JSON.stringify(remoteContent)) {
                isApplyingRemoteUpdate.current = true;
                editorInstance.commands.setContent(remoteContent);
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
      if (changes && typeof changes.cancel === 'function') {
        changes.cancel();
      }
    };
  }, [noteId, editorInstance, db]);

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
