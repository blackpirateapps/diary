import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isSessionParagraphNode } from '../nodes/SessionParagraphNode';
import { $getSelection, $isRangeSelection } from 'lexical';

export default function SessionAttributionPlugin({ currentSessionIndex }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // DEBUG: Confirm Plugin is active
    // console.log(`🔌 Attribution Plugin Active. Current Session: ${currentSessionIndex}`);

    return editor.registerUpdateListener(({ tags, dirtyElements }) => {
      // 1. Avoid infinite loops
      if (tags.has('session-attribution')) return;

      // 2. Optimization: Only run if there are actual changes
      if (dirtyElements.size === 0) return;

      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const nodes = selection.getNodes();

          nodes.forEach((node) => {
            // FIXED LOGIC: distinct check for Element vs Text node
            // If the node IS the paragraph, use it. If it's a child (text), get parent.
            const paragraph = $isSessionParagraphNode(node) 
              ? node 
              : (node.getParent && node.getParent());
            
            if (paragraph && $isSessionParagraphNode(paragraph)) {
              const existingId = paragraph.getSessionId();
              
              // RULE: Only stamp if it has NO ID (undefined or null)
              if (existingId === undefined || existingId === null) {
                
                // SAFETY CHECK: Ensure we have a valid session index
                const idToAssign = currentSessionIndex >= 0 ? currentSessionIndex : 0;
                
                console.log(`🏷️ Stamping Paragraph with Session [${idToAssign}]`);
                paragraph.setSessionId(idToAssign);
              } 
            }
          });
        }
      }, { tag: 'session-attribution' });
    });
  }, [editor, currentSessionIndex]);

  return null;
}