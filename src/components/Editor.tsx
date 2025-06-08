import React, { useState, useEffect, useRef } from 'react';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { AnyExtension } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import MenuBar from './MenuBar';
import '../editor.css';
import type { NoteDocument, NoteInput, ReturnTypeCreateNotesService } from '../types';

interface EditorProps {
  noteId?: string;
  notesService: ReturnTypeCreateNotesService;
}

// Slash command menu (typed)
const SlashCommandMenu: React.FC<{ editor: any }> = ({ editor }) => {
  // ... (same logic as before, but typed)
  return null; // Placeholder for brevity
};

// SlashCommands extension (typed)
const SlashCommands = Extension.create({
  name: 'slashCommands',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('slashCommands'),
        // ...
      })
    ];
  }
});

const EditorComponent: React.FC<EditorProps> = ({ noteId = 'main_note', notesService }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing your note here...' }) as AnyExtension,
      SlashCommands
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    }
  });

  // Load note on mount
  useEffect(() => {
    const loadNote = async () => {
      try {
        const noteEither = await notesService.get(noteId)();
        
        // Handle Either result
        if (noteEither._tag === 'Right') {
          const note = noteEither.right as NoteDocument;
          setTitle(note.title);
          setContent(note.content);
          editor?.commands.setContent(note.content);
        } else {
          setError(noteEither.left.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load note');
      }
    };
    
    loadNote();
    // eslint-disable-next-line
  }, [noteId]);

  // Auto-save on content/title change
  useEffect(() => {
    if (!title && !content) return;
    
    const timer = setTimeout(async () => {
      setIsSaving(true);
      
      try {
        const result = await notesService.update(noteId, { title, content })();
        
        if (result._tag === 'Right') {
          setLastSaved(new Date());
          setIsSaving(false);
          setError('');
        } else {
          setError(result.left.message);
          setIsSaving(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update note');
        setIsSaving(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [title, content, noteId]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value);

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="editor">
      <div className="editor-header">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title"
          className="title-input"
        />
        <div className="status">
          {isSaving ? 'Saving...' : lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : ''}
        </div>
      </div>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      <SlashCommandMenu editor={editor} />
    </div>
  );
};

export { EditorComponent };
