import React, { useState, useMemo, useEffect, useRef, forwardRef } from 'react';
import { 
  Plus, Calendar as CalendarIcon, Search, WifiOff, Download, Upload,
  LayoutList, LayoutGrid, Eye, MoreVertical, Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';

// Sub-components
import DailyPromptWidget from './DailyPromptWidget';
import JournalCalendar from './JournalCalendar';
import { ListCard, GridCard } from './JournalCards';
import JournalSearch from './JournalSearch'; // <--- IMPORT NEW SEARCH

// --- CUSTOM VIRTUALIZED COMPONENTS ---
const GridList = forwardRef(({ children, style, className, ...props }, ref) => (
  <div
    ref={ref}
    style={style}
    className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 ${className || ''}`}
    {...props}
  >
    {children}
  </div>
));

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
  
  // --- FILTER STATE ---
  const [activeFilters, setActiveFilters] = useState({ mood: null, tag: null, location: null });
  const [dateFilter, setDateFilter] = useState(null); // { start: Date, end: Date, label: String }

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = localStorage.getItem('journal_selected_date');
    return saved ? new Date(saved) : new Date();
  });

  useEffect(() => {
    localStorage.setItem('journal_selected_date', selectedDate.toISOString());
  }, [selectedDate]);

  const importInputRef = useRef(null);
  const uniqueTags = useMemo(() => [...new Set(entries.flatMap(e => e.tags || []))], [entries]);

  const isTodayDone = useMemo(() => {
    const todayStr = new Date().toDateString();
    return entries.some(e => new Date(e.date).toDateString() === todayStr);
  }, [entries]);

  // --- FILTERING LOGIC ---
  const filteredEntries = useMemo(() => {
    // Optimization: If no filters active, return all (unless in calendar mode)
    if (viewMode !== 'calendar' && !searchTerm && !activeFilters.mood && !activeFilters.tag && !activeFilters.location && !dateFilter) {
      return entries;
    }

    return entries.filter(entry => {
      // 1. Calendar View Override
      if (viewMode === 'calendar') {
        return new Date(entry.date).toDateString() === selectedDate.toDateString();
      }

      // 2. Text Search
      const lowerSearch = searchTerm.toLowerCase();
      const contentToSearch = (entry.preview || entry.content || '').toLowerCase();
      const matchesSearch = searchTerm === '' || 
        contentToSearch.includes(lowerSearch) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(lowerSearch)) ||
        (entry.location && entry.location.toLowerCase().includes(lowerSearch));

      // 3. Metadata Filters
      const matchesMood = activeFilters.mood ? entry.mood === activeFilters.mood : true;
      const matchesTag = activeFilters.tag ? entry.tags?.includes(activeFilters.tag) : true;
      const matchesLoc = activeFilters.location ? entry.location === activeFilters.location : true;

      // 4. Date Range Filter
      let matchesDate = true;
      if (dateFilter && dateFilter.start && dateFilter.end) {
        const entryDate = new Date(entry.date);
        matchesDate = entryDate >= dateFilter.start && entryDate <= dateFilter.end;
      }

      return matchesSearch && matchesMood && matchesTag && matchesLoc && matchesDate;
    });
  }, [entries, searchTerm, activeFilters, viewMode, selectedDate, dateFilter]);

  const toggleFilter = (type, value) => {
    setActiveFilters(prev => ({ ...prev, [type]: prev[type] === value ? null : value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilters({ mood: null, tag: null, location: null });
    setDateFilter(null);
    setIsSearchOpen(false);
  };

  const handleCreateNew = () => {
    const dateToUse = viewMode === 'calendar' ? selectedDate : new Date();
    onCreate(dateToUse);
  };

  const jumpToToday = () => {
    setSelectedDate(new Date());
  };

  const renderEmptyState = () => (
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
  );

  return (
    <div className="space-y-4 pb-24 md:pb-8 text-gray-900 dark:text-gray-100 transition-colors md:px-6 md:pt-6">
      {/* HEADER */}
    <header className="px-6 pt-6 pb-2 sticky top-0 md:sticky bg-[#F3F4F6]/95 dark:bg-gray-950/95 md:bg-transparent backdrop-blur-md z-20 md:z-0 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50 transition-colors -mx-6 md:mx-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 px-6 md:px-0">
        
        {/* APP TITLE */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="min-w-0 flex-1">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight truncate md:mb-1">{appName}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2 font-medium">
            {entries.length} memories
            {isOffline && <span className="flex items-center gap-1 text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full"><WifiOff size={10} /> Offline</span>}
          </p>
        </motion.div>
        
        {/* DESKTOP ACTIONS */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto">
          
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

          {/* MOBILE MENU */}
          <div className="relative md:hidden">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-500 shadow-sm rounded-full hover:text-[var(--accent-600)] hover:bg-[var(--accent-50)] dark:hover:bg-gray-800 transition-colors"
            >
              <MoreVertical size={20} />
            </motion.button>
            {/* ... Mobile Menu Content (Keep existing code) ... */}
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
                      <button onClick={onAddOld} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left"><CalendarIcon size={16} className="text-gray-400" /> Add Past Date</button>
                      <button onClick={onOpenFlashback} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left"><Smile size={16} className="text-gray-400" /> On This Day</button>
                      <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                      <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left"><Download size={16} className="text-gray-400" /> Export Backup</button>
                      <button onClick={() => { importInputRef.current.click(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left"><Upload size={16} className="text-gray-400" /> Import Backup</button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
          </div>
        </motion.div>
      </div>
      
      <input ref={importInputRef} type="file" className="hidden" accept=".zip,.json" onChange={onImport} />

      {/* SEARCH COMPONENT (Always visible now, expandable panel) */}
      <JournalSearch 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeFilters={activeFilters}
        toggleFilter={toggleFilter}
        uniqueTags={uniqueTags}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onClear={clearFilters}
      />
    </header>

      {/* CONTENT AREA */}
      <div className="px-4 md:px-0 min-h-[50vh] relative z-0">
        {/* WIDGET */}
        {viewMode === 'list' && !searchTerm && !dateFilter && (
          <DailyPromptWidget onWrite={() => onCreate(new Date())} isTodayDone={isTodayDone} />
        )}

        {/* CALENDAR VIEW */}
        {viewMode === 'calendar' && (
           <>
             <JournalCalendar 
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                entries={entries}
                jumpToToday={jumpToToday}
                onCreate={onCreate}
             />
             <div className="space-y-3 max-w-3xl mx-auto mt-4">
                {filteredEntries.length === 0 ? renderEmptyState() : (
                    filteredEntries.map(entry => (
                       <ListCard key={entry.id} entry={entry} onClick={onEdit} />
                    ))
                )}
             </div>
           </>
        )}

        {/* VIRTUALIZED LIST VIEW */}
        {viewMode === 'list' && (
           filteredEntries.length === 0 ? renderEmptyState() : (
             <Virtuoso
               useWindowScroll
               data={filteredEntries}
               className="max-w-3xl mx-auto"
               itemContent={(index, entry) => (
                 <div className="pb-3"> 
                    <ListCard entry={entry} onClick={onEdit} />
                 </div>
               )}
             />
           )
        )}

        {/* VIRTUALIZED GRID VIEW */}
        {viewMode === 'grid' && (
            filteredEntries.length === 0 ? renderEmptyState() : (
              <VirtuosoGrid
                useWindowScroll
                data={filteredEntries}
                components={{ List: GridList }}
                itemContent={(index, entry) => (
                   <GridCard entry={entry} onClick={onEdit} />
                )}
              />
            )
        )}
      </div>
    </div>
  );
};

export default JournalList;