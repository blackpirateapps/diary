// BlockFormatDropDown.jsx
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import { $createHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';

export default function BlockFormatDropDown() {
  const [editor] = useLexicalComposerContext();

  const setHeading = (level) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $setBlocksType(selection, () => $createHeadingNode(level));
    });
  };

  return (
    <div className="inline-block">
      <select
        onChange={(e) => setHeading(e.target.value)}
        className="rounded px-2 py-1 text-sm border dark:bg-gray-800"
        defaultValue=""
      >
        <option value="">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
    </div>
  );
}
