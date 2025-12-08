// BackspaceFixPlugin.jsx
import React, { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  BACKSPACE_COMMAND,
  DELETE_CHARACTER_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import { $isMentionNode, MentionNode } from './nodes/MentionNode';

export default function BackspaceFixPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Handle Backspace key
    const unregisterBackspace = editor.registerCommand(
      BACKSPACE_COMMAND,
      (payload) => {
        return editor.update(() => {
          const sel = $getSelection();
          if (!$isRangeSelection(sel)) return false;

          // If selection is not collapsed, let default behaviour handle range deletion
          if (!sel.isCollapsed()) {
            return false;
          }

          const anchor = sel.anchor;
          const node = anchor.getNode();
          const offset = anchor.offset;

          // If caret is at offset 0 of the current text node, check the previous sibling
          if (offset === 0) {
            const prevSibling = node.getPreviousSibling();
            if (prevSibling && $isMentionNode(prevSibling)) {
              // Remove the mention node and stop the default double-delete
              prevSibling.remove();
              return true;
            }

            // If parent sibling is a mention (in some structures), check parent
            const parent = node.getParent();
            if (parent && parent.getPreviousSibling && parent.getPreviousSibling()) {
              const pPrev = parent.getPreviousSibling();
              if (pPrev && $isMentionNode(pPrev)) {
                pPrev.remove();
                return true;
              }
            }
          }

          // Otherwise allow default behaviour
          return false;
        });
      },
      COMMAND_PRIORITY_HIGH
    );

    // Handle Delete key (delete forward). Similar logic but checks node after caret.
    const unregisterDelete = editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      (payload) => {
        return editor.update(() => {
          const sel = $getSelection();
          if (!$isRangeSelection(sel)) return false;
          if (!sel.isCollapsed()) return false;

          const anchor = sel.anchor;
          const node = anchor.getNode();
          const offset = anchor.offset;

          // If caret at end of node's text, check next sibling
          if (offset === node.getTextContent().length) {
            const nextSibling = node.getNextSibling();
            if (nextSibling && $isMentionNode(nextSibling)) {
              nextSibling.remove();
              return true;
            }

            // Also check parent's next sibling
            const parent = node.getParent();
            if (parent && parent.getNextSibling && parent.getNextSibling()) {
              const pNext = parent.getNextSibling();
              if (pNext && $isMentionNode(pNext)) {
                pNext.remove();
                return true;
              }
            }
          }

          return false;
        });
      },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      unregisterBackspace();
      unregisterDelete();
    };
  }, [editor]);

  return null;
}
