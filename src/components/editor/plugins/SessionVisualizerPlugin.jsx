import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { $isSessionParagraphNode } from '../nodes/SessionParagraphNode';
import { $createSessionDividerNode, $isSessionDividerNode } from '../nodes/SessionDividerNode';

const formatDuration = (start, end) => {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff < 60000) return null; // Less than 1 minute
  
  const mins = Math.floor(diff / 60000);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function SessionVisualizerPlugin({ sessions }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!sessions || sessions.length === 0) {
      console.log('⚠️ Visualizer: No sessions prop received');
      return;
    }

    console.log('🔍 Visualizer loaded with sessions:', sessions);

    return editor.registerUpdateListener(() => {
      editor.update(() => {
        const root = $getRoot();
        const children = root.getChildren();
        
        // First pass: remove all existing dividers
        children.forEach((node) => {
          if ($isSessionDividerNode(node)) {
            node.remove();
          }
        });

        // Second pass: insert dividers where needed
        const childrenAfterRemoval = root.getChildren();
        let previousSessionId = null;

        console.groupCollapsed('🔍 Visualizer Update Cycle');
        
        childrenAfterRemoval.forEach((node, index) => {
          if ($isSessionParagraphNode(node)) {
            const currentSessionId = node.getSessionId();
            console.log(`Paragraph ${index}: SessionID [${currentSessionId}] | Prev [${previousSessionId}]`);

            if (currentSessionId !== undefined && sessions[currentSessionId]) {
              const sessionData = sessions[currentSessionId];
              const isNewSession = currentSessionId !== previousSessionId;

              // Show divider if session changed from previous paragraph
              if (isNewSession) {
                const durationStr = formatDuration(sessionData.startTime, sessionData.endTime);
                
                if (durationStr) {
                  console.log(`  -> New Session Detected. Duration: ${durationStr}`);
                  
                  const divider = $createSessionDividerNode(
                    sessionData.startTime,
                    durationStr
                  );
                  node.insertBefore(divider);
                  console.log('  ✅ Inserting Divider');
                } else {
                  console.log('  ❌ Skipping: Duration too short (< 1m)');
                }
              } else {
                console.log(`  ⏭️ No Divider: Same session continues`);
              }

              previousSessionId = currentSessionId;
            } else {
              console.warn('  ⚠️ Node has invalid Session ID or Session missing from array');
              previousSessionId = currentSessionId !== undefined ? currentSessionId : 0;
            }
          }
        });

        console.groupEnd();
      });
    });
  }, [editor, sessions]);

  return null;
}