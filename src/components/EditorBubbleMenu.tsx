import React from 'react';
import { BubbleMenu } from '@tiptap/react';
import { useAtom } from 'jotai';
import { editorInstanceAtom } from '../state/atoms';

export const EditorBubbleMenu: React.FC = () => {
  const [editor] = useAtom(editorInstanceAtom);

  if (!editor) return null;

  return (
    <BubbleMenu 
      editor={editor} 
      tippyOptions={{ 
        duration: 100, 
        animation: 'scale-subtle',
        theme: 'transparent',
        offset: [0, 12],
        interactive: true,
        interactiveBorder: 8,
        delay: [50, 0],
        placement: 'top',
        popperOptions: {
          strategy: 'fixed',
          modifiers: [
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 12,
              },
            },
            {
              name: 'flip',
              options: {
                fallbackPlacements: ['bottom', 'top'],
              },
            },
          ],
        },
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 8px',
          backgroundColor: 'rgba(15, 20, 25, 0.98)',
          backdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          fontSize: '13px',
          fontWeight: '500',
          userSelect: 'none',
          zIndex: 9999,
        }}
      >
        {/* Text Formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: editor.isActive('bold') 
              ? 'rgba(239, 68, 68, 0.2)' 
              : 'transparent',
            color: editor.isActive('bold') 
              ? '#ff6b6b' 
              : 'rgba(255, 255, 255, 0.85)',
            boxShadow: editor.isActive('bold') 
              ? '0 0 0 1px rgba(239, 68, 68, 0.3), 0 2px 8px rgba(239, 68, 68, 0.15)' 
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('bold')) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('bold')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
            }
          }}
          title="Bold"
        >
          B
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            fontStyle: 'italic',
            cursor: 'pointer',
            transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: editor.isActive('italic') 
              ? 'rgba(34, 197, 94, 0.2)' 
              : 'transparent',
            color: editor.isActive('italic') 
              ? '#4ade80' 
              : 'rgba(255, 255, 255, 0.85)',
            boxShadow: editor.isActive('italic') 
              ? '0 0 0 1px rgba(34, 197, 94, 0.3), 0 2px 8px rgba(34, 197, 94, 0.15)' 
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('italic')) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('italic')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
            }
          }}
          title="Italic"
        >
          I
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            textDecoration: editor.isActive('strike') ? 'line-through' : 'none',
            cursor: 'pointer',
            transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: editor.isActive('strike') 
              ? 'rgba(249, 115, 22, 0.2)' 
              : 'transparent',
            color: editor.isActive('strike') 
              ? '#fb923c' 
              : 'rgba(255, 255, 255, 0.85)',
            boxShadow: editor.isActive('strike') 
              ? '0 0 0 1px rgba(249, 115, 22, 0.3), 0 2px 8px rgba(249, 115, 22, 0.15)' 
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('strike')) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('strike')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
            }
          }}
          title="Strikethrough"
        >
          S
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'SF Mono, Monaco, Menlo, Consolas, monospace',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: editor.isActive('code') 
              ? 'rgba(168, 85, 247, 0.2)' 
              : 'transparent',
            color: editor.isActive('code') 
              ? '#c084fc' 
              : 'rgba(255, 255, 255, 0.85)',
            boxShadow: editor.isActive('code') 
              ? '0 0 0 1px rgba(168, 85, 247, 0.3), 0 2px 8px rgba(168, 85, 247, 0.15)' 
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('code')) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('code')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
            }
          }}
          title="Code"
        >
          &lt;/&gt;
        </button>

        {/* Stylish Divider */}
        <div
          style={{
            width: '1px',
            height: '16px',
            background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent)',
            margin: '0 4px',
          }}
        />

        {/* Link Button */}
        <button
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: editor.isActive('link') 
              ? 'rgba(59, 130, 246, 0.2)' 
              : 'transparent',
            color: editor.isActive('link') 
              ? '#60a5fa' 
              : 'rgba(255, 255, 255, 0.85)',
            boxShadow: editor.isActive('link') 
              ? '0 0 0 1px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(59, 130, 246, 0.15)' 
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('link')) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('link')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
            }
          }}
          title="Add Link"
        >
          🔗
        </button>

        {/* Highlight */}
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: editor.isActive('highlight') 
              ? 'rgba(251, 191, 36, 0.2)' 
              : 'transparent',
            color: editor.isActive('highlight') 
              ? '#fbbf24' 
              : 'rgba(255, 255, 255, 0.85)',
            boxShadow: editor.isActive('highlight') 
              ? '0 0 0 1px rgba(251, 191, 36, 0.3), 0 2px 8px rgba(251, 191, 36, 0.15)' 
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('highlight')) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('highlight')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
            }
          }}
          title="Highlight"
        >
          🎨
        </button>
      </div>
    </BubbleMenu>
  );
};