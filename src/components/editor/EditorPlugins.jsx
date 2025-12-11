// EditorPlugins.jsx
import React, { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { $getRoot, $nodesOfType } from 'lexical';
import { MentionNode } from './nodes/MentionNode';

export const EditorStatePlugin = ({ content, onChange, onTextChange, onSessionUpdate }) => {
  const [editor] = useLexicalComposerContext();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (content) {
        try {
          const jsonState = JSON.parse(content);
          if (jsonState.root) {
             const editorState = editor.parseEditorState(jsonState);
             editor.setEditorState(editorState);
          } else {
             throw new Error("Not lexical state");
          }
        } catch (e) {
          editor.update(() => {
             $convertFromMarkdownString(content, TRANSFORMERS);
          });
        }
      }
    }
  }, [content, editor]);

  return (
    <OnChangePlugin
      onChange={(editorState) => {
        const jsonString = JSON.stringify(editorState.toJSON());
        onChange(jsonString);
        editorState.read(() => {
            const textContent = $getRoot().getTextContent();
            onTextChange(textContent);
            onSessionUpdate(textContent, jsonString); 
        });
      }}
    />
  );
};

export const MentionsTracker = ({ onChange }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const mentionNodes = $nodesOfType(MentionNode);
        const uniqueIds = [...new Set(mentionNodes.map((node) => node.__id))];
        onChange(uniqueIds);
      });
    });
  }, [editor, onChange]);
  return null;
};

export const EditorModePlugin = ({ mode }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(mode === 'edit');
  }, [editor, mode]);
  return null;
};

export const TimeTravelPlugin = ({ sessions, activeIndex, isPreviewMode }) => {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    if (!isPreviewMode || !sessions || sessions.length === 0) return;
    const index = Math.min(Math.max(0, activeIndex), sessions.length - 1);
    const session = sessions[index];
    const content = session?.contentSnapshot;

    if (!content) return;

    editor.update(() => {
        try {
            const jsonState = JSON.parse(content);
            if (jsonState.root) {
                const editorState = editor.parseEditorState(jsonState);
                editor.setEditorState(editorState);
                return;
            }
        } catch (e) {
            $convertFromMarkdownString(String(content), TRANSFORMERS);
        }
    });
  }, [editor, sessions, activeIndex, isPreviewMode]);

  return null;
};