import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Calendar as CalendarIcon, Search, WifiOff, Download, Upload,
  LayoutList, LayoutGrid, Eye, MoreVertical, Smile, ArrowLeft, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';

// Sub-components
import DailyPromptWidget from './DailyPromptWidget';
import JournalCalendar from './JournalCalendar';
import { ListCard, GridCard } from './JournalCards';
import JournalSearch from './JournalSearch';

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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ mood: null, tag: null, location: null });
  const [dateFilter, setDateFilter] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = localStorage.getItem('journal_selected_date');
    return saved ? new Date(saved) : new Date();
  });

  const importInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('journal_selected_date', selectedDate.toISOString());
  }, [selectedDate]);

  // --- FLASHBACK LOGIC ---
  const flashbackEntry = useMemo(() => {
    if (!entries) return null;
    const today = new Date();
    return entries.find(e => {
      const d = new Date(e.date);
      return d.getDate() === today.getDate() && 
             d.getMonth() === today.getMonth() && 
             d.getFullYear() < today.getFullYear();
    });
  }, [entries]);

  // --- FILTERING LOGIC ---
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (viewMode === 'calendar') {
        return new Date(entry.date).toDateString() === selectedDate.toDateString();
      }

      const lowerSearch = searchTerm.toLowerCase();
      const contentToSearch = (entry.preview || entry.content || '').toLowerCase();
      const matchesSearch = searchTerm === '' || 
        contentToSearch.includes(lowerSearch) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(lowerSearch)) ||
        (entry.location && entry.location.toLowerCase().includes(lowerSearch));

      const matchesMood = activeFilters.mood ? entry.mood === activeFilters.mood : true;
      const matchesTag = activeFilters.tag ? entry.tags?.includes(activeFilters.tag) : true;
      const matchesLoc = activeFilters.location ? entry.location === activeFilters.location : true;

      let matchesDate = true;
      if (dateFilter?.start && dateFilter?.end) {
        const entryDate = new Date(entry.date);
        matchesDate = entryDate >= dateFilter.start && entryDate <= dateFilter.end;
      }

      return matchesSearch && matchesMood && matchesTag && matchesLoc && matchesDate;
    });
  }, [entries, searchTerm, activeFilters, viewMode, selectedDate, dateFilter]);

  // --- DAY ONE GROUPING ---
  const groupedEntries = useMemo(() => {
    const groups = [];
    filteredEntries.forEach(entry => {
      const date = new Date(entry.date);
      const label = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      let group = groups.find(g => g.label === label);
      if (!group) {
        group = { label, entries: [] };
        groups.push(group);
      }
      group.entries.push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const flattenedList = useMemo(() => {
    const items = [];
    groupedEntries.forEach(group => {
      items.push({ type: 'header', label: group.label });
      group.entries.forEach(entry => items.push({ type: 'entry', data: entry }));
    });
    return items;
  }, [groupedEntries]);

  const uniqueTags = useMemo(() => [...new Set(entries.flatMap(e => e.tags || []))], [entries]);
  const isTodayDone = useMemo(() => entries.some(e => new Date(e.date).toDateString() === new Date().toDateString()), [entries]);

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilters({ mood: null, tag: null, location: null });
    setDateFilter(null);
    setIsSearchExpanded(false);
  };

  const renderEmptyState = () => (
    <div className="col-span-full text-center py-20 flex flex-col items-center animate-fadeIn">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-gray-600">
        <Eye size={24} />
      </div>
      <p className="text-gray-400 dark:text-gray-500 font-medium">No entries found.</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-24 md:pb-8 text-gray-900 dark:text-gray-100 transition-colors md:px-6">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#F3F4F6]/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 transition-all">
        <div className="max-w-5xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-3">
          
          <AnimatePresence mode="wait">
            {!isSearchExpanded ? (
              <motion.div key="title" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 min-w-0">
                <h1 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight truncate leading-none">
                  {appName}
                </h1>
                <p className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {entries.length} Memories
                  {isOffline && <span className="flex items-center gap-1 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px]"><WifiOff size={10} /> Offline</span>}
                </p>
              </motion.div>
            ) : (
              <motion.div key="search-ui" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex-1 flex items-center gap-2">
                <button onClick={() => {setIsSearchExpanded(false); clearFilters();}} className="p-2 -ml-2 text-gray-500 hover:text-[var(--accent-500)] transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <span className="text-lg font-black tracking-tight">Search</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2 md:gap-3">
            {!isSearchExpanded && (
              <button 
                onClick={() => setIsSearchExpanded(true)}
                className="p-2.5 rounded-full bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 text-gray-500 hover:text-[var(--accent-600)] transition-all md:hidden"
              >
                <Search size={20} />
              </button>
            )}

            <div className="hidden md:flex bg-white dark:bg-gray-900 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                {['list', 'grid', 'calendar'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-gray-100 dark:bg-gray-800 text-[var(--accent-600)] shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {mode === 'list' && <LayoutList size={18} />}
                    {mode === 'grid' && <LayoutGrid size={18} />}
                    {mode === 'calendar' && <CalendarIcon size={18} />}
                  </button>
                ))}
            </div>

            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => onCreate(viewMode === 'calendar' ? selectedDate : new Date())} 
              className="flex items-center justify-center gap-2 bg-[var(--accent-500)] text-white px-4 py-2.5 md:px-5 rounded-full md:rounded-xl shadow-lg shadow-[var(--accent-500)]/25 hover:bg-[var(--accent-600)] transition-all"
            >
              <Plus size={20} strokeWidth={3} />
              <span className="hidden md:inline text-sm font-black uppercase tracking-tight">New Entry</span>
            </motion.button>

            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2.5 md:p-3 rounded-full bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 text-gray-500 transition-all"
              >
                <MoreVertical size={20} />
              </button>
              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10, x: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 top-12 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 p-2 w-48 z-50 flex flex-col gap-1 origin-top-right"
                    >
                      <button onClick={onAddOld} className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left transition-colors"><CalendarIcon size={16} /> Add Past Date</button>
                      <button onClick={() => {onOpenFlashback(); setIsMenuOpen(false);}} className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left transition-colors"><Smile size={16} /> On This Day</button>
                      <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                      <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left transition-colors"><Download size={16} /> Export Backup</button>
                      <button onClick={() => { importInputRef.current.click(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg w-full text-left transition-colors"><Upload size={16} /> Import Backup</button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS - ONLY VISIBLE WHEN SEARCH IS EXPANDED */}
        <AnimatePresence>
          {isSearchExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <JournalSearch 
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                activeFilters={activeFilters} toggleFilter={(t, v) => setActiveFilters(prev => ({...prev, [t]: prev[t] === v ? null : v}))}
                uniqueTags={uniqueTags} dateFilter={dateFilter} setDateFilter={setDateFilter}
                onClear={clearFilters}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-5xl mx-auto px-4 md:px-0 mt-4 min-h-[60vh]">
        {viewMode === 'list' && !searchTerm && !dateFilter && (
          <div className="max-w-3xl mx-auto">
            <DailyPromptWidget 
              onWrite={() => onCreate(new Date())} 
              isTodayDone={isTodayDone} 
              flashback={flashbackEntry}
              onViewFlashback={() => onEdit(flashbackEntry)}
            />
          </div>
        )}

        {filteredEntries.length === 0 ? renderEmptyState() : (
          <>
            {viewMode === 'list' && (
              <Virtuoso
                useWindowScroll
                data={flattenedList}
                className="max-w-3xl mx-auto"
                itemContent={(index, item) => (
                  item.type === 'header' ? (
                    <div className="sticky top-16 md:top-20 z-10 py-4 bg-[#F3F4F6] dark:bg-gray-950">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-600)] dark:text-[var(--accent-400)]">
                        {item.label}
                      </h2>
                    </div>
                  ) : <div className="pb-4"><ListCard entry={item.data} onClick={onEdit} /></div>
                )}
              />
            )}

            {viewMode === 'grid' && (
              <div className="space-y-8">
                {groupedEntries.map(group => (
                  <section key={group.label}>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 px-1">{group.label}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                      {group.entries.map(entry => <GridCard key={entry.id} entry={entry} onClick={onEdit} />)}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {viewMode === 'calendar' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <JournalCalendar 
                  selectedDate={selectedDate} setSelectedDate={setSelectedDate} entries={entries} 
                  jumpToToday={() => setSelectedDate(new Date())} onCreate={onCreate} 
                />
                <div className="space-y-3 max-w-3xl mx-auto">
                  {filteredEntries.map(entry => <ListCard key={entry.id} entry={entry} onClick={onEdit} />)}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <input ref={importInputRef} type="file" className="hidden" accept=".zip,.json" onChange={onImport} />
    </div>
  );
};

export default JournalList;