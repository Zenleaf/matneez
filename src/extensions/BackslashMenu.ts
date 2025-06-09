import { Editor, Range, Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface CommandItem {
  title: string;
  description: string;
  icon: string;
  category: 'Basic Blocks' | 'Lists' | 'Media' | 'Advanced';
  command: (props: { editor: Editor; range: Range }) => void;
}

// Simple slash menu that doesn't disappear immediately
const BackslashMenu = Extension.create({
  name: 'backslashMenu',
  
  addOptions() {
    return {
      char: '/',
    };
  },

  addProseMirrorPlugins() {
    console.log('Simple BackslashMenu: Plugin initializing...');
    let popup: HTMLElement | null = null;
    let selectedIndex = 0;
    let isMenuVisible = false;
    let currentRange: Range | null = null;
    const editor = this.editor; // Store editor reference
    
    console.log('Simple BackslashMenu: Editor instance available:', !!editor);

    const commands: CommandItem[] = [
      // Basic Blocks
      {
        title: 'Text',
        description: 'Start writing with plain text',
        icon: 'T',
        category: 'Basic Blocks',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).setParagraph().run(),
      },
      {
        title: 'Heading 1',
        description: 'Big section heading',
        icon: 'H1',
        category: 'Basic Blocks',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(),
      },
      {
        title: 'Heading 2',
        description: 'Medium section heading',
        icon: 'H2',
        category: 'Basic Blocks',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
      },
      {
        title: 'Heading 3',
        description: 'Small section heading',
        icon: 'H3',
        category: 'Basic Blocks',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(),
      },
      {
        title: 'Quote',
        description: 'Capture a quote',
        icon: '"',
        category: 'Basic Blocks',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
      },
      {
        title: 'Code Block',
        description: 'Insert a code block',
        icon: '</>',
        category: 'Basic Blocks',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
      },
      // Text Formatting (StarterKit marks)
      {
        title: 'Bold Text',
        description: 'Make text bold',
        icon: 'B',
        category: 'Basic Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent('Bold text').run();
          // Select the inserted text and make it bold
          setTimeout(() => {
            const { from } = editor.state.selection;
            const to = from + 9; // Length of "Bold text"
            editor.chain().focus().setTextSelection({ from, to }).toggleBold().run();
          }, 10);
        },
      },
      {
        title: 'Italic Text',
        description: 'Make text italic',
        icon: 'I',
        category: 'Basic Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent('Italic text').run();
          // Select the inserted text and make it italic
          setTimeout(() => {
            const { from } = editor.state.selection;
            const to = from + 11; // Length of "Italic text"
            editor.chain().focus().setTextSelection({ from, to }).toggleItalic().run();
          }, 10);
        },
      },
      {
        title: 'Strikethrough',
        description: 'Cross out text',
        icon: 'S',
        category: 'Basic Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent('Strikethrough text').run();
          // Select the inserted text and make it strikethrough
          setTimeout(() => {
            const { from } = editor.state.selection;
            const to = from + 17; // Length of "Strikethrough text"
            editor.chain().focus().setTextSelection({ from, to }).toggleStrike().run();
          }, 10);
        },
      },
      {
        title: 'Inline Code',
        description: 'Add inline code',
        icon: '`',
        category: 'Basic Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent('inline code').run();
          // Select the inserted text and make it code
          setTimeout(() => {
            const { from } = editor.state.selection;
            const to = from + 11; // Length of "inline code"
            editor.chain().focus().setTextSelection({ from, to }).toggleCode().run();
          }, 10);
        },
      },
      {
        title: 'Underline Text',
        description: 'Underline text',
        icon: 'U',
        category: 'Basic Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent('Underlined text').run();
          // Select the inserted text and make it underlined
          setTimeout(() => {
            const { from } = editor.state.selection;
            const to = from + 15; // Length of "Underlined text"
            editor.chain().focus().setTextSelection({ from, to }).toggleUnderline().run();
          }, 10);
        },
      },
      {
        title: 'Highlight Text',
        description: 'Highlight text',
        icon: '🖍️',
        category: 'Basic Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent('Highlighted text').run();
          // Select the inserted text and highlight it
          setTimeout(() => {
            const { from } = editor.state.selection;
            const to = from + 16; // Length of "Highlighted text"
            editor.chain().focus().setTextSelection({ from, to }).toggleHighlight().run();
          }, 10);
        },
      },
      {
        title: 'Superscript',
        description: 'Add superscript text',
        icon: 'X²',
        category: 'Basic Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent('superscript').run();
          // Select the inserted text and make it superscript
          setTimeout(() => {
            const { from } = editor.state.selection;
            const to = from + 11; // Length of "superscript"
            editor.chain().focus().setTextSelection({ from, to }).toggleSuperscript().run();
          }, 10);
        },
      },
      {
        title: 'Subscript',
        description: 'Add subscript text',
        icon: 'X₂',
        category: 'Basic Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent('subscript').run();
          // Select the inserted text and make it subscript
          setTimeout(() => {
            const { from } = editor.state.selection;
            const to = from + 9; // Length of "subscript"
            editor.chain().focus().setTextSelection({ from, to }).toggleSubscript().run();
          }, 10);
        },
      },
      // Lists
      {
        title: 'Bullet List',
        description: 'Create a simple bullet list',
        icon: '•',
        category: 'Lists',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).toggleBulletList().run(),
      },
      {
        title: 'Numbered List',
        description: 'Create a numbered list',
        icon: '1.',
        category: 'Lists',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
      },
      {
        title: 'Task List',
        description: 'Create a task list',
        icon: '☐',
        category: 'Lists',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).toggleTaskList().run(),
      },
      // Media
      {
        title: 'Image',
        description: 'Upload an image',
        icon: '🖼️',
        category: 'Media',
        command: ({ editor, range }) => {
          const url = window.prompt('Enter image URL:');
          if (url) {
            editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
          } else {
            editor.chain().focus().deleteRange(range).run();
          }
        },
      },
      {
        title: 'Table',
        description: 'Insert a table',
        icon: '⊞',
        category: 'Media',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        },
      },
      // Advanced
      {
        title: 'Link',
        description: 'Add a link',
        icon: '🔗',
        category: 'Advanced',
        command: ({ editor, range }) => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().deleteRange(range).setLink({ href: url }).insertContent('Link').run();
          } else {
            editor.chain().focus().deleteRange(range).run();
          }
        },
      },
      {
        title: 'Align Left',
        description: 'Align text to the left',
        icon: '⬅️',
        category: 'Advanced',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).setTextAlign('left').run(),
      },
      {
        title: 'Align Center',
        description: 'Center align text',
        icon: '↔️',
        category: 'Advanced',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).setTextAlign('center').run(),
      },
      {
        title: 'Align Right',
        description: 'Align text to the right',
        icon: '➡️',
        category: 'Advanced',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).setTextAlign('right').run(),
      },
      {
        title: 'Justify',
        description: 'Justify text alignment',
        icon: '↕️',
        category: 'Advanced',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).setTextAlign('justify').run(),
      },
      {
        title: 'Horizontal Rule',
        description: 'Add a horizontal divider',
        icon: '—',
        category: 'Advanced',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
      },
      {
        title: 'Hard Break',
        description: 'Add a line break',
        icon: '↵',
        category: 'Advanced',
        command: ({ editor, range }) => 
          editor.chain().focus().deleteRange(range).setHardBreak().run(),
      },
    ];

    const showMenu = (view: any, from: number, to: number) => {
      if (popup) return; // Don't show if already visible

      console.log('Simple BackslashMenu: Showing menu');
      isMenuVisible = true;
      currentRange = { from, to };

      // Get cursor position
      const coords = view.coordsAtPos(from);

      popup = document.createElement('div');
      popup.className = 'cogneez-slash-menu-visible backslash-menu';
      
      // Simple, forced positioning and styling
      popup.style.cssText = `
        position: fixed !important;
        background: rgba(28, 33, 40, 0.95) !important;
        backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(55, 65, 81, 0.5) !important;
        border-radius: 12px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
        z-index: 9999 !important;
        width: 320px !important;
        max-height: 400px !important;
        color: #c9d1d9 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
        visibility: visible !important;
        display: block !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        left: ${Math.min(coords.left, window.innerWidth - 340)}px !important;
        top: ${coords.bottom + 8}px !important;
      `;

      // Create items container
      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'backslash-menu-items';
      itemsContainer.style.cssText = `
        max-height: 400px !important;
        overflow-y: auto !important;
        padding: 8px !important;
      `;

      commands.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = `backslash-menu-item ${index === selectedIndex ? 'selected' : ''}`;
        
        itemElement.style.cssText = `
          padding: 12px 16px !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          font-size: 14px !important;
          border-radius: 8px !important;
          margin-bottom: 2px !important;
          transition: all 0.15s ease !important;
          gap: 12px !important;
          color: #c9d1d9 !important;
        `;

        // Create icon element
        const iconElement = document.createElement('span');
        iconElement.textContent = item.icon;
        iconElement.style.cssText = `
          font-size: 16px !important;
          width: 24px !important;
          text-align: center !important;
          flex-shrink: 0 !important;
          opacity: 0.8 !important;
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

        // Add hover handlers
        itemElement.addEventListener('mouseenter', () => {
          selectedIndex = index;
          updateSelection();
        });

        itemElement.addEventListener('mouseleave', () => {
          if (index !== selectedIndex) {
            itemElement.style.backgroundColor = 'transparent';
          }
        });

        itemsContainer.appendChild(itemElement);
      });

      popup.appendChild(itemsContainer);
      
      // Attach to body
      popup.id = 'slash-menu-cogneez-persistent';
      
      // Remove any existing menu first
      const existing = document.getElementById('slash-menu-cogneez-persistent');
      if (existing) {
        existing.remove();
      }
      
      document.body.appendChild(popup);
      
      console.log('Simple BackslashMenu: Menu shown with', commands.length, 'items');
      
      // TEMP: Add bright red background for debugging
      popup.style.background = 'red';
      popup.style.left = '50px';
      popup.style.top = '50px';
      popup.style.width = '200px';
      popup.style.height = '100px';
      console.log('Simple BackslashMenu: Element appended to body:', !!popup.parentNode);
      console.log('Simple BacklashMenu: Element position:', popup.style.left, popup.style.top);
      
      // TEMP: Force visibility for debugging
      popup.style.setProperty('background', 'red', 'important');
      popup.style.setProperty('left', '100px', 'important');
      popup.style.setProperty('top', '100px', 'important');
      popup.style.setProperty('width', '300px', 'important');
      popup.style.setProperty('height', '200px', 'important');
      popup.style.setProperty('z-index', '99999', 'important');
      popup.style.setProperty('position', 'fixed', 'important');
      popup.style.setProperty('display', 'block', 'important');
      popup.style.setProperty('visibility', 'visible', 'important');
      popup.style.setProperty('opacity', '1', 'important');
      
      // Initialize selection on first item
      updateSelection();
    };

    const hideMenu = () => {
      console.log('Simple BackslashMenu: Hiding menu');
      if (popup) {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
          // Animate out on mobile
          popup.style.setProperty('transform', 'translateY(100%) scale(0.95)', 'important');
          popup.style.setProperty('opacity', '0', 'important');
          setTimeout(() => {
            if (popup) {
              popup.remove();
              popup = null;
            }
          }, 200);
        } else {
          // Smooth fade out on desktop
          popup.style.setProperty('opacity', '0', 'important');
          popup.style.setProperty('transform', 'scale(0.95)', 'important');
          setTimeout(() => {
            if (popup) {
              popup.remove();
              popup = null;
            }
          }, 150);
        }
      }
      isMenuVisible = false;
      currentRange = null;
      selectedIndex = 0;
    };

    const updateSelection = () => {
      if (!popup) return;
      
      const items = popup.querySelectorAll('.backslash-menu-item') as NodeListOf<HTMLElement>;
      items.forEach((item, index) => {
        if (index === selectedIndex) {
          item.classList.add('selected');
          item.style.backgroundColor = 'rgba(56, 139, 253, 0.15)';
          item.style.borderColor = 'rgba(56, 139, 253, 0.3)';
          item.style.border = '1px solid rgba(56, 139, 253, 0.3)';
          item.style.transform = 'scale(1.02)';
          item.style.boxShadow = '0 0 0 1px rgba(56, 139, 253, 0.2)';
          
          // Auto-scroll the selected item into view
          if (popup) { // Additional null check for TypeScript
            const itemsContainer = popup.querySelector('.backslash-menu-items') as HTMLElement;
            if (itemsContainer) {
              const itemTop = item.offsetTop;
              const itemBottom = itemTop + item.offsetHeight;
              const containerTop = itemsContainer.scrollTop;
              const containerBottom = containerTop + itemsContainer.clientHeight;
              
              // Scroll up if item is above visible area
              if (itemTop < containerTop) {
                itemsContainer.scrollTop = itemTop - 8; // 8px padding
              }
              // Scroll down if item is below visible area
              else if (itemBottom > containerBottom) {
                itemsContainer.scrollTop = itemBottom - itemsContainer.clientHeight + 8; // 8px padding
              }
            }
          }
        } else {
          item.classList.remove('selected');
          item.style.backgroundColor = 'transparent';
          item.style.border = '1px solid transparent';
          item.style.transform = 'scale(1)';
          item.style.boxShadow = 'none';
        }
      });
    };

    return [
      new Plugin({
        key: new PluginKey('simpleBackslashMenu'),
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
                console.log('Simple BackslashMenu: Escape pressed, hiding menu');
                hideMenu();
                return true;
              }

              // Let other keys pass through to editor
              return false;
            }

            // Check for slash trigger (only if menu is not visible)
            if (event.key === '/') {
              console.log('Simple BackslashMenu: Slash key detected!');
              const { state } = view;
              const { from, to } = state.selection;
              
              // Check if we're at the start of a line or after whitespace
              const textBefore = state.doc.textBetween(Math.max(0, from - 1), from);
              const shouldTrigger = from === to && (textBefore === '' || /\s/.test(textBefore));
              
              console.log('Simple BackslashMenu: Should trigger?', shouldTrigger, 'textBefore:', textBefore);
              
              if (shouldTrigger) {
                console.log('Simple BackslashMenu: Triggering menu...');
                // Show menu after the slash is inserted
                setTimeout(() => {
                  const newState = view.state;
                  const slashPos = newState.selection.from;
                  console.log('Simple BackslashMenu: Showing menu at position:', slashPos);
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
  },
});

export default BackslashMenu;
