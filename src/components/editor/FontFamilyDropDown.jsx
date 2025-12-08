// FontFamilyDropDown.jsx
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND } from 'lexical';

const families = ['Inter, system-ui', 'Georgia, serif', 'Courier New, monospace', 'Arial, sans-serif'];

export default function FontFamilyDropDown() {
  const [editor] = useLexicalComposerContext();
  return (
    <select
      onChange={(e) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, { style: { fontFamily: e.target.value } })}
      className="rounded px-2 py-1 text-sm border dark:bg-gray-800"
    >
      <option value="">Font</option>
      {families.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
    </select>
  );
}
