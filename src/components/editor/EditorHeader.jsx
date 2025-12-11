// EditorHeader.jsx
import React from 'react';
import { ChevronLeft, Trash2, Check, Pencil, AlertCircle } from 'lucide-react';

const EditorHeader = ({ entry, onClose, saveStatus, onExport, isExporting, onDelete, toggleMode, mode, storageWarning }) => {
    return (
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300">
            <ChevronLeft size={24} />
          </button>
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            {entry?.id ? 'Edit Entry' : 'New Entry'}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            saveStatus === 'saved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' :
            saveStatus === 'saving' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400' :
            saveStatus === 'storage-warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400' :
            'text-gray-400 dark:text-gray-600'
          }`}>
            {saveStatus === 'saved' ? 'Saved' : 
             saveStatus === 'saving' ? 'Saving...' : 
             saveStatus === 'storage-warning' ? 'Large Entry' : ''}
          </span>
          {storageWarning && (
            <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400" title={storageWarning}>
              <AlertCircle size={14} />
              <span className="hidden sm:inline">{storageWarning}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleMode}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            title={mode === 'edit' ? 'Preview Mode' : 'Edit Mode'}
          >
            {mode === 'edit' ? <Check size={20} /> : <Pencil size={20} />}
          </button>

          {entry?.id && (
            <button 
              onClick={onDelete} 
              className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-colors text-red-600 dark:text-red-400"
              title="Delete Entry"
            >
              <Trash2 size={20} />
            </button>
          )}

          <button 
            onClick={onExport} 
            disabled={isExporting}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-50"
            title="Export to PDF"
          >
            {isExporting ? <span className="text-sm">...</span> : 'PDF'}
          </button>
        </div>
      </header>
    );
};

export default EditorHeader;