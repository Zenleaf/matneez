import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { createTestDB, cleanupTestDB, PouchDB } from './setup';

// Type for accessing window in tests
type TestWindow = {
  PouchDB: any;
  requestAnimationFrame: (callback: Function) => number;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  matchMedia: (query: string) => { matches: boolean };
};

// Mock TouchEvent for testing
type MockTouchEvent = {
  preventDefault: () => void;
  touches?: { clientX: number; clientY: number }[];
  clientX?: number;
  clientY?: number;
};

// Editor state mock
interface EditorState {
  content: any;
  selection: {
    from: number;
    to: number;
    anchor: number;
    head: number;
  };
}

// Mock editor commands
interface EditorCommands {
  focus: () => boolean;
  setTextSelection: (position: number) => boolean;
  insertContentAt: (position: number, content: any) => boolean;
}

// Simple mock of the ProseMirror / TipTap editor
class MockEditor {
  state: EditorState;
  commands: EditorCommands;
  view: any;
  
  // Mobile cursor handling properties
  lastTapTimestamp: number = 0;
  doubleTapThreshold: number = 300; // ms
  tapPositionThreshold: number = 30; // px
  lastTapPosition: { x: number, y: number } = { x: 0, y: 0 };
  
  constructor(initialContent: any) {
    this.state = {
      content: initialContent,
      selection: { from: 0, to: 0, anchor: 0, head: 0 }
    };
    
    this.commands = {
      focus: () => true,
      setTextSelection: (position) => {
        this.state.selection = { 
          from: position, 
          to: position,
          anchor: position,
          head: position
        };
        return true;
      },
      insertContentAt: (position, content) => {
        // Simple simulation of content insertion
        this.state.content = {
          ...this.state.content,
          content: [
            ...this.state.content.content.slice(0, position),
            content,
            ...this.state.content.slice(position)
          ]
        };
        return true;
      }
    };
    
    this.view = {
      dom: {
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => ({
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 20 })
        })
      },
      state: this.state,
      dispatch: () => {},
      coordsAtPos: () => ({ left: 50, top: 10, bottom: 30 }),
      posAtCoords: (coords: {left: number, top: number}) => ({
        pos: Math.floor(coords.left / 10), // Simple mapping of x position to document position
        inside: -1
      })
    };
  }
  
  // Mobile cursor handling methods
  handleTouchStart(event: MockTouchEvent): void {
    event.preventDefault();
    if (event.touches && event.touches[0]) {
      const touch = event.touches[0];
      this.lastTapPosition = { x: touch.clientX, y: touch.clientY };
    }
  }
  
  handleDoubleTap(event: MockTouchEvent): boolean {
    const now = Date.now();
    const timeDiff = now - this.lastTapTimestamp;
    const x = event.clientX || 0;
    const y = event.clientY || 0;
    
    // Update position for comparison
    this.lastTapPosition = { x, y };
    
    // Check if tap is within time threshold
    if (timeDiff < this.doubleTapThreshold) {
      // Check if tap is within position threshold
      const xDiff = Math.abs(x - this.lastTapPosition.x);
      const yDiff = Math.abs(y - this.lastTapPosition.y);
      
      if (xDiff < this.tapPositionThreshold && yDiff < this.tapPositionThreshold) {
        // Double tap detected
        this.lastTapTimestamp = 0; // Reset for next test
        return true;
      }
    }
    
    // Update timestamp for next comparison
    this.lastTapTimestamp = now;
    return false;
  }
  
  getHTML() {
    return JSON.stringify(this.state.content);
  }
  
  getJSON(): any {
    return this.state.content;
  }
}

