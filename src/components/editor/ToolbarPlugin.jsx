// src/components/editor/ToolbarPlugin.jsx
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

import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { mergeRegister } from '@lexical/utils';
import {
  Bold,
  Italic,
  Underline,
  Code,
  Heading1,
  Heading2,
  Quote,
  List,
  ListOrdered,
  Undo,
  Redo,
  Link as LinkIcon,
  X as LinkRemove,
} from 'lucide-react';

// small accessible button
const ToolbarButton = ({ onClick, isActive, icon: Icon, label }) => (
  <button
    onMouseDown={(e) => e.preventDefault()} // prevent editor losing focus
    onClick={onClick}
    title={label}
    aria-pressed={!!isActive}
    className={`p-1.5 rounded-lg transition-all select-none focus:outline-none ${
      isActive
        ? 'bg-[var(--accent-100)] text-[var(--accent-600)] dark:bg-gray-700 dark:text-white'
        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300'
    }`}
  >
    <Icon size={18} strokeWidth={2.2} />
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

  // Selection -> toolbar state
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsCode(selection.hasFormat('code'));
    } else {
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      setIsCode(false);
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateToolbar());
      }),
      // update on selection changes too
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        1
      ),
      // small flags for undo/redo (presence only)
      editor.registerCommand(
        UNDO_COMMAND,
        () => {
          setCanUndo(true);
          return false;
        },
        0
      ),
      editor.registerCommand(
        REDO_COMMAND,
        () => {
          setCanRedo(true);
          return false;
        },
        0
      )
    );
  }, [editor, updateToolbar]);

  const formatHeading = (level) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(level));
      }
    });
  };

  const toggleQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  };

  // Link insert/remove: simple prompt-based helper (keeps it small)
  const toggleLink = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      // Simple toggle: if selection already contains an anchor node, remove it; otherwise ask for URL
      // We can't rely on TOGGLE_LINK_COMMAND across all Lexical versions in every build,
      // so we use a minimal prompt + document manipulation approach:
      const url = window.prompt('Enter link URL (leave empty to cancel):', 'https://');
      if (!url) return;

      // create a link node using the LinkNode from '@lexical/link' if present
      try {
        // lazy require to avoid build-time tree-shake errors if import missing
        // eslint-disable-next-line global-require
        const { $createLinkNode } = require('@lexical/link');
        const linkNode = $createLinkNode(url);
        selection.insertNodes([linkNode]);
      } catch (e) {
        // fallback: simple plain-text insertion of the url if LinkNode not available
        selection.insertText(url);
      }
    });
  };

  return (
    <div className="flex items-center flex-wrap gap-1 p-2 mb-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur z-20 transition-colors">
      <ToolbarButton onClick={() => editor.dispatchCommand(UNDO_COMMAND)} icon={Undo} label="Undo" />
      <ToolbarButton onClick={() => editor.dispatchCommand(REDO_COMMAND)} icon={Redo} label="Redo" />

      <Divider />

      {/* Heading dropdown (kepler-simple) */}
      <div className="flex items-center gap-1">
        <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title="Heading">
          H
        </button>
        <div className="flex gap-1">
          <ToolbarButton onClick={() => formatHeading('h1')} icon={Heading1} label="Heading 1" />
          <ToolbarButton onClick={() => formatHeading('h2')} icon={Heading2} label="Heading 2" />
        </div>
      </div>

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
        label="Bulleted list"
      />
      <ToolbarButton
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND)}
        icon={ListOrdered}
        label="Numbered list"
      />

      <ToolbarButton onClick={toggleQuote} icon={Quote} label="Quote" />

      <Divider />

      <ToolbarButton onClick={toggleLink} icon={LinkIcon} label="Insert Link" />
      <ToolbarButton
        onClick={() => {
          // remove link: quick prompt to remove existing - we simply insert nothing (no-op) but keep a remove icon for UX
          const should = window.confirm('Remove any link at selection?');
          if (!should) return;
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            // If LinkNode utilities are available, use them
            try {
              // eslint-disable-next-line global-require
              const { $isLinkNode } = require('@lexical/link');
              const nodes = selection.getNodes();
              nodes.forEach((n) => {
                if ($isLinkNode(n)) {
                  n.replace(n.getChildren());
                }
              });
            } catch (e) {
              // fallback: nothing practical; keep selection unchanged
            }
          });
        }}
        icon={LinkRemove}
        label="Remove Link"
      />
    </div>
  );
}
