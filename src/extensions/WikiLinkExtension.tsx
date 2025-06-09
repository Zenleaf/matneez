import * as React from 'react';
import { Extension, Editor } from '@tiptap/core';

import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node as ProsemirrorNode } from 'prosemirror-model';
import tippy from 'tippy.js';
import { ReactRenderer } from '@tiptap/react';

// Interface for WikiLink extension options
interface WikiLinkOptions {
  // Function to handle navigation to a note (creates if doesn't exist)
  onNavigateToNote: (title: string, shouldCreate: boolean) => void;
  // Function to check if a note exists
  checkIfNoteExists: (title: string) => Promise<boolean>;
  // Function to get existing note titles for suggestions
  getExistingNoteTitles: () => Promise<string[]>;
}

// Helper function to find wiki link patterns in text and mark them as decorations
const findWikiLinks = (doc: ProsemirrorNode) => {
  const decorations: Decoration[] = [];
  const pattern = /\[\[([^\]]+)\]\]/g;

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    const text = node.text || '';
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const start = pos + match.index;
      const end = start + match[0].length;
      const linkText = match[1];
      
      // Create a decoration with wiki-link class
      decorations.push(
        Decoration.inline(start, end, {
          class: 'wiki-link',
          'data-link-text': linkText,
          title: `Go to: ${linkText}`
        })
      );
    }
  });
  
  return DecorationSet.create(doc, decorations);
};

// Main extension definition
export const WikiLinkExtension = Extension.create<WikiLinkOptions>({
  name: 'wikiLink',

  addOptions() {
    return {
      // Function to handle navigation to a note (creates if doesn't exist)
      onNavigateToNote: (title: string, shouldCreate: boolean = false) => {
        console.log(`Navigate to note: ${title}, create: ${shouldCreate}`);
      },
      // Function to check if a note exists
      checkIfNoteExists: (title: string) => Promise.resolve(false),
      // Function to get existing note titles for suggestions
      getExistingNoteTitles: () => Promise.resolve([]),
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('wikiLink');
    const extensionOptions = this.options;
    
    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            return findWikiLinks(state.doc);
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            if (target.classList.contains('wiki-link')) {
              const linkText = target.getAttribute('data-link-text');
              
              if (linkText && typeof extensionOptions.onNavigateToNote === 'function') {
                // Check if the note exists first
                extensionOptions.checkIfNoteExists(linkText).then(exists => {
                  // Navigate to the note, creating it if it doesn't exist
                  extensionOptions.onNavigateToNote(linkText, !exists);
                  console.log(`Clicked wikilink: ${linkText}, exists: ${exists}`);
                }).catch(error => {
                  console.error('Error checking if note exists:', error);
                  // Navigate anyway, it will create if needed
                  extensionOptions.onNavigateToNote(linkText, true);
                });
              }
              
              event.preventDefault();
              return true;
            }
            return false;
          },
        },
      })
    ];
  },
});

export default WikiLinkExtension;
