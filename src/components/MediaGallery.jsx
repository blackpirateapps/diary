import React, { useState, useMemo } from 'react';
import { 
  Image as ImageIcon, Calendar, MapPin, ChevronLeft, 
  Filter, Tag, Smile, X, ArrowRight, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBlobUrl } from '../db'; 

// --- CONFIGURATION ---
const MOODS = [
  { value: 1, label: 'Awful', color: 'text-gray-400' },
  { value: 2, label: 'Bad', color: 'text-blue-400' },
  { value: 3, label: 'Sad', color: 'text-blue-500' },
  { value: 4, label: 'Meh', color: 'text-indigo-400' },
  { value: 5, label: 'Okay', color: 'text-indigo-500' },
  { value: 6, label: 'Good', color: 'text-yellow-500' },
  { value: 7, label: 'Great', color: 'text-orange-500' },
  { value: 8, label: 'Happy', color: 'text-orange-600' },
  { value: 9, label: 'Loved', color: 'text-pink-500' },
  { value: 10, label: 'Amazing', color: 'text-red-500' },
];

// --- UTILS ---
const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
};

// --- HELPER COMPONENTS ---

const GalleryItem = ({ image, onClick }) => {
  const url = useBlobUrl(image.src); 
  
  return (
    <motion.button
      layoutId={`img-${image.id}`} 
      onClick={() => { triggerHaptic(); onClick(); }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full mb-3 break-inside-avoid rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative group cursor-pointer border border-transparent hover:border-black/5 dark:hover:border-white/10"
    >
      {url ? (
        <img
          src={url}
          alt="Memory"
          loading="lazy"
          className="w-full h-auto object-cover block"
        />
      ) : (
        <div className="w-full aspect-square flex items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-gray-800">
           <ImageIcon size={24} />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-colors duration-300" />
    </motion.button>
  );
};

const LightboxImage = ({ src }) => {
  const url = useBlobUrl(src);
  if (!url) return <div className="w-full h-64 flex items-center justify-center text-gray-400">Loading...</div>;
  
  return (
    <img
      src={url}
      alt="Full screen"
      className="w-full h-auto max-h-[70vh] object-contain"
    />
  );
};

// --- MAIN COMPONENT ---

const MediaGallery = ({ entries, onEdit }) => { // Accepting onEdit prop
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeFilter, setActiveFilter] = useState({ type: 'all', value: null });

  // --- DERIVED DATA ---
  const { uniqueTags, uniqueMoods } = useMemo(() => {
    const tags = new Set();
    const moods = new Set();
    entries.forEach(e => {
      if (e.images && e.images.length > 0) {
        if (e.tags) e.tags.forEach(t => tags.add(t));
        if (e.mood) moods.add(e.mood);
      }
    });
    return {
      uniqueTags: Array.from(tags).sort(),
      uniqueMoods: Array.from(moods).sort((a, b) => b - a),
    };
  }, [entries]);

  const galleryData = useMemo(() => {
    const filteredImages = entries.reduce((acc, entry) => {
      const imgs = Array.isArray(entry.images) ? entry.images : [];
      if (imgs.length === 0) return acc;

      if (activeFilter.type === 'tag' && !entry.tags?.includes(activeFilter.value)) return acc;
      if (activeFilter.type === 'mood' && entry.mood !== activeFilter.value) return acc;
      
      const dateObj = new Date(entry.date);
      
      return [...acc, ...imgs.map((src, index) => ({
        src, 
        id: `${entry.id}-${index}`,
        entryId: entry.id, // Store ID to jump back later
        date: dateObj,
        location: entry.location,
        weather: entry.weather,
        mood: entry.mood
      }))];
    }, []);

    filteredImages.sort((a, b) => b.date - a.date);

    const groups = {};
    filteredImages.forEach(img => {
      const year = img.date.getFullYear();
      const month = img.date.toLocaleString('default', { month: 'long' });
      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = [];
      groups[year][month].push(img);
    });

    return groups;
  }, [entries, activeFilter]);

  const years = Object.keys(galleryData).sort((a, b) => b - a);

  // --- HANDLERS ---
  const handleFilterClick = (type, value) => {
    triggerHaptic();
    if (activeFilter.type === type && activeFilter.value === value) {
      setActiveFilter({ type: 'all', value: null });
    } else {
      setActiveFilter({ type, value });
    }
  };

  const handleJumpToEntry = () => {
    if (!selectedImage || !onEdit) return;
    const entry = entries.find(e => e.id === selectedImage.entryId);
    if (entry) {
      triggerHaptic();
      setSelectedImage(null); // Close lightbox
      onEdit(entry); // Open editor
    }
  };

  const formatFullDate = (date) => {
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
  };

  // --- ANIMATION VARIANTS ---
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="pb-24 bg-[#F3F4F6] dark:bg-gray-950 min-h-screen transition-colors">
      
      {/* HEADER & FILTERS */}
      <header className="sticky top-0 z-20 bg-[#F3F4F6]/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 transition-colors">
        <div className="px-6 pt-6 pb-2">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Media</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">
                  {Object.values(galleryData).reduce((acc, year) => acc + Object.values(year).reduce((c, m) => c + m.length, 0), 0)} photos
              </p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-6 pb-3 pt-2">
          <AnimatePresence>
            {activeFilter.type !== 'all' && (
              <motion.button
                initial={{ scale: 0, width: 0 }} animate={{ scale: 1, width: 'auto' }} exit={{ scale: 0, width: 0 }}
                onClick={() => handleFilterClick('all', null)}
                className="flex items-center gap-1 pr-3 pl-2 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-bold border border-red-100 dark:border-red-900 flex-shrink-0"
              >
                <X size={14} /> Clear
              </motion.button>
            )}
          </AnimatePresence>

          {uniqueMoods.map(moodVal => {
            const mood = MOODS.find(m => m.value === moodVal);
            if (!mood) return null;
            const isActive = activeFilter.type === 'mood' && activeFilter.value === moodVal;
            return (
              <button
                key={`mood-${moodVal}`}
                onClick={() => handleFilterClick('mood', moodVal)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex-shrink-0 ${
                  isActive ? 'bg-[var(--accent-50)] dark:bg-gray-800 border-[var(--accent-500)] text-[var(--accent-600)] dark:text-[var(--accent-400)] shadow-sm' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <Smile size={12} className={isActive ? 'text-[var(--accent-500)]' : mood.color} />
                {mood.label}
              </button>
            );
          })}

          {uniqueTags.map(tag => {
            const isActive = activeFilter.type === 'tag' && activeFilter.value === tag;
            return (
              <button
                key={`tag-${tag}`}
                onClick={() => handleFilterClick('tag', tag)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex-shrink-0 ${
                  isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <Tag size={12} className={isActive ? 'fill-current' : ''} />
                #{tag}
              </button>
            );
          })}
        </div>
      </header>

      {/* GALLERY GRID */}
      <div className="px-6 pt-4 space-y-8">
        {years.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-gray-700">
                {activeFilter.type !== 'all' ? <Filter size={24} /> : <ImageIcon size={24} />}
            </div>
            <p className="font-medium">{activeFilter.type !== 'all' ? 'No photos match this filter.' : 'No photos added yet.'}</p>
            {activeFilter.type !== 'all' && (
              <button onClick={() => setActiveFilter({ type: 'all', null: null })} className="mt-2 text-[var(--accent-500)] text-sm font-bold hover:underline">Clear filters</button>
            )}
          </motion.div>
        ) : (
          years.map((year) => (
            <motion.div key={year} variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              <motion.h2 variants={itemVariants} className="text-2xl font-bold text-gray-300 dark:text-gray-700 border-b border-gray-100 dark:border-gray-800 pb-2 select-none sticky top-32 z-10 mix-blend-difference">
                {year}
              </motion.h2>
              {Object.keys(galleryData[year]).map(month => (
                <motion.div key={`${year}-${month}`} variants={itemVariants} className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">{month}</h3>
                  <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                    {galleryData[year][month].map((img) => (
                      <GalleryItem key={img.id} image={img} onClick={() => setSelectedImage(img)} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ))
        )}
      </div>

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950 transition-colors">
            {/* Header */}
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-4 py-3 flex justify-between items-center bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-30 border-b border-gray-100 dark:border-gray-800">
              <button onClick={() => { triggerHaptic(); setSelectedImage(null); }} className="p-2 -ml-2 text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:hover:bg-gray-800 rounded-full transition-colors flex items-center gap-1">
                <ChevronLeft size={24} /> <span className="text-base font-medium">Back</span>
              </button>
              
              {/* JUMP TO ENTRY BUTTON */}
              <button 
                onClick={handleJumpToEntry}
                className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-xs font-bold transition-all"
              >
                <BookOpen size={14} /> Read Entry
              </button>
            </motion.div>

            {/* Image */}
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black/20 flex flex-col items-center justify-center p-4">
              <motion.div layoutId={`img-${selectedImage.id}`} className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="bg-black/5 dark:bg-black/50 relative aspect-auto min-h-[300px] flex items-center justify-center">
                  <LightboxImage src={selectedImage.src} />
                </div>

                {/* Info Footer */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-600)] dark:text-[var(--accent-400)] rounded-full">
                        <Calendar size={20} />
                        </div>
                        <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Date Captured</p>
                        <p className="text-gray-900 dark:text-white font-medium text-lg">{formatFullDate(selectedImage.date)}</p>
                        </div>
                    </div>
                    {selectedImage.mood && (() => {
                        const m = MOODS.find(x => x.value === selectedImage.mood);
                        if (!m) return null;
                        return (
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Mood</span>
                                <div className={`font-bold ${m.color} flex items-center gap-1`}><Smile size={16} /> {m.label}</div>
                            </div>
                        )
                    })()}
                  </div>
                  {selectedImage.location && (
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-50 dark:border-gray-800">
                      <div className="p-2.5 bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-600)] dark:text-[var(--accent-400)] rounded-full"><MapPin size={20} /></div>
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Location</p>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedImage.location}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MediaGallery;