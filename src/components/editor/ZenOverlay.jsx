import React, { useEffect, useRef, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, SlidersHorizontal, X } from 'lucide-react';

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
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// --- HELPER: INITIALIZE EDITOR SMARTLY (JSON OR MARKDOWN) ---
const ContentInitPlugin = ({ content }) => {
  const [editor] = useLexicalComposerContext();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      editor.update(() => {
        if (!content) return;
        try {
          // 1. Try to parse as JSON State first
          const jsonState = JSON.parse(content);
          if (jsonState.root) {
             const editorState = editor.parseEditorState(jsonState);
             editor.setEditorState(editorState);
             return;
          }
        } catch (e) {
          // Ignore error, it wasn't JSON
        }
        // 2. Fallback to Markdown
        $convertFromMarkdownString(content, TRANSFORMERS);
      });
    }
  }, [content, editor]);

  return null;
};

// --- HELPER: SYNC CHANGES BACK TO MARKDOWN/JSON ---
const StateSyncPlugin = ({ onChange, contentRef }) => {
  return (
    <OnChangePlugin
      onChange={(editorState) => {
        const jsonString = JSON.stringify(editorState.toJSON());
        if (contentRef) contentRef.current = jsonString;
        onChange(jsonString);
      }}
    />
  );
};

// --- SETTINGS POPUP COMPONENT (Removed font settings, kept general UI) ---
const ZenSettingsPopup = ({ settings, setSettings, onClose }) => {
  // NOTE: Settings functionality is stripped down here as the dynamic font styles are removed.
  // We keep the structure but simplify the content to avoid external dependencies.
  const handleChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('zen_settings', JSON.stringify(newSettings));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute top-16 right-0 md:right-6 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 p-5 z-[70]"
    >
      <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Zen Display Settings</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Dynamic font settings are currently disabled to ensure maximum compatibility and stability on mobile devices.</p>
        
        {/* Example placeholder for non-font setting */}
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
           <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Line Spacing (Example)</label>
           <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
             {['Default', 'Wide'].map(w => (
               <button
                 key={w}
                 onClick={() => handleChange('spacing', w)}
                 className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${settings.spacing === w ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-400'}`}
               >
                 {w}
               </button>
             ))}
           </div>
        </div>

      </div>
    </motion.div>
  );
};

// --- MAIN COMPONENT ---
const ZenOverlay = ({ isActive, content, setContent, onBack }) => {
  // Local Settings State (Simplified)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('zen_settings');
    // We remove font defaults but keep the ability to track some settings if needed later.
    return saved ? JSON.parse(saved) : { spacing: 'Default' };
  });

  const [showSettings, setShowSettings] = useState(false);
  const contentRef = useRef(content);

  // Sync ref on mount
  useEffect(() => {
      contentRef.current = content;
  }, [content]);

  // Removed ContentEditable ref and auto-focus logic

  const initialConfig = useMemo(() => ({
    namespace: 'ZenEditor',
    theme: {
      // NOTE: Using minimal classes that only define block structure, not font styles
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
        code: 'bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 font-mono text-sm text-pink-500' 
      }
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode],
    onError: (error) => console.error(error),
  }), []); 

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-[60] bg-white dark:bg-gray-950 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* REMOVED: Dynamic <style> block */}

        {/* CONTAINER FOR PAGE LAYOUT */}
        <div className="min-h-screen flex flex-col items-center">
            
            {/* TOP BAR */}
            <div className="w-full max-w-3xl px-6 pt-6 pb-4 flex-shrink-0 flex justify-between items-center relative">
              <button 
                onClick={() => onBack(contentRef.current)}
                className="flex items-center gap-2 text-gray-400 hover:text-[var(--accent-500)] transition-colors group"
              >
                <div className="p-1.5 rounded-full group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors">
                  <ChevronLeft size={22} />
                </div>
                <span className="text-sm font-medium">Back</span>
              </button>

              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-gray-100 dark:bg-gray-800 text-[var(--accent-500)]' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
              >
                <SlidersHorizontal size={20} strokeWidth={2} />
              </button>

              {/* Settings Popup */}
              <AnimatePresence>
                {showSettings && (
                  <ZenSettingsPopup 
                    settings={settings} 
                    setSettings={setSettings} 
                    onClose={() => setShowSettings(false)} 
                  />
                )}
              </AnimatePresence>
            </div>
            
            {/* EDITOR AREA - Clicks outside close settings */}
            <div className="flex-1 w-full max-w-3xl px-6 pb-32" onClick={() => setShowSettings(false)}>
              <div className="py-8 relative">
                <LexicalComposer initialConfig={initialConfig}>
                  
                  <RichTextPlugin
                    contentEditable={
                      // ONLY CLASS for ContentEditable (Matches Lexical Playground, minimal style)
                      <ContentEditable 
                        className="outline-none text-lg lg:text-xl text-gray-800 dark:text-gray-200 leading-relaxed min-h-[400px]"
                      />
                    }
                    placeholder={
                      // Use generic placeholder styling
                      <div className="absolute top-8 left-0 text-gray-300 dark:text-gray-700 pointer-events-none text-lg lg:text-xl">
                        Start writing...
                      </div>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                  />
                  
                  <HistoryPlugin />
                  <ListPlugin />
                  <MarkdownShortcutPlugin transformers={TRANSFORMERS} /> 
                  
                  <ContentInitPlugin content={content} />
                  <StateSyncPlugin onChange={setContent} contentRef={contentRef} />
                  
                </LexicalComposer>
              </div>
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZenOverlay;