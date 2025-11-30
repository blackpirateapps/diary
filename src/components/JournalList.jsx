import React, { useState, useMemo, useEffect } from 'react';
import Calendar from 'react-calendar'; // Requires: npm install react-calendar
import 'react-calendar/dist/Calendar.css'; // Import default styles
import { 
  Plus, Calendar as CalendarIcon, Search, WifiOff, Settings, Download, Upload,
  X, Tag, MapPin, Smile, Frown, Meh, Heart, Sun, CloudRain,
  LayoutList, LayoutGrid, ChevronRight, ChevronLeft
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

// --- HELPER COMPONENT FOR IMAGES ---
const JournalEntryImage = ({ src, className = "w-full h-full object-cover" }) => {
  const url = useBlobUrl(src);
  if (!url) return <div className={`bg-gray-100 animate-pulse ${className}`} />;
  return (
    <motion.img
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.5 }}
      src={url}
      className={`${className} opacity-95 group-hover:opacity-100 transition-opacity`}
      alt="Cover"
    />
  );
};

const JournalList = ({
  entries,
  onEdit,
  onCreate,
  onAddOld,
  onImport,
  onExport,
  isOffline,
  isImporting,
  onOpenFlashback
}) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid' | 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ mood: null, tag: null, location: null });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Calendar specific state
  const [selectedDate, setSelectedDate] = useState(new Date());

  const importInputRef = React.useRef(null);

  // --- DERIVE DATA ---
  const uniqueTags = useMemo(() => [...new Set(entries.flatMap(e => e.tags || []))], [entries]);
  const uniqueLocations = useMemo(() => [...new Set(entries.map(e => e.location).filter(Boolean))], [entries]);

  // --- FILTERING LOGIC ---
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // 1. Calendar View Filter (Strict Date Matching)
      if (viewMode === 'calendar') {
        const entryDate = new Date(entry.date).toDateString();
        const selDate = selectedDate.toDateString();
        return entryDate === selDate;
      }

      // 2. Standard Filter (Search & Tags)
      const matchesSearch = searchTerm === '' || 
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.location && entry.location.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMood = activeFilters.mood ? entry.mood === activeFilters.mood : true;
      const matchesTag = activeFilters.tag ? entry.tags?.includes(activeFilters.tag) : true;
      const matchesLoc = activeFilters.location ? entry.location === activeFilters.location : true;

      return matchesSearch && matchesMood && matchesTag && matchesLoc;
    });
  }, [entries, searchTerm, activeFilters, viewMode, selectedDate]);

  const toggleFilter = (type, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: prev[type] === value ? null : value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilters({ mood: null, tag: null, location: null });
    setIsSearchOpen(false);
  };

  // --- ANIMATION VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  // --- RENDERERS ---

  // 1. LIST CARD
  const renderListCard = (entry) => {
    const dateObj = new Date(entry.date);
    const mainDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const yearTime = dateObj.toLocaleDateString(undefined, { year: 'numeric' }) + ' • ' + dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    
    return (
      <motion.div
        layout
        variants={itemVariants}
        key={entry.id}
        onClick={() => onEdit(entry)}
        whileHover={{ scale: 1.01, backgroundColor: "#f9fafb" }}
        whileTap={{ scale: 0.98 }}
        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 cursor-pointer group hover:shadow-md hover:border-gray-200 transition-all"
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors tracking-tight">{mainDate}</span>
            <span className="text-xs text-gray-400 font-medium">{yearTime}</span>
          </div>
          {entry.mood && (() => {
            const moodMeta = MOODS.find(m => m.value === entry.mood);
            if (!moodMeta) return null;
            const Icon = moodMeta.icon;
            return (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 ${moodMeta.color}`}>
                <Icon size={18} />
              </div>
            );
          })()}
        </div>
        
        <div className="text-gray-600 text-sm line-clamp-2 leading-relaxed mt-2 font-normal" 
             dangerouslySetInnerHTML={{ __html: entry.content.replace(/<[^>]*>?/gm, ' ') }} />

        {/* Metadata Tags */}
        {(entry.tags?.length > 0 || entry.location) && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar text-gray-400">
            {entry.location && (
              <div className="flex items-center text-[10px] font-medium bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100 flex-shrink-0">
                <MapPin size={10} className="mr-1" /> {entry.location}
              </div>
            )}
            {entry.tags?.map(tag => (
              <div key={tag} className="flex items-center text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100 flex-shrink-0">
                #{tag}
              </div>
            ))}
          </div>
        )}
        
        {/* Images */}
        {entry.images && entry.images.length > 0 && (
          <div className="mt-3 h-32 w-full rounded-xl overflow-hidden relative border border-gray-100">
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
  };

  // 2. GRID CARD
  const renderGridCard = (entry) => {
    const hasImage = entry.images && entry.images.length > 0;
    const dateObj = new Date(entry.date);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString(undefined, { month: 'short' });

    return (
      <motion.div
        layout
        variants={itemVariants}
        key={entry.id}
        onClick={() => onEdit(entry)}
        whileTap={{ scale: 0.95 }}
        className="aspect-square rounded-xl overflow-hidden relative border border-gray-200 shadow-sm bg-white cursor-pointer group"
      >
        {hasImage ? (
          <>
            <JournalEntryImage src={entry.images[0]} className="w-full h-full object-cover" />
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
                <span className="text-lg font-bold text-gray-800 leading-none">{day}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">{month}</span>
              </div>
              {entry.mood && (() => {
                 const m = MOODS.find(x => x.value === entry.mood);
                 if(m) { const Icon = m.icon; return <Icon size={14} className={m.color} />; }
              })()}
            </div>
            <p className="text-[10px] text-gray-500 line-clamp-3 leading-tight">
              {entry.content.replace(/<[^>]*>?/gm, ' ')}
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 pb-24">
      {/* HEADER */}
      <header className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50">
        <div className="flex justify-between items-start gap-2">
          <motion.div 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="min-w-0 flex-1"
          >
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight truncate">Journal</h1>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-2 font-medium">
              {entries.length} memories
              {isOffline && (
                <span className="flex items-center gap-1 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  <WifiOff size={10} /> Offline
                </span>
              )}
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 10 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="flex items-center gap-2 mt-1 flex-shrink-0"
          >
            {/* View Switcher */}
            <div className="bg-gray-200/50 p-1 rounded-lg flex items-center gap-0.5 mr-1">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutList size={16} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <CalendarIcon size={16} />
              </button>
            </div>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-full transition-colors ${isSearchOpen || searchTerm ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500/20' : 'bg-white text-gray-500 shadow-sm hover:bg-gray-50'}`}
            >
              <Search size={20} />
            </motion.button>
            
            {/* Settings Menu */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 bg-white text-gray-500 shadow-sm rounded-full hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Settings size={20} />
              </motion.button>
              
              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10, x: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-36 z-30 flex flex-col gap-1 origin-top-right"
                    >
                      <button onClick={onAddOld} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg w-full text-left">
                         <CalendarIcon size={14} /> Add Past Date
                      </button>
                      <button onClick={onOpenFlashback} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg w-full text-left">
                         <Smile size={14} /> On This Day
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
                      <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg w-full text-left">
                        <Download size={14} /> Export Backup
                      </button>
                      <button onClick={() => { importInputRef.current.click(); setIsMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg w-full text-left">
                        <Upload size={14} /> Import Backup
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={onCreate}
              className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-full shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center gap-1 text-sm ml-1"
            >
              <Plus size={16} /> New
            </motion.button>
          </motion.div>
        </div>
        
        <input ref={importInputRef} type="file" className="hidden" accept=".zip,.json" onChange={onImport} />

        {/* SEARCH & FILTER BAR (Hidden in Calendar Mode) */}
        <AnimatePresence>
          {viewMode !== 'calendar' && (isSearchOpen || searchTerm || activeFilters.mood || activeFilters.tag || activeFilters.location) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search content, tags, location..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white border-none shadow-sm rounded-xl py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-blue-500/20 text-gray-700 placeholder-gray-400"
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
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium whitespace-nowrap"
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
                         className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${isActive ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                       >
                         <Icon size={12} className={isActive ? 'text-blue-500' : 'text-gray-400'} />
                         {m.label}
                       </button>
                     );
                  })}

                  {uniqueTags.map(tag => (
                    <button 
                      key={tag}
                      onClick={() => toggleFilter('tag', tag)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${activeFilters.tag === tag ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Tag size={12} /> #{tag}
                    </button>
                  ))}

                   {uniqueLocations.map(loc => (
                    <button 
                      key={loc}
                      onClick={() => toggleFilter('location', loc)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${activeFilters.location === loc ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <MapPin size={12} /> {loc}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* IMPORT LOADING */}
      <AnimatePresence>
        {isImporting && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white p-5 rounded-2xl shadow-xl flex items-center gap-4"
            >
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium text-gray-700">Importing memories...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <div className="px-4">
        
        {/* CALENDAR VIEW */}
        {viewMode === 'calendar' && (
           <div className="animate-slideUp space-y-4">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 overflow-hidden">
               <Calendar 
                 onChange={setSelectedDate} 
                 value={selectedDate}
                 className="w-full border-none font-sans"
                 tileClassName={({ date, view }) => {
                   if (view !== 'month') return null;
                   // Check if this date has any entries
                   const hasEntry = entries.some(e => new Date(e.date).toDateString() === date.toDateString());
                   return hasEntry ? 'has-journal-entry' : null;
                 }}
                 tileContent={({ date, view }) => {
                    if (view !== 'month') return null;
                    const dayEntries = entries.filter(e => new Date(e.date).toDateString() === date.toDateString());
                    if (dayEntries.length > 0) {
                      // Get highest mood color or default
                      return (
                        <div className="flex justify-center mt-1 gap-0.5">
                           {dayEntries.slice(0, 3).map((e, i) => (
                             <div key={i} className={`w-1 h-1 rounded-full ${e.mood && e.mood >= 7 ? 'bg-orange-400' : 'bg-blue-400'}`} />
                           ))}
                        </div>
                      );
                    }
                 }}
               />
             </div>
             
             {/* Selected Date Header */}
             <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider ml-2">
                <CalendarIcon size={12} />
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}
             </div>
           </div>
        )}

        {/* RESULTS (List/Grid) */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 gap-3" : "space-y-3"}
        >
          {filteredEntries.length === 0 ? (
             <motion.div variants={itemVariants} className="col-span-full text-center py-20 flex flex-col items-center">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                 {viewMode === 'calendar' ? <CalendarIcon size={24} /> : <Search size={24} />}
               </div>
               <p className="text-gray-400 font-medium">
                 {viewMode === 'calendar' ? 'No entries for this day.' : 'No entries found.'}
               </p>
               {(viewMode === 'calendar' || !searchTerm) && (
                 <button onClick={() => onCreate(viewMode === 'calendar' ? selectedDate : new Date())} className="mt-2 text-blue-500 text-sm font-medium hover:underline">
                   Create entry here
                 </button>
               )}
             </motion.div>
          ) : (
            filteredEntries.map(entry => (
              viewMode === 'grid' ? renderGridCard(entry) : renderListCard(entry)
            ))
          )}
        </motion.div>
      </div>

      {/* CUSTOM CSS FOR CALENDAR */}
      <style>{`
        .react-calendar {
          width: 100%;
          background: white;
          border: none;
          font-family: inherit;
        }
        .react-calendar__navigation {
          height: 44px;
          margin-bottom: 0;
        }
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }
        .react-calendar__navigation button:disabled {
          background-color: #f3f4f6;
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
          color: #4b5563;
          padding: 8px 0;
        }
        .react-calendar__tile {
          border-radius: 12px;
          transition: 0.2s all;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: #f3f4f6;
        }
        .react-calendar__tile--now {
          background: #eff6ff;
          color: #2563eb;
          font-weight: bold;
        }
        .react-calendar__tile--active {
          background: #3b82f6 !important;
          color: white !important;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
        }
        .react-calendar__tile--active div {
          background-color: white !important; 
        }
        /* Hide neighbor days for cleaner look */
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default JournalList;