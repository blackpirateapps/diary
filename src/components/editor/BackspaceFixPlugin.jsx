import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import { $isMentionNode } from "./nodes/MentionNode";

export default function BackspaceFixPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // BACKSPACE
    const unregisterBackspace = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        return editor.update(() => {
          const sel = $getSelection();
          if (!$isRangeSelection(sel)) return false;

          // Only fix collapsed caret
          if (!sel.isCollapsed()) return false;

          const anchor = sel.anchor;
          const node = anchor.getNode();
          const offset = anchor.offset;

          // caret at beginning of node?
          if (offset === 0) {
            const prev = node.getPreviousSibling();
            if (prev && $isMentionNode(prev)) {
              prev.remove();
              event.preventDefault();
              return true;
            }
          }

          return false; // allow default behavior
        });
      },
      COMMAND_PRIORITY_HIGH
    );

    // DELETE FORWARD
    const unregisterDelete = editor.registerCommand(
      KEY_DELETE_COMMAND,
      (event) => {
        return editor.update(() => {
          const sel = $getSelection();
          if (!$isRangeSelection(sel)) return false;
          if (!sel.isCollapsed()) return false;

          const anchor = sel.anchor;
          const node = anchor.getNode();
          const offset = anchor.offset;

          // caret at end of node?
          if (offset === node.getTextContent().length) {
            const next = node.getNextSibling();
            if (next && $isMentionNode(next)) {
              next.remove();
              event.preventDefault();
              return true;
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
