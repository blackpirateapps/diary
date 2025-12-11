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

    return editor.registerUpdateListener(({ tags }) => {
      // Prevent infinite loop - ignore updates we triggered ourselves
      if (tags.has('session-visualizer')) return;

      editor.update(
        () => {
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
          let isFirstParagraph = true;

          console.groupCollapsed('🔍 Visualizer Update Cycle');
          
          childrenAfterRemoval.forEach((node, index) => {
            if ($isSessionParagraphNode(node)) {
              const currentSessionId = node.getSessionId();
              console.log(`Paragraph ${index}: SessionID [${currentSessionId}] | Prev [${previousSessionId}] | First: ${isFirstParagraph}`);

              if (currentSessionId !== undefined && sessions[currentSessionId]) {
                const sessionData = sessions[currentSessionId];
                const isNewSession = currentSessionId !== previousSessionId;

                // Show divider if:
                // 1. It's the first paragraph (ALWAYS, regardless of duration), OR
                // 2. Session changed AND duration >= 1 minute
                if (isFirstParagraph || isNewSession) {
                  const durationStr = formatDuration(sessionData.startTime, sessionData.endTime);
                  
                  // For first paragraph, show divider even if duration is short
                  if (isFirstParagraph || durationStr) {
                    const displayDuration = durationStr || '<1m';
                    console.log(`  -> ${isFirstParagraph ? 'First Paragraph (always show)' : 'New Session'} Detected. Duration: ${displayDuration}`);
                    
                    const divider = $createSessionDividerNode(
                      sessionData.startTime,
                      displayDuration
                    );
                    node.insertBefore(divider);
                    console.log('  ✅ Inserting Divider');
                  } else {
                    console.log('  ❌ Skipping: Duration too short (< 1m) and not first paragraph');
                  }
                } else {
                  console.log(`  ⏭️ No Divider: Same session continues`);
                }

                previousSessionId = currentSessionId;
                isFirstParagraph = false;
              } else {
                console.warn('  ⚠️ Node has invalid Session ID or Session missing from array');
                previousSessionId = currentSessionId !== undefined ? currentSessionId : 0;
                isFirstParagraph = false;
              }
            }
          });

          console.groupEnd();
        },
        { tag: 'session-visualizer' } // ✅ Prevent infinite loop
      );
    });
  }, [editor, sessions]);

  return null;
}