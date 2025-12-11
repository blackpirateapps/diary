import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { $isSessionParagraphNode } from '../nodes/SessionParagraphNode';
import { $createSessionDividerNode, $isSessionDividerNode } from '../nodes/SessionDividerNode';

const formatDuration = (start, end) => {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  // DEBUG: Log duration calculation
  // console.log(`Duration Calc: ${diff}ms`);
  if (diff < 60000) return null; 
  const mins = Math.floor(diff / 60000);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function SessionVisualizerPlugin({ sessions }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // DEBUG: Check if sessions prop is received
    if (!sessions) {
        console.log('⚠️ Visualizer: No sessions prop received');
        return;
    }
    console.log('🔍 Visualizer loaded with sessions:', sessions);

    return editor.registerUpdateListener(({ dirtyElements }) => {
      if (dirtyElements.size === 0) return;

      editor.update(() => {
        const root = $getRoot();
        const children = root.getChildren();
        let previousSessionId = null;

        console.groupCollapsed('🔍 Visualizer Update Cycle');

        children.forEach((node, index) => {
          if ($isSessionDividerNode(node)) {
            // node.remove(); // Uncomment this when you are done debugging to actually remove them
            return;
          }

          if ($isSessionParagraphNode(node)) {
            const currentSessionId = node.getSessionId();
            
            console.log(`Paragraph ${index}: SessionID [${currentSessionId}] | Prev [${previousSessionId}]`);

            if (currentSessionId !== undefined && sessions[currentSessionId]) {
              const sessionData = sessions[currentSessionId];
              
              // DEBUG: Check the condition
              const isNewSession = currentSessionId !== previousSessionId;
              // NOTE: If you haven't applied the fix yet, 'previousSessionId !== null' will be false for the first item.
              const checksOut = previousSessionId !== null && isNewSession; 

              if (checksOut) {
                const durationStr = formatDuration(sessionData.startTime, sessionData.endTime);
                console.log(`  -> New Session Detected. Duration: ${durationStr}`);
                
                if (durationStr) {
                  // ... insert logic ...
                  console.log('  ✅ Inserting Divider');
                } else {
                  console.log('  ❌ Skipping: Duration too short (< 1m)');
                }
              } else {
                 console.log(`  ⏭️ No Divider: isNewSession=${isNewSession}, prev!==null=${previousSessionId !== null}`);
              }

              previousSessionId = currentSessionId;
            } else {
              console.warn('  ⚠️ Node has invalid Session ID or Session missing from array');
              previousSessionId = 0; 
            }
          }
        });
        console.groupEnd();
      });
    });
  }, [editor, sessions]);

  return null;
}