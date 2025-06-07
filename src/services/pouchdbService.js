// Using global PouchDB from CDN
const PouchDB = window.PouchDB;

let dbInstance = null;

/**
 * Get a PouchDB instance, creating a new one if necessary or if the previous one was destroyed.
 * @returns {PouchDB.Database} A PouchDB database instance
 */
function getLocalDB() {
  if (!dbInstance || dbInstance.__destroyed) {
    console.log('[PouchDBService] Creating new PouchDB instance');
    dbInstance = new PouchDB('cogneez_notes', {
      auto_compaction: true, // Compact the database when documents are deleted
    });
    console.log('[PouchDBService] PouchDB instance created successfully');
  }
  return dbInstance;
}

/**
 * Safely destroy the current database instance.
 * @returns {Promise<void>}
 */
export async function destroyDB() {
  if (dbInstance) {
    try {
      await dbInstance.destroy();
      console.log('[PouchDBService] Database destroyed successfully');
    } catch (err) {
      if (!/destroyed/i.test(err?.message)) {
        console.error('[PouchDBService] Error destroying database:', err);
        throw err;
      }
    } finally {
      dbInstance = null;
    }
  }
}

/**
 * Fetches a note from PouchDB.
 * @param {string} noteId - The ID of the note to fetch.
 * @returns {Promise<object>} The note document.
 * @throws {Error} If the note is not found or another error occurs.
 */
export const getNote = async (noteId) => {
  const db = getLocalDB();
  try {
    const note = await db.get(noteId);
    return note;
  } catch (err) {
    if (err.name === 'not_found') {
      throw err;
    }
    if (err.name === 'destroyed') {
      dbInstance = null; // Reset instance if it was destroyed
      return getNote(noteId); // Retry once with new instance
    }
    console.error('[PouchDBService] Error fetching note:', err);
    throw err;
  }
};

/**
 * Saves a note to PouchDB.
 * Handles basic conflict resolution.
 * @param {string} noteId - The ID of the note.
 * @param {string} htmlContent - The HTML content of the note.
 * @param {string|null} currentRev - The current revision of the document, if known.
 * @returns {Promise<string>} The new revision of the saved document.
 * @throws {Error} If saving fails even after conflict resolution attempt.
 */
export const saveNote = async (noteId, htmlContent, currentRev) => {
  const db = getLocalDB();
  const docToSave = {
    _id: noteId,
    content: htmlContent,
    updatedAt: new Date().toISOString(),
  };

  try {
    // Always try to get the latest revision first
    try {
      const existing = await db.get(noteId);
      docToSave._rev = existing._rev;
      // Preserve any additional fields that might exist
      docToSave.createdAt = existing.createdAt;
    } catch (err) {
      if (err.name !== 'not_found') throw err;
      // If document doesn't exist, add createdAt
      docToSave.createdAt = docToSave.updatedAt;
    }

    const response = await db.put(docToSave);
    return response.rev;
  } catch (err) {
    if (err.name === 'conflict') {
      console.warn('[PouchDBService] Conflict detected. Attempting to resolve...');
      try {
        const latestDoc = await db.get(noteId);
        docToSave._rev = latestDoc._rev;
        const responseAfterConflict = await db.put(docToSave);
        console.log('[PouchDBService] Conflict resolved and note saved.');
        return responseAfterConflict.rev;
      } catch (resolveErr) {
        console.error('[PouchDBService] Failed to resolve conflict and save note:', resolveErr);
        throw resolveErr;
      }
    } else if (err.name === 'destroyed') {
      dbInstance = null; // Reset instance if it was destroyed
      return saveNote(noteId, htmlContent, currentRev); // Retry once with new instance
    } else {
      console.error('[PouchDBService] Error saving note:', err);
      throw err;
    }
  }
};

/**
 * Creates an initial empty note if it doesn't exist.
 * @param {string} noteId - The ID of the note to create.
 * @param {string} initialContent - The initial HTML content for the note.
 * @returns {Promise<string>} The revision of the newly created note.
 * @throws {Error} If creation fails.
 */
export const createInitialNote = async (noteId, initialContent = '<p></p>') => {
  const db = getLocalDB();
  const now = new Date().toISOString();
  
  try {
    const doc = {
      _id: noteId,
      content: initialContent,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const response = await db.put(doc);
      console.log('[PouchDBService] Initial note created.');
      return response.rev;
    } catch (err) {
      if (err.name === 'conflict') {
        console.warn('[PouchDBService] Note already exists:', noteId);
        const existingDoc = await db.get(noteId);
        return existingDoc._rev;
      }
      throw err;
    }
  } catch (err) {
    if (err.name === 'destroyed') {
      dbInstance = null; // Reset instance if it was destroyed
      return createInitialNote(noteId, initialContent); // Retry once with new instance
    }
    console.error('[PouchDBService] Error creating initial note:', err);
    throw err;
  }
};

// We don't typically need to export the db instance itself if all operations are through service functions.
