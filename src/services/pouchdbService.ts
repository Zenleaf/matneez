import type { NoteDocument } from '../types/note';

export interface PouchDbService {
  getNote: (noteId: string) => Promise<NoteDocument>;
  saveNote: (noteId: string, htmlContent: string, currentRev?: string | null) => Promise<string>;
  createInitialNote: (noteId: string, initialContent?: string) => Promise<string>;
  destroyDB: () => Promise<void>;
}

export const createPouchDbService = (
  PouchDB: any,
  dbName: string = 'cogneez_notes'
): PouchDbService => {
  let dbInstance: any = null;

  const getLocalDB = () => {
    if (!dbInstance || dbInstance.__destroyed) {
      dbInstance = new PouchDB(dbName, { auto_compaction: true });
    }
    return dbInstance;
  };

  const destroyDB = async () => {
    if (dbInstance) {
      try {
        await dbInstance.destroy();
      } catch (err: any) {
        if (!/destroyed/i.test(err?.message)) {
          throw err;
        }
      } finally {
        dbInstance = null;
      }
    }
  };

  const getNote = async (noteId: string): Promise<NoteDocument> => {
    const db = getLocalDB();
    try {
      return await db.get(noteId);
    } catch (err: any) {
      if (err.name === 'not_found') throw err;
      if (err.name === 'destroyed') {
        dbInstance = null;
        return getNote(noteId);
      }
      throw err;
    }
  };

  const saveNote = async (
    noteId: string,
    htmlContent: string,
    currentRev: string | null = null
  ): Promise<string> => {
    const db = getLocalDB();
    try {
      const doc = currentRev
        ? { _id: noteId, _rev: currentRev, content: htmlContent, updatedAt: new Date().toISOString() }
        : { _id: noteId, content: htmlContent, updatedAt: new Date().toISOString() };
      const result = await db.put(doc);
      return result.rev;
    } catch (err: any) {
      if (err.status === 409) {
        // Conflict, fetch latest and retry
        const latest = await db.get(noteId);
        return saveNote(noteId, htmlContent, latest._rev);
      }
      throw err;
    }
  };

  const createInitialNote = async (
    noteId: string,
    initialContent: string = '<p></p>'
  ): Promise<string> => {
    const db = getLocalDB();
    try {
      await db.get(noteId);
      throw new Error('Note already exists');
    } catch (err: any) {
      if (err.status === 404 || err.name === 'not_found') {
        const doc = {
          _id: noteId,
          content: initialContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const result = await db.put(doc);
        return result.rev;
      }
      throw err;
    }
  };

  return {
    getNote,
    saveNote,
    createInitialNote,
    destroyDB,
  };
};
