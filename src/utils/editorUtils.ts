import { Editor as TiptapEditor } from '@tiptap/react';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { createNotesService } from '../services/notes/notes.service';
import type { Database } from '../types/db';

export interface CommandItem {
  title: string;
  description: string;
  icon: string;
  shortcut?: string;
  command: (editor: TiptapEditor) => void;
}

export const defaultCommands: CommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Big section heading',
    icon: 'H1',
    shortcut: '⌘1',
    command: (editor: TiptapEditor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    shortcut: '⌘2',
    command: (editor: TiptapEditor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: '•',
    shortcut: '⌘⇧8',
    command: (editor: TiptapEditor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: '1.',
    shortcut: '⌘⇧7',
    command: (editor: TiptapEditor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Code Block',
    description: 'Insert a code block',
    icon: '</>',
    shortcut: '⌘⇧C',
    command: (editor: TiptapEditor) => editor.chain().focus().toggleCodeBlock().run(),
  },
];

export const saveNote = (db: Database, noteId: string, content: any, title: string) => {
  return TE.tryCatch(
    async () => {
      const notesService = createNotesService(db);
      const result = await notesService.update(noteId, {
        title,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        updatedAt: new Date().toISOString()
      })();
      
      if (E.isLeft(result)) {
        throw new Error('Failed to save note');
      }
      
      return result.right;
    },
    (error) => error as Error
  );
};

export const loadNote = (db: Database, noteId: string) => {
  return TE.tryCatch(
    async () => {
      const notesService = createNotesService(db);
      const result = await notesService.get(noteId)();
      
      if (E.isLeft(result)) {
        throw new Error('Failed to load note');
      }
      
      return result.right;
    },
    (error) => error as Error
  );
}; 