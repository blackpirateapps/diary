import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useBlobUrl } from '../../db'; // Note the double dot ../../
import { MOODS } from './constants';

// --- HELPER: TEXT PREVIEW ---
export const getEntryPreview = (entry) => {
  if (entry.preview) return entry.preview;
  if (typeof entry.content === 'string' && entry.content.trim().startsWith('{')) {
    return "View entry to read content...";
  }
  return entry.content ? entry.content.replace(/<[^>]*>?/gm, ' ') : '';
};

// --- IMAGE COMPONENT ---
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

// --- LIST CARD ---
export const ListCard = React.memo(({ entry, onClick, variants }) => {
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

// --- GRID CARD ---
export const GridCard = React.memo(({ entry, onClick, variants }) => {
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