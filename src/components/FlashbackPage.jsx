import React, { useMemo } from 'react';
import { 
  ChevronLeft, Calendar, History, Sparkles, 
  ArrowRight, Smile, Frown, Meh, Heart, Sun, CloudRain 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useBlobUrl } from '../db';

// Enhanced Moods with colors compatible with Dark Mode
const MOODS = [
  { value: 1, icon: CloudRain, color: 'text-slate-400' },
  { value: 2, icon: CloudRain, color: 'text-blue-400' },
  { value: 3, icon: Frown, color: 'text-blue-500' },
  { value: 4, icon: Meh, color: 'text-indigo-400' },
  { value: 5, icon: Meh, color: 'text-indigo-500' },
  { value: 6, icon: Sun, color: 'text-yellow-500' },
  { value: 7, icon: Sun, color: 'text-orange-500' },
  { value: 8, icon: Smile, color: 'text-orange-600' },
  { value: 9, icon: Heart, color: 'text-pink-500' },
  { value: 10, icon: Heart, color: 'text-red-500' },
];

const FlashbackImage = ({ src }) => {
  const url = useBlobUrl(src);
  if (!url) return <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse" />;
  return (
    <motion.img 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      src={url} 
      alt="Memory" 
      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
    />
  );
};

const FlashbackCard = ({ entry, label, subLabel, onClick }) => {
  const moodMeta = MOODS.find(m => m.value === entry.mood);
  const MoodIcon = moodMeta?.icon || Sun;
  const coverImage = entry.images && entry.images.length > 0 ? entry.images[0] : null;

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(entry)}
      className="group bg-white dark:bg-gray-900 rounded-[2rem] p-5 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none hover:border-[var(--accent-200)] cursor-pointer flex gap-5"
    >
      {coverImage ? (
        <div className="w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-inner bg-gray-50 dark:bg-gray-800">
          <FlashbackImage src={coverImage} />
        </div>
      ) : (
        <div className="w-24 h-24 flex-shrink-0 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-700">
          <History size={32} strokeWidth={1.5} />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-start mb-1">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-600)] dark:text-[var(--accent-400)]">{label}</span>
            <h4 className="text-gray-900 dark:text-gray-100 font-black text-xl leading-tight truncate">{subLabel}</h4>
          </div>
          {moodMeta && (
            <div className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 ${moodMeta.color}`}>
               <MoodIcon size={18} strokeWidth={2.5} />
            </div>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 leading-relaxed font-medium" 
           dangerouslySetInnerHTML={{ __html: entry.content.replace(/<[^>]*>?/gm, ' ') }} />
      </div>
    </motion.div>
  );
};

const FlashbackPage = ({ entries, onBack, onEdit }) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  const onThisDayEntries = useMemo(() => {
    return entries.filter(e => {
      const d = new Date(e.date);
      return d.getDate() === currentDate && d.getMonth() === currentMonth && d.getFullYear() !== currentYear;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries]);

  const onThisWeekEntries = useMemo(() => {
    return entries.filter(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === currentYear) return false;
      const isSameMonth = d.getMonth() === currentMonth;
      const isCloseDate = Math.abs(d.getDate() - currentDate) <= 3 && Math.abs(d.getDate() - currentDate) > 0;
      return isSameMonth && isCloseDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries]);

  const onThisMonthEntries = useMemo(() => {
    const shownIds = new Set([...onThisDayEntries, ...onThisWeekEntries].map(e => e.id));
    return entries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() !== currentYear && !shownIds.has(e.id);
    }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  }, [entries, onThisDayEntries, onThisWeekEntries]);

  // Framer Motion Variants
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-950 pb-24 transition-colors">
      <header className="px-6 py-6 sticky top-0 bg-[#F3F4F6]/80 dark:bg-gray-950/80 backdrop-blur-xl z-30 border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack} 
            className="p-2.5 bg-white dark:bg-gray-900 rounded-2xl text-gray-600 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Flashback</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mt-1">
              {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}
            </p>
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-orange-500 shadow-sm">
          <Sparkles size={20} fill="currentColor" className="opacity-20" />
        </div>
      </header>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-3xl mx-auto px-6 space-y-12 mt-8"
      >
        {/* SECTION 1: ON THIS DAY */}
        <motion.section variants={item}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Calendar size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-black tracking-tight dark:text-gray-100">On This Day</h2>
            </div>
            {onThisDayEntries.length > 0 && <span className="px-3 py-1 bg-white dark:bg-gray-900 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-100 dark:border-gray-800 shadow-sm">{onThisDayEntries.length} found</span>}
          </div>
          
          {onThisDayEntries.length > 0 ? (
            <div className="space-y-4">
              {onThisDayEntries.map(entry => {
                const yearDiff = currentYear - new Date(entry.date).getFullYear();
                return (
                  <FlashbackCard 
                    key={entry.id} 
                    entry={entry} 
                    label={`${yearDiff} Year${yearDiff > 1 ? 's' : ''} Ago`} 
                    subLabel={new Date(entry.date).getFullYear().toString()}
                    onClick={onEdit}
                  />
                );
              })}
            </div>
          ) : (
            <div className="bg-white/40 dark:bg-gray-900/40 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] p-10 text-center">
              <History size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-gray-400 dark:text-gray-500 font-bold tracking-tight">Quiet day in your history...</p>
            </div>
          )}
        </motion.section>

        {/* SECTION 2: THIS WEEK */}
        {onThisWeekEntries.length > 0 && (
          <motion.section variants={item}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <History size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-black tracking-tight dark:text-gray-100">This Week in History</h2>
            </div>
            <div className="space-y-4">
              {onThisWeekEntries.map(entry => {
                 const d = new Date(entry.date);
                 return (
                  <FlashbackCard 
                    key={entry.id} 
                    entry={entry} 
                    label={d.toLocaleDateString(undefined, { weekday: 'long' })}
                    subLabel={`${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })} ${d.getFullYear()}`}
                    onClick={onEdit}
                  />
                 );
              })}
            </div>
          </motion.section>
        )}

        {/* SECTION 3: THIS MONTH */}
        {onThisMonthEntries.length > 0 && (
          <motion.section variants={item}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Smile size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-black tracking-tight dark:text-gray-100">More from {today.toLocaleDateString(undefined, { month: 'long' })}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {onThisMonthEntries.map(entry => (
                <motion.div 
                  key={entry.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onEdit(entry)}
                  className="bg-white dark:bg-gray-900 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all cursor-pointer hover:border-[var(--accent-200)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black tracking-widest text-[var(--accent-600)] uppercase">
                      {new Date(entry.date).getFullYear()}
                    </span>
                    <ArrowRight size={14} className="text-gray-300 dark:text-gray-700" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed font-medium italic">
                    {entry.content.replace(/<[^>]*>?/gm, ' ')}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </motion.div>
    </div>
  );
};

export default FlashbackPage;