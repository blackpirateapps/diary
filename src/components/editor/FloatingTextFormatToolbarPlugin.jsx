// FloatingTextFormatToolbarPlugin.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import { Bold, Italic, Underline } from 'lucide-react';

export default function FloatingTextFormatToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef();
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          const native = window.getSelection();
          if (!native || native.rangeCount === 0) { setVisible(false); return; }
          const range = native.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setCoords({ top: rect.top - 40 + window.scrollY, left: rect.left + rect.width / 2 + window.scrollX });
          setVisible(true);
        } else {
          setVisible(false);
        }
      });
    });
  }, [editor]);

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      style={{ top: coords.top + 'px', left: coords.left + 'px', transform: 'translateX(-50%)' }}
      className="absolute z-50 p-2 rounded bg-white shadow-md flex gap-1 border dark:bg-gray-800 dark:border-gray-700"
    >
      <button onClick={() => editor.dispatchCommand('formatText', 'bold')} className="p-1"><Bold size={16} /></button>
      <button onClick={() => editor.dispatchCommand('formatText', 'italic')} className="p-1"><Italic size={16} /></button>
      <button onClick={() => editor.dispatchCommand('formatText', 'underline')} className="p-1"><Underline size={16} /></button>
    </div>
  );
}
