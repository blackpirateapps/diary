import React, { useState, useMemo, useEffect, useRef } from 'react';
import Calendar from 'react-calendar'; 
import 'react-calendar/dist/Calendar.css'; 
import { 
  Plus, Calendar as CalendarIcon, Search, WifiOff, Download, Upload,
  X, Tag, MapPin, Smile, Frown, Meh, Heart, Sun, CloudRain,
  LayoutList, LayoutGrid, Eye, CalendarDays, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBlobUrl } from '../db';

// --- CONFIGURATION ---
const MOODS = [
  { value: 1, icon: CloudRain, color: 'text-gray-400', label: 'Awful' },
  { value: 2, icon: CloudRain, color: 'text-blue-400', label: 'Bad' },
  { value: 3, icon: Frown, color: 'text-blue-500', label: 'Sad' },
  { value: 4, icon: Meh, color: 'text-indigo-400', label: 'Meh' },
  { value: 5, icon: Meh, color: 'text-indigo-500', label: 'Okay' },
  { value: 6, icon: Sun, color: 'text-yellow-500', label: 'Good' },
  { value: 7, icon: Sun, color: 'text-orange-500', label: 'Great' },
  { value: 8, icon: Smile, color: 'text-orange-600', label: 'Happy' },
  { value: 9, icon: Heart, color: 'text-pink-500', label: 'Loved' },
  { value: 10, icon: Heart, color: 'text-red-500', label: 'Amazing' },
];

// --- HELPER: TEXT PREVIEW ---
const getEntryPreview = (entry) => {
  // 1. Use the pre-calculated preview if available (New Editor)
  if (entry.preview) return entry.preview;

  // 2. Check if content is raw JSON (Lexical State)
  if (typeof entry.content === 'string' && entry.content.trim().startsWith('{')) {
    return "View entry to read content..."; // Fallback for JSON entries missing preview
  }

  // 3. Fallback for Legacy Entries (Markdown/HTML) - Strip tags
  return entry.content ? entry.content.replace(/<[^>]*>?/gm, ' ') : '';
};

// --- IOS STYLE WIDGET COMPONENT ---
const DailyPromptWidget = ({ onWrite, isTodayDone }) => (
  <div onClick={onWrite} className="mb-6 mx-6 md:mx-0 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-3xl p-6 shadow-lg shadow-blue-500/20 text-white cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group">
    <div className="relative z-10 flex justify-between items-start">
      <div>
        <h2 className="text-xl font-bold mb-1 tracking-tight">
          {isTodayDone ? "Continue Writing" : "Write your diary today"}
        </h2>
        <p className="text-blue-100 text-sm font-medium opacity-90">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-colors shadow-inner">
        <Plus size={24} className="text-white" strokeWidth={3} />
      </div>
    </div>
    {/* Decorative Background Elements */}
    <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
    <div className="absolute top-[-20%] right-[20%] w-24 h-24 bg-white/5 rounded-full blur-xl" />
  </div>
);

// --- OPTIMIZED SUB-COMPONENTS ---

const JournalEntryImage = React.memo(({ src, className = "w-full h-full object-cover" }) => {
  const url = useBlobUrl(src);
  if (!url) return <div className={`bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`} />;
  return (
    <img
      src={url}
      loading="lazy"
      decoding="async"
      className={`${className} transition-opacity duration-300`}
      alt="Cover"
    />
  );
});

