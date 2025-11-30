import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, Download, Trash2, Eye, PenLine, Maximize2 } from 'lucide-react';

const EditorHeader = ({ 
  onClose, saveStatus, onZen, onExport, isExporting, 
  onDelete, toggleMode, mode, onDone, entryId 
}) => {
  return (
    <div className="px-6 py-4 flex justify-between items-center bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl z-30 border-b border-gray-100/50 dark:border-gray-800/50 sticky top-0 transition-colors">
      <div className="flex items-center gap-4">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={onClose} 
          className="p-2 -ml-2 text-gray-400 hover:text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:hover:bg-gray-800 rounded-lg transition-all"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </motion.button>
        <AnimatePresence mode="wait">
          {saveStatus !== 'idle' && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0 }}
              className="text-xs font-semibold tracking-wide uppercase text-gray-300 dark:text-gray-600 flex items-center gap-1.5"
            >
              {saveStatus === 'saving' && <span>Saving...</span>}
              {saveStatus === 'saved' && <span className="text-teal-500 flex items-center gap-1"><CheckCircle2 size={12}/> Saved</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={onZen}
          className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:hover:bg-gray-800 rounded-full transition-colors"
          title="Enter Zen Mode"
        >
          <Maximize2 size={18} strokeWidth={2} />
        </motion.button>

        {entryId && (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onExport}
            disabled={isExporting}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={18} strokeWidth={2} />
            )}
          </motion.button>
        )}

        {entryId && (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onDelete} 
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
          >
            <Trash2 size={18} strokeWidth={2} />
          </motion.button>
        )}
        
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={toggleMode}
          className="ml-2 w-9 h-9 flex items-center justify-center text-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-gray-800 dark:text-[var(--accent-400)] hover:bg-[var(--accent-100)] dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          {mode === 'edit' ? <Eye size={18} strokeWidth={2} /> : <PenLine size={18} strokeWidth={2} />}
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.97 }}
          onClick={onDone} 
          className="ml-2 px-5 py-2 bg-[var(--accent-500)] hover:brightness-110 text-white font-semibold rounded-full shadow-md shadow-[var(--accent-200)]/50 transition-all text-sm"
        >
          Done
        </motion.button>
      </div>
    </div>
  );
};

export default EditorHeader;