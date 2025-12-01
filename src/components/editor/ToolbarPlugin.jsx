import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  SELECTION_CHANGE_COMMAND,
  FORMAT_TEXT_COMMAND,
  $getSelection,
  $isRangeSelection,
  UNDO_COMMAND,
  REDO_COMMAND,
} from 'lexical';
import { $createHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { mergeRegister } from '@lexical/utils';
import { 
  Bold, Italic, Underline, Code, 
  Heading1, Heading2, Quote, 
  List, ListOrdered, Undo, Redo 
} from 'lucide-react';

const ToolbarButton = ({ onClick, isActive, icon: Icon, label }) => (
  <button
    onClick={onClick}
    title={label}
    className={`p-1.5 rounded-lg transition-all ${
      isActive 
        ? 'bg-[var(--accent-100)] text-[var(--accent-600)] dark:bg-gray-700 dark:text-white' 
        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300'
    }`}
  >
    <Icon size={18} strokeWidth={2.5} />
  </button>
);

const Divider = () => <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />;

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsCode(selection.hasFormat('code'));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateToolbar());
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => { updateToolbar(); return false; },
        1
      ),
      editor.registerCommand(
        UNDO_COMMAND, 
        () => { setCanUndo(true); return false; }, 
        1
      ),
      editor.registerCommand(
        REDO_COMMAND, 
        () => { setCanRedo(true); return false; }, 
        1
      )
    );
  }, [editor, updateToolbar]);

  const formatHeading = (tag) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag));
      }
    });
  };

  return (
    <div className="flex items-center flex-wrap gap-1 p-2 mb-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur z-10 transition-colors">
      
      <ToolbarButton 
        onClick={() => editor.dispatchCommand(UNDO_COMMAND)} 
        icon={Undo} 
        label="Undo" 
      />
      <ToolbarButton 
        onClick={() => editor.dispatchCommand(REDO_COMMAND)} 
        icon={Redo} 
        label="Redo" 
      />
      
      <Divider />

      <ToolbarButton 
        onClick={() => formatHeading('h1')} 
        icon={Heading1} 
        label="Heading 1" 
      />
      <ToolbarButton 
        onClick={() => formatHeading('h2')} 
        icon={Heading2} 
        label="Heading 2" 
      />
      
      <Divider />

      <ToolbarButton 
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} 
        isActive={isBold} 
        icon={Bold} 
        label="Bold" 
      />
      <ToolbarButton 
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} 
        isActive={isItalic} 
        icon={Italic} 
        label="Italic" 
      />
      <ToolbarButton 
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} 
        isActive={isUnderline} 
        icon={Underline} 
        label="Underline" 
      />
      <ToolbarButton 
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} 
        isActive={isCode} 
        icon={Code} 
        label="Code" 
      />

      <Divider />

      <ToolbarButton 
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND)} 
        icon={List} 
        label="Bullet List" 
      />
      <ToolbarButton 
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND)} 
        icon={ListOrdered} 
        label="Numbered List" 
      />
      <ToolbarButton 
        onClick={() => { /* Lexical Quote Command logic if needed, usually block type */ }} 
        icon={Quote} 
        label="Quote" 
      />
    </div>
  );
}