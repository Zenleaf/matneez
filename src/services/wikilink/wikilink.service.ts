import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as F from 'fp-ts/function';
import type { NoteDocument, NoteInput } from '../../types/note';
import { createNotesService } from '../notes/notes.service';
import type { Database } from '../../types/db';

export interface WikiLinkService {
  navigateToNote: (title: string) => Promise<string>;
  getExistingNoteTitles: () => Promise<string[]>;
  findNoteByTitle: (title: string) => Promise<NoteDocument | null>;
  checkIfNoteExists: (title: string) => Promise<boolean>;
}

export const createWikiLinkService = (db: Database): WikiLinkService => {
  const notesService = createNotesService(db);

  /**
   * Navigate to a note by title, creating it if it doesn't exist
   * @param title The title of the note to navigate to
   * @returns The ID of the note (either existing or newly created)
   */
  const navigateToNote = async (title: string): Promise<string> => {
    try {
      // First, try to find if the note already exists
      const existingNote = await findNoteByTitle(title);
      
      if (existingNote) {
        // If the note exists, dispatch navigation event
        const navigationEvent = new CustomEvent('cogneez:navigate:note', {
          detail: { noteId: existingNote._id }
        });
        document.dispatchEvent(navigationEvent);
        return existingNote._id;
      } else {
        // If the note doesn't exist, create it
        const newNoteResult = await notesService.create({
          title,
          content: JSON.stringify({
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: title }]
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: '' }]
              }
            ]
          })
        })();
        
        if (E.isRight(newNoteResult)) {
          const newNote = newNoteResult.right;
          // Dispatch navigation event to the new note
          const navigationEvent = new CustomEvent('cogneez:navigate:note', {
            detail: { noteId: newNote._id }
          });
          document.dispatchEvent(navigationEvent);
          return newNote._id;
        } else {
          console.error('Failed to create note:', newNoteResult.left);
          throw new Error(`Failed to create note: ${newNoteResult.left.message}`);
        }
      }
    } catch (error) {
      console.error('Error in navigateToNote:', error);
      throw error;
    }
  };

  /**
   * Get a list of all existing note titles for autocomplete
   * @returns Array of note titles
   */
  const getExistingNoteTitles = async (): Promise<string[]> => {
    try {
      const notesResult = await notesService.list()();
      
      if (E.isRight(notesResult)) {
        // Extract titles from notes and filter out empty ones
        return notesResult.right
          .map(note => note.title)
          .filter(title => title && title.trim() !== '')
          .sort();
      }
      
      return [];
    } catch (error) {
      console.error('Error getting note titles:', error);
      return [];
    }
  };

  /**
   * Find a note by its title
   * @param title The title to search for
   * @returns The note document if found, null otherwise
   */
  const findNoteByTitle = async (title: string): Promise<NoteDocument | null> => {
    try {
      // Create an index for title if it doesn't exist
      await db.createIndex({
        index: {
          fields: ['title', 'type'],
          ddoc: 'idx-title-type',
          name: 'title-type-index'
        }
      });
      
      // Search for notes with the exact title
      const result = await db.find({
        selector: {
          title: title,
          type: 'note'
        },
        use_index: 'idx-title-type',
        limit: 1
      });
      
      if (result.docs.length > 0) {
        return result.docs[0] as NoteDocument;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding note by title:', error);
      return null;
    }
  };

  /**
   * Check if a note with the given title exists
   * @param title The title to check
   * @returns True if the note exists, false otherwise
   */
  const checkIfNoteExists = async (title: string): Promise<boolean> => {
    try {
      const note = await findNoteByTitle(title);
      return note !== null;
    } catch (error) {
      console.error('Error checking if note exists:', error);
      return false;
    }
  };

  return {
    navigateToNote,
    getExistingNoteTitles,
    findNoteByTitle,
    checkIfNoteExists
  };
};
