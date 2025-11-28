import React, { useState, useMemo } from 'react';
import { 
  Plus, Calendar, Search, WifiOff, Settings, Download, Upload,
  X, Tag, MapPin, Smile, Frown, Meh, Heart, Sun, CloudRain
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
const JournalEntryImage = ({ src }) => {
  const url = useBlobUrl(src);
  
  if (!url) return <div className="w-full h-full bg-gray-100 animate-pulse" />;

  return (
    <motion.img
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.5 }}
      src={url}
      className="w-full h-full object-cover opacity-95 group-hover:opacity-100"
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ mood: null, tag: null, location: null });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const importInputRef = React.useRef(null);

  // --- DERIVE UNIQUE TAGS & LOCATIONS ---
  const uniqueTags = useMemo(() => [...new Set(entries.flatMap(e => e.tags || []))], [entries]);
  const uniqueLocations = useMemo(() => [...new Set(entries.map(e => e.location).filter(Boolean))], [entries]);

  // --- FILTERING LOGIC ---
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.location && entry.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMood = activeFilters.mood ? entry.mood === activeFilters.mood : true;
    const matchesTag = activeFilters.tag ? entry.tags?.includes(activeFilters.tag) : true;
    const matchesLoc = activeFilters.location ? entry.location === activeFilters.location : true;

    return matchesSearch && matchesMood && matchesTag && matchesLoc;
  });

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
  const listContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
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
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-full transition-colors ${isSearchOpen || searchTerm ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500/20' : 'bg-white text-gray-500 shadow-sm hover:bg-gray-50'}`}
            >
              <Search size={20} />
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={onOpenFlashback}
              className="p-2 bg-white text-orange-500 shadow-sm rounded-full hover:bg-orange-50 transition-colors"
              title="On This Day"
            >
              <Calendar size={20} />
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
                         <Calendar size={14} /> Add Past Date
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
        
        {/* --- FIXED: ACCEPT BOTH FORMATS --- */}
        <input ref={importInputRef} type="file" className="hidden" accept=".zip,.json" onChange={onImport} />

        {/* SEARCH & FILTER BAR ANIMATION */}
        <AnimatePresence>
          {(isSearchOpen || searchTerm || activeFilters.mood || activeFilters.tag || activeFilters.location) && (
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

                {/* Filter Chips Horizontal Scroll */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {/* Reset Filter */}
                  {(activeFilters.mood || activeFilters.tag || activeFilters.location) && (
                    <motion.button 
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      onClick={clearFilters} 
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium whitespace-nowrap"
                    >
                      <X size={12} /> Clear
                    </motion.button>
                  )}

                  {/* Mood Filters */}
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

                  {/* Tag Filters */}
                  {uniqueTags.map(tag => (
                    <button 
                      key={tag}
                      onClick={() => toggleFilter('tag', tag)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${activeFilters.tag === tag ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Tag size={12} /> #{tag}
                    </button>
                  ))}

                   {/* Location Filters */}
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

      {/* IMPORTING LOADING STATE */}
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

      {/* LIST CONTENT */}
      <motion.div 
        className="px-4 space-y-3"
        variants={listContainerVariants}
        initial="hidden"
        animate="show"
      >
        {filteredEntries.length === 0 ? (
          <motion.div 
            variants={itemVariants}
            className="text-center py-20 flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
              <Search size={24} />
            </div>
            <p className="text-gray-400 font-medium">{searchTerm || activeFilters.mood ? 'No entries match your filters.' : 'No entries yet.'}</p>
            {!searchTerm && <button onClick={onCreate} className="mt-2 text-blue-500 text-sm font-medium hover:underline">Create your first entry</button>}
          </motion.div>
        ) : (
          filteredEntries.map((entry) => {
            const dateObj = new Date(entry.date);
            const mainDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            const yearTime = dateObj.toLocaleDateString(undefined, { year: 'numeric' }) + ' • ' + dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            
            return (
              <motion.div
                layout // Enables smooth reordering animation
                variants={itemVariants}
                key={entry.id}
                onClick={() => onEdit(entry)}
                whileHover={{ scale: 1.01, backgroundColor: "#f9fafb" }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 cursor-pointer group hover:shadow-md hover:border-gray-200 transition-shadow"
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
                
                {/* Content Preview */}
                <div className="text-gray-600 text-sm line-clamp-2 leading-relaxed mt-2 font-normal" 
                     dangerouslySetInnerHTML={{ __html: entry.content.replace(/<[^>]*>?/gm, ' ') }} />

                {/* Metadata Footer */}
                {(entry.tags?.length > 0 || entry.location || entry.weather) && (
                  <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar text-gray-400">
                    {entry.location && (
                      <div className="flex items-center text-[10px] font-medium bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100 flex-shrink-0">
                        <MapPin size={10} className="mr-1" /> {entry.location}
                      </div>
                    )}
                    {entry.weather && (
                      <div className="flex items-center text-[10px] font-medium bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100 flex-shrink-0">
                        {entry.weather}
                      </div>
                    )}
                    {entry.tags?.map(tag => (
                      <div key={tag} className="flex items-center text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100 flex-shrink-0">
                        #{tag}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Images Preview */}
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
          })
        )}
      </motion.div>
    </div>
  );
};

export default JournalList;