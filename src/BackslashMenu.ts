import { Editor, Range, Extension } from '@tiptap/core';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';

interface CommandItem {
  title: string;
  command: (props: { editor: Editor; range: Range }) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    backslashMenu: {
      setMenuSelectedIndex: (index: number) => ReturnType;
    };
  }
}

const BackslashMenu = Extension.create({
  name: 'backslashMenu',
  addOptions() {
    return {
      suggestion: {
        char: '\\',
        items: ({ query }: { query: string }): CommandItem[] => [
          {
            title: 'Heading 1',
            command: ({ editor, range }: { editor: Editor; range: Range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(),
          },
          {
            title: 'Bullet List',
            command: ({ editor, range }: { editor: Editor; range: Range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
          },
          {
            title: 'Numbered List',
            command: ({ editor, range }: { editor: Editor; range: Range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
          },
          {
            title: 'Quote',
            command: ({ editor, range }: { editor: Editor; range: Range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
          },
        ].filter(item => item.title.toLowerCase().includes(query.toLowerCase())),
        render: () => ({}), // rendering handled in React
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        ...this.options.suggestion,
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: any }) => {
          console.log('BackslashMenu: command triggered', { props });
          props.command({ editor, range });
        },
        onStart: (props: any) => {
          console.log('BackslashMenu: onStart', props);
          window.dispatchEvent(new CustomEvent('showBackslashMenu', { detail: props }));
        },
        onUpdate: (props: any) => {
          console.log('BackslashMenu: onUpdate', props);
          window.dispatchEvent(new CustomEvent('updateBackslashMenu', { detail: props }));
        },
        onExit: () => {
          console.log('BackslashMenu: onExit');
          window.dispatchEvent(new CustomEvent('hideBackslashMenu'));
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          console.log('BackslashMenu: onKeyDown', props.event.key);
          return false; // Let the default handler run
        },
      }),
    ];
  },
});

export default BackslashMenu;
