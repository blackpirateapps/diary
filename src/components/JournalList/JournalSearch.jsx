import React, { useState } from 'react';
import { 
  Search, X, Tag, Calendar as CalendarIcon, 
  Filter, Check, ArrowRight, RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOODS } from './constants';

const JournalSearch = ({
  searchTerm,
  setSearchTerm,
  activeFilters,
  toggleFilter,
  uniqueTags,
  dateFilter,
  setDateFilter,
  onClear
}) => {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  // Local state for custom range inputs
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // --- DATE HELPERS ---
  const applyDatePreset = (preset) => {
    const now = new Date();
    let start, end, label;

    switch (preset) {
      case 'today':
        start = new Date(now.setHours(0,0,0,0));
        end = new Date(now.setHours(23,59,59,999));
        label = "Today";
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        label = "This Month";
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        label = "Last Month";
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        label = now.getFullYear().toString();
        break;
      default:
        return;
    }
    setDateFilter({ start, end, label });
    // Note: We keep panel open so user can set other filters if they want
  };

  const applyCustomRange = () => {
    if (rangeStart && rangeEnd) {
      const start = new Date(rangeStart);
      const end = new Date(rangeEnd);
      end.setHours(23, 59, 59);
      setDateFilter({ start, end, label: `${new Date(rangeStart).toLocaleDateString()} - ${new Date(rangeEnd).toLocaleDateString()}` });
    }
  };

  const hasActiveFilters = activeFilters.mood || activeFilters.tag || activeFilters.location || dateFilter;

  return (
    <div className="px-6 md:px-0 pb-2">
      <div className="relative z-30">
        
        {/* TOP ROW: SEARCH BAR + FILTER TOGGLE */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search memories..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-xl py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-[var(--accent-500)]/20 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <button 
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-3 md:px-4 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-sm border ${isFilterPanelOpen || hasActiveFilters ? 'bg-[var(--accent-500)] text-white border-[var(--accent-500)]' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Filter size={16} />
            <span className="hidden md:inline text-sm">Filters</span>
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-white md:hidden"></span>
            )}
          </button>
        </div>

        {/* EXPANDABLE FILTER PANEL */}
        <AnimatePresence>
          {isFilterPanelOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 space-y-5">
                
                {/* 1. DATE SECTION */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time Period</h3>
                    {dateFilter && (
                       <span className="text-xs font-medium text-[var(--accent-600)] bg-[var(--accent-50)] px-2 py-0.5 rounded-md">
                         {dateFilter.label}
                       </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {['today', 'thisMonth', 'lastMonth', 'thisYear'].map(key => (
                       <button
                         key={key}
                         onClick={() => applyDatePreset(key)}
                         className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-gray-800 hover:bg-[var(--accent-50)] dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg border border-transparent hover:border-[var(--accent-200)] transition-colors"
                       >
                         {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                       </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                     <div className="relative flex-1">
                       <input 
                          type="date" 
                          value={rangeStart} 
                          onChange={e => setRangeStart(e.target.value)} 
                          className="w-full text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-none focus:ring-1 focus:ring-[var(--accent-500)] text-gray-600 dark:text-gray-300" 
                        />
                     </div>
                     <ArrowRight size={12} className="text-gray-300" />
                     <div className="relative flex-1">
                       <input 
                          type="date" 
                          value={rangeEnd} 
                          onChange={e => setRangeEnd(e.target.value)} 
                          className="w-full text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-none focus:ring-1 focus:ring-[var(--accent-500)] text-gray-600 dark:text-gray-300" 
                        />
                     </div>
                     <button onClick={applyCustomRange} className="p-2 bg-[var(--accent-500)] text-white rounded-lg shadow-sm">
                       <Check size={14} />
                     </button>
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                {/* 2. MOOD SECTION */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mood</h3>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map(m => {
                      const isActive = activeFilters.mood === m.value;
                      return (
                         <button 
                           key={m.value}
                           onClick={() => toggleFilter('mood', m.value)}
                           className={`p-2 rounded-xl border transition-all ${isActive ? 'bg-[var(--accent-50)] dark:bg-gray-800 border-[var(--accent-500)] shadow-sm scale-105' : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                           title={m.label}
                         >
                           <m.icon size={18} className={isActive ? 'text-[var(--accent-600)]' : 'text-gray-400'} />
                         </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                {/* 3. TAGS SECTION */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {uniqueTags.length > 0 ? uniqueTags.map(tag => {
                      const isActive = activeFilters.tag === tag;
                      return (
                        <button 
                          key={tag}
                          onClick={() => toggleFilter('tag', tag)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          <Tag size={12} /> #{tag}
                        </button>
                      );
                    }) : (
                      <span className="text-xs text-gray-400 italic">No tags found in entries.</span>
                    )}
                  </div>
                </div>

                {/* FOOTER ACTIONS */}
                {hasActiveFilters && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button 
                      onClick={() => { onClear(); setRangeStart(''); setRangeEnd(''); }} 
                      className="text-xs font-bold text-red-500 flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <RefreshCcw size={12} /> Reset Filters
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default JournalSearch;