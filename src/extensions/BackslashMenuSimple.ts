import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export default Extension.create({
  name: 'backslashMenuSimple',

  addProseMirrorPlugins() {
    let popup: HTMLElement | null = null;
    let isMenuVisible = false;

    const showMenu = (view: any, from: number, to: number) => {
      if (popup) return;
      
      console.log('SIMPLE TEST: Creating menu');
      isMenuVisible = true;

      // Create simple red box for testing
      popup = document.createElement('div');
      popup.style.cssText = `
        position: fixed !important;
        background: red !important;
        width: 200px !important;
        height: 100px !important;
        left: 100px !important;
        top: 100px !important;
        z-index: 99999 !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        border: 3px solid yellow !important;
        color: white !important;
        padding: 20px !important;
        font-size: 16px !important;
      `;
      popup.textContent = 'SLASH MENU TEST';
      
      document.body.appendChild(popup);
      console.log('SIMPLE TEST: Menu appended, visible:', !!popup.parentNode);
    };

    const hideMenu = () => {
      if (popup) {
        popup.remove();
        popup = null;
      }
      isMenuVisible = false;
    };

    return [
      new Plugin({
        key: new PluginKey('simpleBackslashMenuTest'),
        props: {
          handleKeyDown(view, event) {
            if (event.key === '/') {
              console.log('SIMPLE TEST: Slash detected');
              setTimeout(() => {
                showMenu(view, 0, 0);
              }, 10);
            }
            
            if (event.key === 'Escape' && isMenuVisible) {
              hideMenu();
              return true;
            }
            
            return false;
          }
        }
      })
    ];
  }
}); 