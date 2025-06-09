import { atom } from 'jotai';
import { Editor as TiptapEditor } from '@tiptap/react';
import type { Database } from '../types/db';

// Atom for storing notes
export const notesAtom = atom([]);

// Atom for storing the sync status
export const syncStatusAtom = atom('idle');

// Atom for the current note ID
export const currentNoteIdAtom = atom<string | null>(null);

// Editor state atoms
export const editorModeAtom = atom<'reading' | 'editing'>('reading');
export const editorTitleAtom = atom<string>('');
export const editorErrorAtom = atom<string | null>(null);
export const editorLastSavedAtom = atom<Date | null>(null);
export const editorIsSavingAtom = atom<boolean>(false);

// Editor selection state
export interface SelectionState {
  open: boolean;
  position: { x: number; y: number };
  text: string;
  html: string;
}
export const editorSelectionAtom = atom<SelectionState>({
  open: false,
  position: { x: 0, y: 0 },
  text: '',
  html: ''
});

// Editor instance atom
export const editorInstanceAtom = atom<TiptapEditor | null>(null);

// Command menu state
export interface CommandMenuState {
  show: boolean;
  selectedIndex: number;
  query: string;
  position?: { top: number; left: number };
  range?: any;
  items: Array<{
    title: string;
    description: string;
    category: 'Basic Blocks' | 'Lists' | 'Media' | 'Advanced';
    icon: string;
    command: (props: { editor: TiptapEditor; range: any }) => void;
  }>;
}

export const commandMenuAtom = atom<CommandMenuState>({
  show: false,
  selectedIndex: 0,
  query: '',
  items: [],
});

// Database service atom
export const createDatabaseServiceAtom = atom<Database | null>(null);
