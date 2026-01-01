import React, { useState } from 'react';
import { 
  Search, X, Tag, Calendar as CalendarIcon, 
  ChevronDown, Filter, ArrowRight 
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
  const [showDateMenu, setShowDateMenu] = useState(false);
  
  // Local state for the "Range" inputs
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // Helpers to apply date filters
  const applyYear = (year) => {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);
    setDateFilter({ start, end, label: `${year}` });
    setShowDateMenu(false);
  };

  const applyMonth = (e) => {
    if (!e.target.value) return;
    const [y, m] = e.target.value.split('-');
    const year = parseInt(y);
    const month = parseInt(m) - 1; // JS months are 0-indexed
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    setDateFilter({ start, end, label: start.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) });
    setShowDateMenu(false);
  };

  const applyRange = () => {
    if (rangeStart && rangeEnd) {
      const start = new Date(rangeStart);
      const end = new Date(rangeEnd);
      end.setHours(23, 59, 59); // Include full end day
      setDateFilter({ start, end, label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` });
      setShowDateMenu(false);
    }
  };

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden px-6 md:px-0"
    >
      <div className="pt-2 space-y-4 pb-4">
        
        {/* MAIN SEARCH INPUT */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search content, tags, location..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border-none shadow-sm rounded-xl py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-[var(--accent-500)]/20 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600"
            autoFocus 
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* FILTERS SCROLL ROW */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 items-center">
          
          {/* CLEAR ALL BUTTON */}
          {(searchTerm || activeFilters.mood || activeFilters.tag || activeFilters.location || dateFilter) && (
            <motion.button 
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              onClick={onClear} 
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 cursor-pointer"
            >
              <X size={12} /> Clear
            </motion.button>
          )}

          {/* DATE FILTER BUTTON */}
          <div className="relative">
             <button
               onClick={() => setShowDateMenu(!showDateMenu)}
               className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${dateFilter ? 'bg-[var(--accent-50)] border-[var(--accent-200)] text-[var(--accent-700)] dark:bg-gray-800 dark:text-white dark:border-gray-700' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'}`}
             >
               <CalendarIcon size={12} className={dateFilter ? 'text-[var(--accent-500)]' : 'text-gray-400'} />
               {dateFilter ? dateFilter.label : "Date"}
               <ChevronDown size={10} className="opacity-50" />
             </button>

             {/* DATE DROPDOWN MENU */}
             <AnimatePresence>
               {showDateMenu && (
                 <>
                   <div className="fixed inset-0 z-30" onClick={() => setShowDateMenu(false)} />
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-40 w-64 flex flex-col gap-2 origin-top-left"
                   >
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Quick Filters</div>
                      <div className="flex gap-2">
                        <button onClick={() => applyYear(new Date().getFullYear())} className="flex-1 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-[var(--accent-50)] dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">This Year</button>
                        <button onClick={() => applyYear(new Date().getFullYear() - 1)} className="flex-1 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-[var(--accent-50)] dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">Last Year</button>
                      </div>
                      
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2 mb-1">By Month</div>
                      <input type="month" onChange={applyMonth} className="w-full text-xs p-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border-none focus:ring-1 focus:ring-[var(--accent-500)]" />

                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2 mb-1">Custom Range</div>
                      <div className="flex items-center gap-1">
                         <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="w-full text-[10px] p-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border-none" />
                         <ArrowRight size={10} className="text-gray-300" />
                         <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="w-full text-[10px] p-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border-none" />
                      </div>
                      <button onClick={applyRange} className="w-full mt-1 bg-[var(--accent-500)] text-white text-xs py-1.5 rounded-lg font-medium shadow-md shadow-[var(--accent-500)]/20">Apply Range</button>
                   </motion.div>
                 </>
               )}
             </AnimatePresence>
          </div>

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 flex-shrink-0" />

          {/* MOOD CHIPS */}
          {MOODS.map(m => (
             <button 
               key={m.value}
               onClick={() => toggleFilter('mood', m.value)}
               className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${activeFilters.mood === m.value ? 'bg-[var(--accent-50)] dark:bg-gray-800 border-[var(--accent-200)] dark:border-gray-700 text-[var(--accent-700)] dark:text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
             >
               <m.icon size={12} className={activeFilters.mood === m.value ? 'text-[var(--accent-500)]' : 'text-gray-400'} />
               {m.label}
             </button>
          ))}

          {/* TAG CHIPS */}
          {uniqueTags.map(tag => (
            <button 
              key={tag}
              onClick={() => toggleFilter('tag', tag)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${activeFilters.tag === tag ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <Tag size={12} /> #{tag}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default JournalSearch;