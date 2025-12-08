// FloatingLinkEditorPlugin.jsx
import React, { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';

export default function FloatingLinkEditorPlugin() {
  const [editor] = useLexicalComposerContext();
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState('');
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
          setCoords({ top: rect.bottom + 8 + window.scrollY, left: rect.left + rect.width / 2 + window.scrollX });
          setVisible(true);
        } else {
          setVisible(false);
        }
      });
    });
  }, [editor]);

  const applyLink = () => {
    editor.update(() => {
      // Basic approach: replace range with link text (for more, use LinkNode)
      document.execCommand('createLink', false, url);
    });
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div style={{ top: coords.top + 'px', left: coords.left + 'px', transform: 'translateX(-50%)' }} className="absolute z-50 p-2 bg-white rounded shadow flex gap-2">
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="px-2 py-1 border rounded text-sm" />
      <button onClick={applyLink} className="px-2 py-1 rounded bg-[var(--accent-500)] text-white">Apply</button>
    </div>
  );
}
