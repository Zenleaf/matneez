import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Suggestion from '@tiptap/suggestion';
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';

// Simple slash menu extension for testing
const SimpleSlashMenu = Extension.create({
  name: 'simpleSlashMenu',
  
  addProseMirrorPlugins() {
    return [
      Suggestion({
        char: '/',
        pluginKey: new PluginKey('simpleSlash'),
        editor: this.editor,
        command: ({ editor, range, props }) => {
          console.log('Command executed:', props);
          editor.chain().focus().deleteRange(range).insertContent('HELLO!').run();
        },
        items: ({ query }) => {
          console.log('Simple slash items called with:', query);
          return [
            { title: 'Test 1', command: () => {} },
            { title: 'Test 2', command: () => {} },
          ];
        },
        render: () => {
          let popup: HTMLElement | null = null;
          
          return {
            onStart: (props) => {
              console.log('Simple slash menu started');
              popup = document.createElement('div');
              popup.style.position = 'fixed';
              popup.style.top = '100px';
              popup.style.left = '100px';
              popup.style.background = '#1c2128';
              popup.style.border = '1px solid #30363d';
              popup.style.borderRadius = '8px';
              popup.style.padding = '8px';
              popup.style.color = '#c9d1d9';
              popup.style.zIndex = '1000';
              popup.innerHTML = '<div>Test Menu Works!</div>';
              document.body.appendChild(popup);
            },
            onUpdate: () => {
              console.log('Simple slash menu updated');
            },
            onKeyDown: ({ event }) => {
              if (event.key === 'Escape') {
                if (popup) popup.remove();
                return true;
              }
              return false;
            },
            onExit: () => {
              console.log('Simple slash menu exited');
              if (popup) popup.remove();
            },
          };
        },
      }),
    ];
  },
});

export const SimpleSlashTest: React.FC = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      SimpleSlashMenu,
    ],
    content: '<p>Type / to test the slash menu</p>',
  });

  return (
    <div style={{ padding: '20px', background: '#1c2128', color: '#c9d1d9', minHeight: '200px' }}>
      <h3>Simple Slash Menu Test</h3>
      <EditorContent editor={editor} />
    </div>
  );
}; 