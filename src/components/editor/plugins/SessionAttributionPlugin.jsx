import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isSessionParagraphNode } from '../nodes/SessionParagraphNode';
import { $getSelection, $isRangeSelection, $getRoot } from 'lexical';

export default function SessionAttributionPlugin({ currentSessionIndex }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    console.log(`🔌 Plugin MOUNTED. Current Session Index: ${currentSessionIndex}`);

    return editor.registerUpdateListener(({ tags, editorState }) => {
      // Ignore updates we triggered ourselves
      if (tags.has('session-attribution')) return;

      editor.update(() => {
        const selection = $getSelection();
        
        // DEBUG: Log that an update is happening
        // console.log('⚡ Update Detected. Selection:', selection ? 'Present' : 'Null');

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
              
              // DEBUG: Check what we found
              // console.log(`   found paragraph. ExistingID: ${existingId}`);

              // RULE: Only stamp if it has NO ID (undefined or null)
              if (existingId === undefined || existingId === null) {
                const idToAssign = currentSessionIndex >= 0 ? currentSessionIndex : 0;
                
                console.log(`✅ STAMPING Paragraph ${paragraph.__key} -> Session [${idToAssign}]`);
                paragraph.setSessionId(idToAssign);
              }
            } else {
              // DEBUG: Found a node, but it wasn't a SessionParagraph
              // console.log('   ignoring node (not a session paragraph):', node.getType());
            }
          });
        }
      }, { tag: 'session-attribution' });
    });
  }, [editor, currentSessionIndex]);

  return null;
}