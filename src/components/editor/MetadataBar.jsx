import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Sun, Image as ImageIcon, CloudRain, Frown, Meh, Smile, Heart } from 'lucide-react';
import MoodPopup from '../MoodPopup';

// Keep icons consistent
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
  { value: 10, icon: Heart, color: 'text-red-500', label: 'Amazing' }
];

const MetadataBar = ({ 
  mood, setMood, isMoodOpen, setIsMoodOpen, onSave,
  location, onLocationClick, loadingLocation,
  weather, uploading, onImageUpload 
}) => {
  const fileInputRef = useRef(null);
  const CurrentMoodIcon = MOODS.find(m => m.value === mood)?.icon || Meh;
  const currentMoodColor = MOODS.find(m => m.value === mood)?.color || 'text-gray-500';

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {/* Mood Pill */}
      <div className="relative">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMoodOpen(!isMoodOpen)} 
          className={`flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm border border-transparent ${mood ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:border-[var(--accent-200)] dark:hover:border-[var(--accent-800)]' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}`}
        >
          <CurrentMoodIcon size={16} className={currentMoodColor} strokeWidth={2.5} />
          <span>{MOODS.find(m => m.value === mood)?.label || 'Mood'}</span>
        </motion.button>
        <AnimatePresence>
          {isMoodOpen && (
            <MoodPopup 
              currentMood={mood} 
              onChange={(val) => { 
                setMood(val); 
                setIsMoodOpen(false); 
                onSave(true); 
              }} 
              onClose={() => setIsMoodOpen(false)} 
            />
          )}
        </AnimatePresence>
      </div>

      {/* Location Pill */}
      <motion.button 
        whileTap={{ scale: 0.95 }}
        onClick={onLocationClick}
        disabled={loadingLocation}
        className={`flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm border border-transparent ${location ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-[var(--accent-600)] dark:text-[var(--accent-400)] hover:border-[var(--accent-200)]' : 'bg-white dark:bg-gray-900 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-[var(--accent-300)] hover:text-[var(--accent-500)]'}`}
      >
        {loadingLocation ? (
          <div className="w-4 h-4 border-2 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin" />
        ) : (
          <MapPin size={16} strokeWidth={2.5} />
        )}
        <span className="truncate max-w-[200px]">{location || 'Add Location'}</span>
      </motion.button>

      {/* Weather Pill */}
      {weather && (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full text-sm font-semibold bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 shadow-sm"
        >
          <Sun size={16} className="text-orange-400" strokeWidth={2.5} />
          <span>{weather}</span>
        </motion.div>
      )}

      {/* Add Image Pill */}
      <motion.label 
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm border border-transparent cursor-pointer ${uploading ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-[var(--accent-300)] hover:text-[var(--accent-500)]'}`}
      >
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={onImageUpload} 
          disabled={uploading}
          ref={fileInputRef}
        />
        {uploading ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <ImageIcon size={16} strokeWidth={2.5} />
        )}
        <span>{uploading ? 'Compressing...' : 'Add Photo'}</span>
      </motion.label>
    </div>
  );
};

export default MetadataBar;