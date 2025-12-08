// InsertDropDown.jsx
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createParagraphNode, $createTextNode } from 'lexical';

export default function InsertDropDown({ onInsertImage }) {
  const [editor] = useLexicalComposerContext();

  const insertHR = () => {
    editor.update(() => {
      const root = editor.getEditorState().read(() => null); // no-op to follow API
      // Very simple: insert a paragraph with '---' (or use HR node if you have one)
      const p = $createParagraphNode();
      p.append($createTextNode('— — —'));
      editor.update(() => {
        const selection = null;
      });
    });
  };

  return (
    <div>
      <select onChange={(e) => {
        const v = e.target.value;
        if (v === 'hr') insertHR();
        if (v === 'image' && onInsertImage) onInsertImage();
        e.target.value = '';
      }} className="rounded px-2 py-1 text-sm border dark:bg-gray-800">
        <option value="">Insert</option>
        <option value="hr">Horizontal rule</option>
        <option value="image">Image</option>
      </select>
    </div>
  );
}
