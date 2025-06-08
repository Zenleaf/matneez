import React from 'react';
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Undo, Redo, Code
} from 'lucide-react';
import './MenuBar.css';

interface MenuBarProps {
  editor: any; // You can replace 'any' with Editor type from @tiptap/react if desired
}

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  if (!editor) return null;

  const buttonClass = (action: string, params?: any) =>
    `menu-button ${editor.isActive(action, params) ? 'is-active' : ''}`;

  const headingButtonClass = (level: number) =>
    `menu-button ${editor.isActive('heading', { level }) ? 'is-active' : ''}`;

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      padding: '0.5rem 1rem',
      borderBottom: '1px solid #444c56',
      backgroundColor: '#2d333b',
      borderRadius: '0.5rem 0.5rem 0 0',
    }}>
      <button onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={buttonClass('bold')}>
        <Bold size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={buttonClass('italic')}>
        <Italic size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={buttonClass('strike')}>
        <Strikethrough size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} disabled={!editor.can().chain().focus().toggleCode().run()} className={buttonClass('code')}>
        <Code size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={headingButtonClass(1)}>
        <Heading1 size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={headingButtonClass(2)}>
        <Heading2 size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={headingButtonClass(3)}>
        <Heading3 size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass('bulletList')}>
        <List size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={buttonClass('orderedList')}>
        <ListOrdered size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={buttonClass('blockquote')}>
        <Quote size={18} />
      </button>
      <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} className="menu-button">
        <Undo size={18} />
      </button>
      <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} className="menu-button">
        <Redo size={18} />
      </button>
    </div>
  );
};

export default MenuBar;
