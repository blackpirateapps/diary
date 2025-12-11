import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { $isSessionParagraphNode } from '../nodes/SessionParagraphNode';
import { $createSessionDividerNode, $isSessionDividerNode } from '../nodes/SessionDividerNode';

// Helper to calculate duration string
const formatDuration = (start, end) => {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff < 60000) return null; // Logic: Return null if < 1 min
  const mins = Math.floor(diff / 60000);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function SessionVisualizerPlugin({ sessions }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!sessions || sessions.length === 0) return;

    return editor.registerUpdateListener(({ dirtyElements }) => {
      // Only run if content changed
      if (dirtyElements.size === 0) return;

      editor.update(() => {
        const root = $getRoot();
        const children = root.getChildren();

        let previousSessionId = null;

        children.forEach((node) => {
          // 1. Cleanup: Remove old dividers (we will re-calculate them)
          // This is a naive but safe approach to ensure dividers are always correct
          if ($isSessionDividerNode(node)) {
            // We'll skip removal logic for now and rely on insertion logic
            // But in a production app, you might want to reconcile them smarter.
            // For now, let's treat dividers as "managed" nodes.
            node.remove(); 
            return;
          }

          if ($isSessionParagraphNode(node)) {
            const currentSessionId = node.getSessionId();
            
            // Safe check: ensure session exists
            if (currentSessionId !== undefined && sessions[currentSessionId]) {
              
              // RULE: Is this a NEW session block?
              if (previousSessionId !== null && currentSessionId !== previousSessionId) {
                
                const sessionData = sessions[currentSessionId];
                const durationStr = formatDuration(sessionData.startTime, sessionData.endTime);

                // RULE: Only show divider if duration > 1 min
                if (durationStr) {
                  const startTimeStr = new Date(sessionData.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  
                  // Insert Divider BEFORE this paragraph
                  const divider = $createSessionDividerNode(
                    startTimeStr,
                    durationStr,
                    currentSessionId
                  );
                  node.insertBefore(divider);
                }
              }
              previousSessionId = currentSessionId;
            } else {
              // If it's an old legacy paragraph (no ID), treat it as "Session 0" or skip
              previousSessionId = 0; 
            }
          }
        });
      });
    });
  }, [editor, sessions]);

  return null;
}