// Memoized List Card
const ListCard = React.memo(({ entry, onClick, variants }) => {
  const dateObj = new Date(entry.date);
  const mainDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const yearTime = dateObj.toLocaleDateString(undefined, { year: 'numeric' }) + ' • ' + dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const previewText = getEntryPreview(entry);

  return (
    <motion.div
      variants={variants}
      onClick={() => onClick(entry)}
      whileTap={{ scale: 0.98 }}
      className="transform-gpu will-change-transform bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100/50 dark:border-gray-800 cursor-pointer group hover:shadow-md transition-all hover:border-[var(--accent-200)] dark:hover:border-gray-700"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-[var(--accent-600)] dark:group-hover:text-[var(--accent-500)] transition-colors tracking-tight">{mainDate}</span>
          <span className="text-xs text-gray-400 font-medium">{yearTime}</span>
        </div>
        {entry.mood && (() => {
          const moodMeta = MOODS.find(m => m.value === entry.mood);
          if (!moodMeta) return null;
          const Icon = moodMeta.icon;
          return (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 ${moodMeta.color}`}>
              <Icon size={18} />
            </div>
          );
        })()}
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 leading-relaxed mt-2 font-normal">
        {previewText}
      </p>

      {(entry.tags?.length > 0 || entry.location) && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar text-gray-400 dark:text-gray-500">
          {entry.location && (
            <div className="flex items-center text-[10px] font-medium bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700 flex-shrink-0">
              <MapPin size={10} className="mr-1" /> {entry.location}
            </div>
          )}
          {entry.tags?.map(tag => (
            <div key={tag} className="flex items-center text-[10px] font-medium bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-600)] dark:text-[var(--accent-400)] px-2 py-1 rounded-md border border-[var(--accent-100)] dark:border-gray-700 flex-shrink-0">
              #{tag}
            </div>
          ))}
        </div>
      )}
      
      {entry.images && entry.images.length > 0 && (
        <div className="mt-3 h-32 md:h-48 w-full rounded-xl overflow-hidden relative border border-gray-100 dark:border-gray-800">
          <JournalEntryImage src={entry.images[0]} />
          {entry.images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              +{entry.images.length - 1} photos
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
});

// Memoized Grid Card
const GridCard = React.memo(({ entry, onClick, variants }) => {
  const hasImage = entry.images && entry.images.length > 0;
  const dateObj = new Date(entry.date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString(undefined, { month: 'short' });
  const previewText = getEntryPreview(entry);

  return (
    <motion.div
      variants={variants}
      onClick={() => onClick(entry)}
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="transform-gpu will-change-transform aspect-square rounded-xl overflow-hidden relative border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 cursor-pointer group transition-all"
    >
      {hasImage ? (
        <>
          <JournalEntryImage src={entry.images[0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
          <div className="absolute bottom-2 left-2 text-white">
             <span className="text-xl font-bold leading-none block">{day}</span>
             <span className="text-xs font-medium uppercase opacity-90">{month}</span>
          </div>
        </>
      ) : (
        <div className="w-full h-full p-3 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-none">{day}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">{month}</span>
            </div>
            {entry.mood && (() => {
               const m = MOODS.find(x => x.value === entry.mood);
               if(m) { const Icon = m.icon; return <Icon size={14} className={m.color} />; }
            })()}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-3 leading-tight group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
            {previewText}
          </p>
        </div>
      )}
    </motion.div>
  );
});

// --- MAIN COMPONENT ---

const JournalList = ({
  entries,
  appName, 
  onEdit,
  onCreate,
  onAddOld,
  onImport,
  onExport,
  isOffline,
  onOpenFlashback
}) => {
  const [viewMode, setViewMode] = useState('list'); 
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
  const uniqueLocations = useMemo(() => [...new Set(entries.map(e => e.location).filter(Boolean))], [entries]);

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
      // Basic Text Search (Check both preview and legacy content)
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
        
        {/* NEW: IOS STYLE DAILY WIDGET */}
        {viewMode === 'list' && (
          <DailyPromptWidget onWrite={() => onCreate(new Date())} isTodayDone={isTodayDone} />
        )}

        {/* CALENDAR */}
        {viewMode === 'calendar' && (
           <div className="animate-slideUp space-y-4 max-w-4xl mx-auto">
             <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <CalendarIcon size={12} />
                  {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}
                </div>
                <button 
                  onClick={jumpToToday} 
                  className="flex items-center gap-1 text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:hover:bg-gray-800 px-2 py-1 rounded-lg text-xs font-bold transition-colors"
                >
                  <CalendarDays size={14} /> Today
                </button>
             </div>

             <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 overflow-hidden">
               <Calendar 
                 onChange={setSelectedDate} 
                 value={selectedDate}
                 className="w-full border-none font-sans"
                 tileClassName={({ date, view }) => {
                   if (view !== 'month') return null;
                   const hasEntry = entries.some(e => new Date(e.date).toDateString() === date.toDateString());
                   return hasEntry ? 'has-journal-entry' : null;
                 }}
                 tileContent={({ date, view }) => {
                    if (view !== 'month') return null;
                    const dayEntries = entries.filter(e => new Date(e.date).toDateString() === date.toDateString());
                    if (dayEntries.length > 0) {
                      return (
                        <div className="flex justify-center mt-1 gap-0.5">
                           {dayEntries.slice(0, 3).map((e, i) => (
                             <div key={i} className={`w-1.5 h-1.5 rounded-full ${e.mood && e.mood >= 7 ? 'bg-orange-400' : 'bg-[var(--accent-400)]'}`} />
                           ))}
                        </div>
                      );
                    }
                 }}
               />
             </div>
           </div>
        )}

        {/* LIST / GRID CONTAINER */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={
            viewMode === 'grid' 
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6" // Expanded grid for desktop
            : "space-y-3 max-w-3xl mx-auto" // Centered max-width for readable list
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

      {/* CUSTOM CSS FOR CALENDAR REMAINS THE SAME */}
      <style>{`
        .react-calendar {
          width: 100%;
          background: transparent;
          border: none;
          font-family: inherit;
        }
        /* Increase calendar size for desktop */
        @media (min-width: 768px) {
           .react-calendar { font-size: 1.1em; }
           .react-calendar__tile { height: 80px; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 10px; }
        }
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 16px;
          font-weight: 600;
          color: inherit;
        }
        .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.65em;
          color: #9ca3af;
          margin-bottom: 8px;
        }
        .react-calendar__month-view__days__day {
          font-size: 14px;
          font-weight: 500;
          color: inherit;
          padding: 8px 0;
        }
        .react-calendar__tile {
          border-radius: 12px;
          transition: 0.2s all;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: var(--accent-50);
        }
        .dark .react-calendar__tile:enabled:hover {
          background-color: #374151;
        }
        .react-calendar__tile--now {
          background: var(--accent-50);
          color: var(--accent-600);
          font-weight: bold;
        }
        .dark .react-calendar__tile--now {
          background: #374151;
          color: var(--accent-400);
        }
        .react-calendar__tile--active {
          background: var(--accent-500) !important;
          color: white !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .react-calendar__tile--active div div {
          background-color: white !important; 
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #d1d5db;
        }
        .dark .react-calendar__month-view__days__day--neighboringMonth {
          color: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default JournalList;