describe('Editor Functionality', () => {
  let db: PouchDB.Database;
  let mockEditor: MockEditor;
  
  // Setup is now handled globally in setup.ts
  
  beforeEach(() => {
    db = createTestDB('editor-test-db');
    
    // Create a mock editor instance with initial content
    const initialContent = {
      type: 'doc',
      content: [
        { 
          type: 'paragraph', 
          content: [
            { type: 'text', text: 'Hello World' }
          ] 
        }
      ]
    };
    
    mockEditor = new MockEditor(initialContent);
  });
  
  afterEach(async () => {
    await cleanupTestDB(db);
  });
  
  describe('Content Management', () => {
    it('should initialize with content', () => {
      const content = mockEditor.getJSON();
      expect(content).toBeTypeOf('object');
      expect(content.type).toBe('doc');
      expect(content.content[0].type).toBe('paragraph');
      expect(content.content[0].content[0].text).toBe('Hello World');
    });
    
    it('should handle double tap detection', () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = vi.fn(() => mockTime);
      
      try {
        // First tap to set the initial timestamp
        mockEditor.handleDoubleTap({
          clientX: 100,
          clientY: 50,
          preventDefault: () => {}
        } as MockTouchEvent);
        
        // Advance time but stay within threshold
        mockTime += 200; // 200ms later (within 300ms threshold)
        
        // Second tap within the threshold time
        const doubleTapDetected = mockEditor.handleDoubleTap({
          clientX: 100,
          clientY: 50,
          preventDefault: () => {}
        } as MockTouchEvent);
        
        expect(doubleTapDetected).toBe(true);
      } finally {
        // Restore original Date.now
        Date.now = originalNow;
      }
    });
    
    it('should save content to database', async () => {
      // Save content to db
      const noteId = 'test-note-1';
      const noteContent = mockEditor.getJSON();
      
      await db.put({
        _id: noteId,
        title: 'Test Note',
        content: JSON.stringify(noteContent),
        updatedAt: new Date().toISOString()
      });
      
      // Retrieve and verify
      const savedNote = await db.get(noteId);
      expect(savedNote).toBeDefined();
      
      const parsedContent = JSON.parse(savedNote.content);
      expect(parsedContent).toEqual(noteContent);
    });
    
    it('should handle empty content', () => {
      const emptyContent = {
        type: 'doc',
        content: [{ type: 'paragraph' }]
      };
      
      const emptyEditor = new MockEditor(emptyContent);
      expect(emptyEditor.getJSON().content[0].content).toBeUndefined();
    });
  });
  
  describe('Cursor Positioning', () => {
    it('should set cursor position using coordinates', () => {
      const position = mockEditor.view.posAtCoords({ left: 25, top: 10 });
      expect(position).toBeTypeOf('object');
      expect(position.pos).toBe(2); // Based on our mock implementation
      
      mockEditor.commands.setTextSelection(position.pos);
      expect(mockEditor.state.selection.from).toBe(2);
    });
    
    it('should handle coordinates outside text bounds', () => {
      // Testing with coordinates far to the right
      const position = mockEditor.view.posAtCoords({ left: 500, top: 10 });
      expect(position).toBeTypeOf('object');
      expect(position.pos).toBe(50); // Based on our simple mock
    });
  });
  
  describe('Double Tap Detection', () => {
    it('should detect double taps within threshold', () => {
      let lastTapTime = 0;
      let isDoubleTap = false;
      const DOUBLE_TAP_THRESHOLD = 300;
      
      // First tap
      lastTapTime = Date.now();
      
      // Simulate second tap within threshold
      vi.useFakeTimers();
      setTimeout(() => {
        const now = Date.now();
        if (now - lastTapTime < DOUBLE_TAP_THRESHOLD) {
          isDoubleTap = true;
        }
        
        expect(isDoubleTap).toBe(true);
      }, 200);
      
      // Fast-forward time
      vi.advanceTimersByTime(200);
      vi.useRealTimers();
    });
    
    it('should not detect double tap when taps are too far apart in time', () => {
      // First tap
      mockEditor.handleTouchStart({
        preventDefault: () => {},
        touches: [{ clientX: 100, clientY: 50 }]
      } as MockTouchEvent);
      
      // Simulate time passing (more than threshold)
      mockEditor.lastTapTimestamp = Date.now() - 500;
      
      // Second tap
      const doubleTapDetected = mockEditor.handleDoubleTap({
        clientX: 100,
        clientY: 50,
        preventDefault: () => {}
      } as MockTouchEvent);
      
      expect(doubleTapDetected).toBe(false);
    });
    
    it('should not detect double tap when taps are too far apart in space', () => {
      // First tap
      mockEditor.handleTouchStart({
        preventDefault: () => {},
        touches: [{ clientX: 100, clientY: 50 }]
      } as MockTouchEvent);
      
      // Second tap
      const doubleTapDetected = mockEditor.handleDoubleTap({
        clientX: 500,
        clientY: 50,
        preventDefault: () => {}
      } as MockTouchEvent);
      
      expect(doubleTapDetected).toBe(false);
    });
  });
  
  describe('Edge Cases', function() {
    it('should handle content with special characters', function() {
      const specialContent = {
        type: 'doc',
        content: [
          { 
            type: 'paragraph', 
            content: [
              { type: 'text', text: 'Special characters: 🚀 😊 €£¥ \n\t' }
            ] 
          }
        ]
      };
      
      const specialEditor = new MockEditor(specialContent);
      const json = specialEditor.getJSON();
      expect(json.content[0].content[0].text).to.include('🚀');
      expect(json.content[0].content[0].text).to.include('😊');
    });
    
    it('should handle rapid consecutive updates', async function() {
      const noteId = 'test-note-concurrent';
      
      // Initial document
      await db.put({
        _id: noteId,
        title: 'Concurrent Test',
        content: JSON.stringify(mockEditor.getJSON()),
        updatedAt: new Date().toISOString()
      });
      
      // Get document with _rev
      const doc = await db.get(noteId);
      
      // Prepare two updates
      const update1 = {
        ...doc,
        content: JSON.stringify({
          type: 'doc',
          content: [{ 
            type: 'paragraph', 
            content: [{ type: 'text', text: 'Update 1' }] 
          }]
        }),
        updatedAt: new Date().toISOString()
      };
      
      const update2 = {
        ...doc,
        content: JSON.stringify({
          type: 'doc',
          content: [{ 
            type: 'paragraph', 
            content: [{ type: 'text', text: 'Update 2' }] 
          }]
        }),
        updatedAt: new Date().toISOString()
      };
      
      // Try to perform both updates (one should fail with conflict)
      let firstUpdateSucceeded = false;
      let secondUpdateSucceeded = false;
      let conflictDetected = false;
      
      try {
        await db.put(update1);
        firstUpdateSucceeded = true;
        
        try {
          await db.put(update2);
          secondUpdateSucceeded = true;
        } catch (err: any) {
          if (err.name === 'conflict') {
            conflictDetected = true;
          } else {
            throw err;
          }
        }
      } catch (err) {
        // Handle unexpected errors
        throw err;
      }
      
      // Check results
      expect(firstUpdateSucceeded).to.be.true;
      expect(secondUpdateSucceeded).to.be.false;
      expect(conflictDetected).to.be.true;
      
      // Verify final state
      const finalDoc = await db.get(noteId);
      const parsedContent = JSON.parse(finalDoc.content);
      expect(parsedContent.content[0].content[0].text).to.equal('Update 1');
    });
  });
});
