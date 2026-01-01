import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Calendar as CalendarIcon, Search, WifiOff, Download, Upload,
  X, Tag, Smile, LayoutList, LayoutGrid, Eye, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Sub-components
import { MOODS } from './constants';
import DailyPromptWidget from './DailyPromptWidget';
import JournalCalendar from './JournalCalendar';
import { ListCard, GridCard } from './JournalCards';

const JournalList = ({
  entries,
  appName, 
  onEdit,
  onCreate,
  onAddOld,
  onImport,
  onExport,
  isOffline,
  onOpenFlashback,
  initialView = 'list'
}) => {
  const [viewMode, setViewMode] = useState(initialView); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ mood: null, tag: null, location: null });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // --- CALENDAR STATE ---
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = localStorage.getItem('journal_selected_date');
    return saved ? new Date(saved) : new Date();
  });

  useEffect(() => {
    localStorage.setItem('journal_selected_date', selectedDate.toISOString());
  }, [selectedDate]);

  const importInputRef = useRef(null);

  // --- DERIVE DATA ---
  const uniqueTags = useMemo(() => [...new Set(entries.flatMap(e => e.tags || []))], [entries]);

  // Check if there is an entry for today (for the Widget logic)
  const isTodayDone = useMemo(() => {
    const todayStr = new Date().toDateString();
    return entries.some(e => new Date(e.date).toDateString() === todayStr);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (viewMode !== 'calendar' && !searchTerm && !activeFilters.mood && !activeFilters.tag && !activeFilters.location) {
      return entries;
    }

    return entries.filter(entry => {
      // Basic Text Search
      const lowerSearch = searchTerm.toLowerCase();
      const contentToSearch = (entry.preview || entry.content || '').toLowerCase();
      
      if (viewMode === 'calendar') {
        const entryDate = new Date(entry.date).toDateString();
        const selDate = selectedDate.toDateString();
        return entryDate === selDate;
      }
      
      const matchesSearch = searchTerm === '' || 
        contentToSearch.includes(lowerSearch) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(lowerSearch)) ||
        (entry.location && entry.location.toLowerCase().includes(lowerSearch));

      const matchesMood = activeFilters.mood ? entry.mood === activeFilters.mood : true;
      const matchesTag = activeFilters.tag ? entry.tags?.includes(activeFilters.tag) : true;
      const matchesLoc = activeFilters.location ? entry.location === activeFilters.location : true;

      return matchesSearch && matchesMood && matchesTag && matchesLoc;
    });
  }, [entries, searchTerm, activeFilters, viewMode, selectedDate]);

  const toggleFilter = (type, value) => {
    setActiveFilters(prev => ({ ...prev, [type]: prev[type] === value ? null : value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilters({ mood: null, tag: null, location: null });
    setIsSearchOpen(false);
  };

  const handleCreateNew = () => {
    const dateToUse = viewMode === 'calendar' ? selectedDate : new Date();
    onCreate(dateToUse);
  };

  const jumpToToday = () => {
    setSelectedDate(new Date());
  };

  const containerVariants = { 
    hidden: { opacity: 0 }, 
    show: { opacity: 1, transition: { duration: 0.2 } } 
  };
  const itemVariants = { 
    hidden: { opacity: 0, y: 10 }, 
    show: { opacity: 1, y: 0 } 
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8 text-gray-900 dark:text-gray-100 transition-colors md:px-6 md:pt-6">
      
      {/* HEADER */}
      <header className="px-6 pt-6 pb-2 sticky top-0 md:relative bg-[#F3F4F6]/95 dark:bg-gray-950/95 md:bg-transparent backdrop-blur-md z-20 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50 transition-colors -mx-6 md:mx-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2 px-6 md:px-0">
          
          {/* TITLE & META (Desktop Adjusted) */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight truncate md:mb-1">{appName}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2 font-medium">
              {entries.length} memories
              {isOffline && <span className="flex items-center gap-1 text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full"><WifiOff size={10} /> Offline</span>}
            </p>
          </motion.div>
          
          {/* DESKTOP ACTIONS CONTAINER */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto">
            
            {/* SEARCH TOGGLE */}
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`w-10 h-10 md:w-auto md:px-4 md:rounded-xl flex items-center gap-2 justify-center rounded-full transition-colors ${isSearchOpen || searchTerm ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)] text-[var(--accent-600)] ring-2 ring-[var(--accent-500)]/20' : 'bg-white dark:bg-gray-900 text-gray-500 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <Search size={20} />
              <span className="hidden md:inline text-sm font-medium">Search</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleCreateNew} 
              className="w-10 h-10 md:w-auto md:px-5 md:rounded-xl flex items-center justify-center gap-2 bg-[var(--accent-500)] text-white rounded-full shadow-lg shadow-[var(--accent-500)]/30 active:scale-95 transition-all hover:bg-[var(--accent-600)]"
            >
              <Plus size={20} />
              <span className="hidden md:inline text-sm font-bold">New Entry</span>
            </motion.button>

            {/* VIEW TOGGLES */}
            <div className="hidden md:flex bg-white dark:bg-gray-900 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
               {['list', 'grid', 'calendar'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-gray-100 dark:bg-gray-800 text-[var(--accent-600)] dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {mode === 'list' && <LayoutList size={18} />}
                    {mode === 'grid' && <LayoutGrid size={18} />}
                    {mode === 'calendar' && <CalendarIcon size={18} />}
                  </button>
               ))}
            </div>

            {/* MOBILE MENU TRIGGER */}
            <div className="relative md:hidden">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-500 shadow-sm rounded-full hover:text-[var(--accent-600)] hover:bg-[var(--accent-50)] dark:hover:bg-gray-800 transition-colors"
              >
                <MoreVertical size={20} />
              </motion.button>
              
              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10, x: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 top-12 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 p-2 w-48 z-30 flex flex-col gap-1 origin-top-right"
                    >
                      <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex mb-2">
                        {['list', 'grid', 'calendar'].map(mode => (
                          <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${viewMode === mode ? 'bg-white dark:bg-gray-700 text-[var(--accent-600)] dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                          >
                            {mode === 'list' && <LayoutList size={16} />}
                            {mode === 'grid' && <LayoutGrid size={16} />}
                            {mode === 'calendar' && <CalendarIcon size={16} />}
                          </button>
                        ))}
                      </div>

                      <button onClick={onAddOld} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left">
                         <CalendarIcon size={16} className="text-gray-400" /> Add Past Date
                      </button>
                      <button onClick={onOpenFlashback} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left">
                         <Smile size={16} className="text-gray-400" /> On This Day
                      </button>
                      <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                      <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left">
                        <Download size={16} className="text-gray-400" /> Export Backup
                      </button>
                      <button onClick={() => { importInputRef.current.click(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left">
                        <Upload size={16} className="text-gray-400" /> Import Backup
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
        
        <input ref={importInputRef} type="file" className="hidden" accept=".zip,.json" onChange={onImport} />

        {/* EXPANDABLE SEARCH */}
        <AnimatePresence>
          {(isSearchOpen || searchTerm || activeFilters.mood || activeFilters.tag || activeFilters.location) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden px-6 md:px-0"
            >
              <div className="pt-2 space-y-4 pb-4">
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

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {(activeFilters.mood || activeFilters.tag || activeFilters.location) && (
                    <motion.button 
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      onClick={clearFilters} 
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 cursor-pointer"
                    >
                      <X size={12} /> Clear
                    </motion.button>
                  )}
                  {MOODS.map(m => {
                     const Icon = m.icon;
                     const isActive = activeFilters.mood === m.value;
                     return (
                       <button 
                         key={m.value}
                         onClick={() => toggleFilter('mood', m.value)}
                         className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${isActive ? 'bg-[var(--accent-50)] dark:bg-gray-800 border-[var(--accent-200)] dark:border-gray-700 text-[var(--accent-700)] dark:text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                       >
                         <Icon size={12} className={isActive ? 'text-[var(--accent-500)]' : 'text-gray-400'} />
                         {m.label}
                       </button>
                     );
                  })}
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
          )}
        </AnimatePresence>
      </header>

      {/* CONTENT */}
      <div className="px-4 md:px-0">
        
        {/* WIDGET */}
        {viewMode === 'list' && (
          <DailyPromptWidget onWrite={() => onCreate(new Date())} isTodayDone={isTodayDone} />
        )}

        {/* CALENDAR */}
        {viewMode === 'calendar' && (
           <JournalCalendar 
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              entries={entries}
              jumpToToday={jumpToToday}
              onCreate={onCreate}
           />
        )}

        {/* LIST / GRID CONTAINER */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={
            viewMode === 'grid' 
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6" 
            : "space-y-3 max-w-3xl mx-auto" 
          }
        >
          {filteredEntries.length === 0 ? (
             <div className="col-span-full text-center py-20 flex flex-col items-center animate-fadeIn">
               <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-gray-600">
                 {viewMode === 'calendar' ? <CalendarIcon size={24} /> : <Eye size={24} />}
               </div>
               <p className="text-gray-400 dark:text-gray-500 font-medium">
                 {viewMode === 'calendar' ? 'No entries for this day.' : 'No entries found.'}
               </p>
               {(viewMode === 'calendar' || !searchTerm) && (
                 <button onClick={() => onCreate(viewMode === 'calendar' ? selectedDate : new Date())} className="mt-2 text-[var(--accent-500)] text-sm font-medium hover:underline">
                   Create entry here
                 </button>
               )}
             </div>
          ) : (
            filteredEntries.map(entry => (
              viewMode === 'grid' 
                ? <GridCard key={entry.id} entry={entry} onClick={onEdit} variants={itemVariants} />
                : <ListCard key={entry.id} entry={entry} onClick={onEdit} variants={itemVariants} />
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default JournalList;