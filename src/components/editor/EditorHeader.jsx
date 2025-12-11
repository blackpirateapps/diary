import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, Download, Trash2, Eye, PenLine, X } from 'lucide-react';

const EditorHeader = ({ 
  onClose, saveStatus, onExport, isExporting, 
  onDelete, toggleMode, mode, onDone, entryId 
}) => {
  return (
    <div className="h-16 px-6 flex justify-between items-center bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-30 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
      
      {/* Left: Navigation / Status */}
      <div className="flex items-center gap-3">
        {/* Mobile Back Button */}
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={onClose} 
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
        >
          <ChevronLeft size={22} />
        </motion.button>

        {/* Desktop Close/Done Button */}
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={onDone} 
          className="hidden lg:flex p-2 -ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
          title="Close Editor"
        >
          <X size={20} />
        </motion.button>

        <div className="h-5 w-px bg-gray-200 dark:bg-gray-800 mx-1 hidden lg:block" />

        <AnimatePresence mode="wait">
          {saveStatus !== 'idle' ? (
            <motion.div 
              initial={{ opacity: 0, x: -5 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0 }}
              className="text-xs font-semibold tracking-wide uppercase text-gray-300 dark:text-gray-600 flex items-center gap-1.5"
            >
              {saveStatus === 'saving' && <span>Saving...</span>}
              {saveStatus === 'saved' && <span className="text-teal-500 flex items-center gap-1"><CheckCircle2 size={12}/> Saved</span>}
            </motion.div>
          ) : (
             // Placeholder to keep layout stable
             <div className="w-1"></div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 lg:gap-2">
        
        {/* Mode Toggle */}
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={toggleMode}
          className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-colors"
          title={mode === 'edit' ? "Switch to Reading Mode" : "Switch to Edit Mode"}
        >
          {mode === 'edit' ? <Eye size={18} strokeWidth={2} /> : <PenLine size={18} strokeWidth={2} />}
        </motion.button>

        {entryId && (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onExport}
            disabled={isExporting}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Export PDF"
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
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete Entry"
          >
            <Trash2 size={18} strokeWidth={2} />
          </motion.button>
        )}
        
        {/* Mobile Done Button (Hidden on Desktop) */}
        <motion.button 
          whileTap={{ scale: 0.97 }}
          onClick={onDone} 
          className="lg:hidden ml-2 px-4 py-1.5 bg-[var(--accent-500)] text-white font-semibold rounded-full shadow-sm text-sm"
        >
          Done
        </motion.button>
      </div>
    </div>
  );
};

export default EditorHeader;