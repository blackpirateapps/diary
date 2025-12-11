import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isSessionParagraphNode } from '../nodes/SessionParagraphNode';
import { $getSelection, $isRangeSelection } from 'lexical';

export default function SessionAttributionPlugin({ currentSessionIndex }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    console.log(`🔌 Plugin MOUNTED. Current Session Index: ${currentSessionIndex}`);

    return editor.registerUpdateListener(({ tags }) => {
      // Ignore updates we triggered ourselves
      if (tags.has('session-attribution')) return;

      editor.update(
        () => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            const nodes = selection.getNodes();

            nodes.forEach((node) => {
              // Find the SessionParagraphNode (it might be the node itself or its parent)
              let paragraph = null;
              
              if ($isSessionParagraphNode(node)) {
                paragraph = node;
              } else if (node.getParent && $isSessionParagraphNode(node.getParent())) {
                paragraph = node.getParent();
              }

              if (paragraph) {
                const existingId = paragraph.getSessionId();

                // RULE: Only stamp if it has NO ID (undefined or null)
                if (existingId === undefined || existingId === null) {
                  const idToAssign = currentSessionIndex >= 0 ? currentSessionIndex : 0;
                  console.log(`✅ STAMPING Paragraph ${paragraph.__key} -> Session [${idToAssign}]`);
                  paragraph.setSessionId(idToAssign);
                }
              }
            });
          }
        },
        { tag: 'session-attribution' }
      );
    });
  }, [editor, currentSessionIndex]);

  return null;
}