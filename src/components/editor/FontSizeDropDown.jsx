// FontSizeDropDown.jsx
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND } from 'lexical';

const sizes = ['12px','14px','16px','18px','20px','24px'];

export default function FontSizeDropDown() {
  const [editor] = useLexicalComposerContext();

  const onChange = (e) => {
    const val = e.target.value;
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, { style: { fontSize: val } });
  };

  return (
    <select onChange={onChange} className="rounded px-2 py-1 text-sm border dark:bg-gray-800">
      <option value="">Size</option>
      {sizes.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
