import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isSessionParagraphNode } from '../nodes/SessionParagraphNode';
import { $getSelection, $isRangeSelection } from 'lexical';

export default function SessionAttributionPlugin({ currentSessionIndex }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Listener: When text is modified
    return editor.registerUpdateListener(({ tags }) => {
      // Avoid infinite loops if the update was triggered by this plugin
      if (tags.has('session-attribution')) return;

      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // Get the nodes involved in this update
          const nodes = selection.getNodes();

          nodes.forEach((node) => {
            // Find the parent paragraph (since selection might be on TextNodes)
            const paragraph = node.getParent ? node.getParent() : node;
            
            // Only stamp if it's our custom node and hasn't been stamped yet
            if ($isSessionParagraphNode(paragraph)) {
              const existingId = paragraph.getSessionId();
              
              // RULE: If it's a new paragraph (no ID), stamp it.
              // If it has an ID, DO NOT overwrite it (preserves history).
              if (existingId === undefined || existingId === null) {
                paragraph.setSessionId(currentSessionIndex);
              }
            }
          });
        }
      }, { tag: 'session-attribution' });
    });
  }, [editor, currentSessionIndex]);

  return null;
}