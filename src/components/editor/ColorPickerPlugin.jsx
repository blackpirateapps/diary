// ColorPickerPlugin.jsx
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND } from 'lexical';

export default function ColorPickerPlugin() {
  const [editor] = useLexicalComposerContext();

  const onChange = (e) => {
    const v = e.target.value;
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, { style: { color: v } });
  };

  return (
    <input type="color" onChange={onChange} className="w-8 h-8 p-0 border rounded" />
  );
}
