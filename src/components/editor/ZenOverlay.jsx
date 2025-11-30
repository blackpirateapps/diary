import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';

const ZenOverlay = ({ isActive, content, setContent, onBack, settings }) => {
  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-[60] bg-white dark:bg-gray-950 flex flex-col items-center animate-slideUp zen-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <style>{`
          .zen-container .wmde-markdown {
            font-family: ${settings.fontFamily}, sans-serif !important;
            font-size: ${settings.fontSize}px !important;
            font-weight: ${settings.fontWeight} !important;
            line-height: ${settings.lineHeight} !important;
          }
          .zen-container .wmde-markdown h1 { font-size: 1.5em !important; }
          .zen-container .wmde-markdown h2 { font-size: 1.25em !important; }
        `}</style>

        <div className="w-full max-w-2xl px-6 pt-6 pb-2">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-[var(--accent-500)] transition-colors"
          >
            <ChevronLeft size={24} />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
        
        <div className="flex-1 w-full max-w-2xl px-6 overflow-y-auto no-scrollbar">
          <div className="min-h-[80vh] py-8">
            <MDEditor
              value={content}
              onChange={setContent}
              preview="edit"
              hideToolbar={true}
              height="100%"
              visiableDragbar={false}
              className="w-full"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZenOverlay;