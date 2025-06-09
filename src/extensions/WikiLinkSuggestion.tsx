import * as React from 'react';
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';

// Import the React component for suggestions
import WikiLinkSuggestions from './WikiLinkSuggestions';

// Create a proper TipTap extension for WikiLink suggestions
export const WikiLinkSuggestion = (getExistingNoteTitles: () => Promise<string[]>) => {
  return Extension.create({
    name: 'wikiLinkSuggestion',
    
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          // We'll use [[ as the trigger sequence
          char: '[',
          startOfLine: false,
          allowSpaces: true,
          // Check if we have [[ sequence
          allow: ({ state, range }) => {
            // Get the text before the cursor
            const from = Math.max(0, range.from - 1);
            const to = range.from;
            const previousChar = state.doc.textBetween(from, to, '\0', '\0');
            
            // Debug to console
            console.log('WikiLink allow check:', { previousChar, range });
            
            // Only trigger if the previous character is also [
            return previousChar === '[';
          },
          // Handle command when a suggestion is selected
          command: ({ editor, range, props }) => {
            try {
              console.log('WikiLink command executing with:', { range, props });
              
              // Calculate the position to delete from (2 chars back for [[)
              const from = range.from - 2;
              const to = range.to;
              
              console.log('Deleting range:', { from, to });
              
              // Delete the [[ and insert the wikilink with proper formatting
              editor
                .chain()
                .focus()
                .deleteRange({ from, to })
                // Insert as a link with wikilink class
                .insertContent({
                  type: 'text',
                  marks: [{ type: 'link', attrs: { href: `#${props}`, class: 'wikilink' } }],
                  text: props
                })
                .run();
              
              console.log('WikiLink inserted successfully');
            } catch (error) {
              console.error('Error inserting wikilink:', error);
            }
          },
          // Get filtered list of note titles
          items: async ({ query }) => {
            console.log('WikiLink fetching items with query:', query);
            try {
              const allTitles = await getExistingNoteTitles();
              console.log('WikiLink got titles:', allTitles);
              
              if (!query) return allTitles;
              
              const filteredTitles = allTitles.filter(
                (title: string) => title.toLowerCase().includes(query.toLowerCase())
              );
              
              console.log('WikiLink filtered titles:', filteredTitles);
              return filteredTitles;
            } catch (error) {
              console.error('Error getting note titles:', error);
              return [];
            }
          },
          // Render the suggestion popup
          render: () => {
            let reactRenderer: ReactRenderer | null = null;
            let popup: TippyInstance | null = null;
            let reference: HTMLSpanElement | null = null;
            
            return {
              onStart: (props: SuggestionProps<string>) => {
                console.log('WikiLink suggestion started');
                
                // Create React renderer for suggestions component
                reactRenderer = new ReactRenderer(WikiLinkSuggestions, {
                  props: {
                    items: props.items,
                    command: (item: string) => {
                      console.log('WikiLink item selected:', item);
                      props.command(item);
                    },
                  },
                  editor: props.editor,
                });
                
                // Create a reference element for tippy positioning
                reference = document.createElement('span');
                reference.classList.add('wikilink-suggestion-reference');
                document.body.appendChild(reference);
                
                // Position the reference element
                if (props.clientRect) {
                  const rect = props.clientRect();
                  if (rect) {
                    reference.style.position = 'absolute';
                    reference.style.left = `${rect.left + window.scrollX}px`;
                    reference.style.top = `${rect.top + window.scrollY}px`;
                    reference.style.width = '0';
                    reference.style.height = '0';
                    reference.style.pointerEvents = 'none';
                  }
                }
                
                // Create tippy popup
                popup = tippy(reference, {
                  getReferenceClientRect: props.clientRect
                    ? () => {
                        const rect = props.clientRect && props.clientRect();
                        return rect || new DOMRect();
                      }
                    : () => new DOMRect(),
                  appendTo: () => document.body,
                  content: reactRenderer.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  theme: 'light-border',
                }) as TippyInstance;
              },
              
              onUpdate: (props: SuggestionProps<string>) => {
                console.log('WikiLink suggestion updated');
                
                // Update React component props
                reactRenderer?.updateProps({
                  items: props.items,
                  command: (item: string) => props.command(item),
                });
                
                // Update tippy position
                if (popup && props.clientRect) {
                  popup.setProps({
                    getReferenceClientRect: () => {
                      const rect = props.clientRect && props.clientRect();
                      return rect || new DOMRect();
                    },
                  });
                }
              },
              
              onKeyDown: (props: { event: KeyboardEvent }) => {
                // Let the default handlers work
                return false;
              },
              
              onExit: () => {
                console.log('WikiLink suggestion exited');
                
                // Clean up React renderer
                if (reactRenderer) {
                  reactRenderer.destroy();
                  reactRenderer = null;
                }
                
                // Clean up tippy
                if (popup) {
                  popup.destroy();
                  popup = null;
                }
                
                // Clean up reference element
                if (reference && reference.parentNode) {
                  reference.parentNode.removeChild(reference);
                  reference = null;
                }
              },
            };
          },
        }),
      ];
    },
  });
};
