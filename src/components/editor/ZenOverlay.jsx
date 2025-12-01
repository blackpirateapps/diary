import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

// --- LEXICAL IMPORTS ---
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TRANSFORMERS, $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode } from '@lexical/code';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'; // <--- FIXED IMPORT

// --- HELPER: INITIALIZE EDITOR WITH MARKDOWN ---
// This plugin runs once when Zen Mode opens to load your existing text
const MarkdownInitPlugin = ({ content }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      // Convert the passed Markdown string into Lexical nodes
      $convertFromMarkdownString(content, TRANSFORMERS);
    });
  }, []); // Run only on mount

  return null;
};

// --- HELPER: SYNC CHANGES BACK TO MARKDOWN ---
// This plugin watches for typing and updates your app's state
const MarkdownSyncPlugin = ({ onChange }) => {
  return (
    <OnChangePlugin
      onChange={(editorState) => {
        editorState.read(() => {
          // Convert Lexical nodes back to Markdown string
          const markdown = $convertToMarkdownString(TRANSFORMERS);
          onChange(markdown);
        });
      }}
    />
  );
};

// --- MAIN COMPONENT ---
const ZenOverlay = ({ isActive, content, setContent, onBack, settings }) => {
  if (!isActive) return null;

  // Lexical Configuration
  const initialConfig = {
    namespace: 'ZenEditor',
    theme: {
      paragraph: 'mb-4',
      heading: {
        h1: 'text-3xl font-bold mb-4 mt-6',
        h2: 'text-2xl font-bold mb-3 mt-5',
        h3: 'text-xl font-bold mb-2 mt-4',
      },
      list: {
        ul: 'list-disc ml-5 mb-4',
        ol: 'list-decimal ml-5 mb-4',
      },
      quote: 'border-l-4 border-gray-300 pl-4 italic my-4 text-gray-500',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      }
    },
    // Register the nodes we want to support
    nodes: [
      HeadingNode, 
      QuoteNode, 
      ListNode, 
      ListItemNode, 
      LinkNode, 
      CodeNode
    ],
    onError: (error) => console.error(error),
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-[60] bg-white dark:bg-gray-950 flex flex-col items-center animate-slideUp zen-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Inject User Preferences via CSS Variables */}
        <style>{`
          .zen-editor-content {
            font-family: ${settings.fontFamily}, sans-serif;
            font-size: ${settings.fontSize}px;
            font-weight: ${settings.fontWeight};
            line-height: ${settings.lineHeight};
            outline: none;
            min-height: 80vh;
          }
          /* Override placeholder color for dark mode */
          .dark .zen-placeholder { color: #4b5563; }
        `}</style>

        {/* TOP BAR */}
        <div className="w-full max-w-2xl px-6 pt-6 pb-2 flex-shrink-0">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-[var(--accent-500)] transition-colors"
          >
            <ChevronLeft size={24} />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
        
        {/* EDITOR AREA */}
        <div className="flex-1 w-full max-w-2xl px-6 overflow-y-auto no-scrollbar">
          <div className="py-8 relative">
            
            <LexicalComposer initialConfig={initialConfig}>
              {/* The Editable Area */}
              <RichTextPlugin
                contentEditable={
                  <ContentEditable className="zen-editor-content text-gray-800 dark:text-gray-200" />
                }
                placeholder={
                  <div className="absolute top-8 left-0 text-gray-300 pointer-events-none zen-placeholder" style={{
                    fontFamily: settings.fontFamily,
                    fontSize: `${settings.fontSize}px`,
                  }}>
                    Start writing...
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary} // <--- FIXED USAGE
              />
              
              {/* Plugins */}
              <HistoryPlugin />
              <ListPlugin />
              
              {/* This enables Markdown shortcuts (e.g. typing "# " makes a header) */}
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
              
              {/* Our Custom Sync Plugins */}
              <MarkdownInitPlugin content={content} />
              <MarkdownSyncPlugin onChange={setContent} />
              
            </LexicalComposer>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZenOverlay;