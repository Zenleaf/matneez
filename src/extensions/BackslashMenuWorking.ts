import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Editor, Range } from '@tiptap/core';

interface CommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: Editor; range: Range }) => void;
}

export default Extension.create({
  name: 'backslashMenuWorking',

  addProseMirrorPlugins() {
    let popup: HTMLElement | null = null;
    let itemsContainer: HTMLElement | null = null;
    let isMenuVisible = false;
    let selectedIndex = 0;
    let currentRange: Range | null = null;
    const editor = this.editor;

    const commands: CommandItem[] = [
      {
        title: 'Heading 1',
        description: 'Large section heading',
        icon: 'H1',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
        }
      },
      {
        title: 'Heading 2', 
        description: 'Medium section heading',
        icon: 'H2',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
        }
      },
      {
        title: 'Heading 3',
        description: 'Small section heading', 
        icon: 'H3',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
        }
      },
      {
        title: 'Text',
        description: 'Just start typing with plain text',
        icon: 'T',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setParagraph().run();
        }
      },
      {
        title: 'Bulleted list',
        description: 'Create a simple bulleted list',
        icon: '•',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run();
        }
      },
      {
        title: 'Numbered list',
        description: 'Create a list with numbering',
        icon: '1.',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        }
      },
      {
        title: 'Quote',
        description: 'Capture a quote',
        icon: '"',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        }
      },
      {
        title: 'Code',
        description: 'Capture a code snippet',
        icon: '</>', 
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        }
      }
    ];

    const showMenu = (view: any, from: number, to: number) => {
      if (popup) return;
      
      console.log('BackslashMenu: Creating menu');
      isMenuVisible = true;
      currentRange = { from, to };
      selectedIndex = 0;

      // Get cursor position
      const coords = view.coordsAtPos(from);

      popup = document.createElement('div');
      popup.className = 'backslash-menu cogneez-slash-menu-visible';
      
      // Clean Notion/Tana-style design
      popup.style.cssText = `
        position: fixed !important;
        background: #1c2128 !important;
        border: 1px solid #373e47 !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
        z-index: 9999 !important;
        width: 280px !important;
        max-height: 320px !important;
        color: #c9d1d9 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
        visibility: visible !important;
        display: block !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        left: ${Math.min(coords.left, window.innerWidth - 300)}px !important;
        top: ${coords.bottom + 8}px !important;
        padding: 8px !important;
      `;

      // Create items container with smooth scrolling
      itemsContainer = document.createElement('div');
      itemsContainer.className = 'backslash-menu-items';
      itemsContainer.style.cssText = `
        max-height: 300px !important;
        overflow-y: auto !important;
        padding: 0 !important;
        scroll-behavior: smooth !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      `;

      // Hide scrollbar
      const style = document.createElement('style');
      style.textContent = `
        .backslash-menu-items::-webkit-scrollbar { display: none !important; }
      `;
      document.head.appendChild(style);

      commands.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = `backslash-menu-item`;
        itemElement.dataset.index = index.toString();
        
        itemElement.style.cssText = `
          padding: 10px 12px !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          font-size: 14px !important;
          border-radius: 4px !important;
          margin: 0 !important;
          gap: 12px !important;
          color: #c9d1d9 !important;
          background: transparent !important;
          transition: all 0.1s ease !important;
        `;

        // Create icon element with glassmorphic background
        const iconElement = document.createElement('span');
        iconElement.textContent = item.icon;
        iconElement.style.cssText = `
          font-size: 13px !important;
          width: 24px !important;
          text-align: center !important;
          flex-shrink: 0 !important;
          color: #8b949e !important;
          font-weight: 500 !important;
        `;

        // Create content container
        const contentElement = document.createElement('div');
        contentElement.style.cssText = `
          flex: 1 !important;
          min-width: 0 !important;
        `;

        // Create title
        const titleElement = document.createElement('div');
        titleElement.textContent = item.title;
        titleElement.style.cssText = `
          font-weight: 500 !important;
          color: #c9d1d9 !important;
          margin-bottom: 2px !important;
          font-size: 14px !important;
          line-height: 1.2 !important;
        `;

        // Create description
        const descElement = document.createElement('div');
        descElement.textContent = item.description;
        descElement.style.cssText = `
          font-size: 12px !important;
          color: #8b949e !important;
          line-height: 1.3 !important;
        `;

        contentElement.appendChild(titleElement);
        contentElement.appendChild(descElement);

        itemElement.appendChild(iconElement);
        itemElement.appendChild(contentElement);

        // Add click handler
        itemElement.addEventListener('click', () => {
          if (currentRange) {
            commands[index].command({
              editor: editor,
              range: currentRange
            });
          }
          hideMenu();
        });

        // Add hover handlers for mouse interaction
        itemElement.addEventListener('mouseenter', () => {
          selectedIndex = index;
          updateSelection();
        });

        itemsContainer!.appendChild(itemElement);
      });

      popup.appendChild(itemsContainer);
      
      // Attach to body
      popup.id = 'slash-menu-working';
      
      // Remove any existing menu first
      const existing = document.getElementById('slash-menu-working');
      if (existing) {
        existing.remove();
      }
      
      document.body.appendChild(popup);
      
      console.log('BackslashMenu: Menu shown with', commands.length, 'items');
      
      // Initialize selection on first item
      updateSelection();
    };

    const hideMenu = () => {
      if (popup) {
        popup.remove();
        popup = null;
        itemsContainer = null;
      }
      isMenuVisible = false;
      currentRange = null;
      selectedIndex = 0;
    };

    const updateSelection = () => {
      if (!itemsContainer) return;
      
      const items = itemsContainer!.querySelectorAll('.backslash-menu-item') as NodeListOf<HTMLElement>;
      items.forEach((item, index) => {
        const iconElement = item.querySelector('span') as HTMLElement;
        const titleEl = item.querySelector('div:last-child div:first-child') as HTMLElement;
        const descEl = item.querySelector('div:last-child div:last-child') as HTMLElement;
        
        if (index === selectedIndex) {
          // SUPER VISIBLE selection highlighting
          item.style.setProperty('background', 'rgba(56, 139, 253, 0.2)', 'important');
          item.style.setProperty('border', '1px solid rgba(56, 139, 253, 0.6)', 'important');
          item.style.setProperty('border-radius', '4px', 'important');
          item.style.setProperty('box-shadow', '0 0 0 2px rgba(56, 139, 253, 0.1)', 'important');
          
          // Bright white text when selected
          if (titleEl) {
            titleEl.style.setProperty('color', '#ffffff', 'important');
            titleEl.style.setProperty('font-weight', '700', 'important');
          }
          
          // Description also gets brighter
          if (descEl) {
            descEl.style.setProperty('color', '#e6edf3', 'important');
          }
          
          // Bright blue icon
          if (iconElement) {
            iconElement.style.setProperty('color', '#4fc3f7', 'important');
            iconElement.style.setProperty('font-weight', '700', 'important');
            iconElement.style.setProperty('background', 'rgba(79, 195, 247, 0.1)', 'important');
            iconElement.style.setProperty('border-radius', '4px', 'important');
          }
          
          // Smooth scroll to item
          item.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest'
          });
        } else {
          // Reset to default - clear all selection styles
          item.style.setProperty('background', 'transparent', 'important');
          item.style.setProperty('border', '1px solid transparent', 'important');
          item.style.setProperty('box-shadow', 'none', 'important');
          
          // Reset text colors
          if (titleEl) {
            titleEl.style.setProperty('color', '#c9d1d9', 'important');
            titleEl.style.setProperty('font-weight', '500', 'important');
          }
          
          if (descEl) {
            descEl.style.setProperty('color', '#8b949e', 'important');
          }
          
          // Reset icon
          if (iconElement) {
            iconElement.style.setProperty('color', '#8b949e', 'important');
            iconElement.style.setProperty('font-weight', '500', 'important');
            iconElement.style.setProperty('background', 'transparent', 'important');
          }
        }
      });
    };

    return [
      new Plugin({
        key: new PluginKey('backslashMenuWorking'),
        props: {
          handleKeyDown(view, event) {
            if (isMenuVisible) {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                selectedIndex = (selectedIndex + 1) % commands.length;
                updateSelection();
                return true;
              }
              
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                selectedIndex = (selectedIndex - 1 + commands.length) % commands.length;
                updateSelection();
                return true;
              }
              
              if (event.key === 'Enter') {
                event.preventDefault();
                if (currentRange) {
                  commands[selectedIndex].command({
                    editor: editor,
                    range: currentRange
                  });
                }
                hideMenu();
                return true;
              }
              
              if (event.key === 'Escape') {
                event.preventDefault();
                hideMenu();
                return true;
              }

              return false;
            }

            // Check for slash trigger
            if (event.key === '/') {
              const { state } = view;
              const { from, to } = state.selection;
              
              // Check if we're at the start of a line or after whitespace
              const textBefore = state.doc.textBetween(Math.max(0, from - 1), from);
              const shouldTrigger = from === to && (textBefore === '' || /\s/.test(textBefore));
              
              if (shouldTrigger) {
                setTimeout(() => {
                  const newState = view.state;
                  const slashPos = newState.selection.from;
                  showMenu(view, slashPos - 1, slashPos);
                }, 10);
              }
            }
            
            return false;
          },
          
          handleClick(view, pos, event) {
            // Hide menu on click outside
            if (isMenuVisible) {
              hideMenu();
            }
            return false;
          }
        }
      })
    ];
  }
}); 