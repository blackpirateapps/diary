import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Sun, Image as ImageIcon, CloudRain, Frown, Meh, Smile, Heart, ChevronDown } from 'lucide-react';
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
  weather, uploading, onImageUpload, isSidebar = false
}) => {
  const fileInputRef = useRef(null);
  const CurrentMoodIcon = MOODS.find(m => m.value === mood)?.icon || Meh;
  const currentMoodColor = MOODS.find(m => m.value === mood)?.color || 'text-gray-500';

  // Common button styles
  const baseBtnClass = "flex items-center gap-2 rounded-lg text-sm font-medium transition-all group";
  const mobileClass = "pl-3 pr-4 py-1.5 rounded-full border shadow-sm";
  const sidebarClass = "w-full p-2 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700";

  return (
    <div className={isSidebar ? "flex flex-col gap-1" : "flex flex-wrap gap-3 mb-8"}>
      
      {/* Mood */}
      <div className="relative">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsMoodOpen(!isMoodOpen)} 
          className={`${baseBtnClass} ${isSidebar ? sidebarClass : mobileClass} ${mood && !isSidebar ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800' : 'bg-transparent text-gray-500 dark:text-gray-400 border-transparent'}`}
        >
          <div className={`flex items-center justify-center ${isSidebar ? 'w-8 h-8 rounded-md bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700' : ''}`}>
             <CurrentMoodIcon size={18} className={currentMoodColor} strokeWidth={2.5} />
          </div>
          <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
             {MOODS.find(m => m.value === mood)?.label || 'Set Mood'}
          </span>
          {isSidebar && <ChevronDown size={14} className="text-gray-400"/>}
        </motion.button>
        <AnimatePresence>
          {isMoodOpen && (
            <MoodPopup 
              currentMood={mood} 
              onChange={(val) => { setMood(val); setIsMoodOpen(false); onSave(true); }} 
              onClose={() => setIsMoodOpen(false)} 
            />
          )}
        </AnimatePresence>
      </div>

      {/* Location */}
      <motion.button 
        whileTap={{ scale: 0.98 }}
        onClick={onLocationClick}
        disabled={loadingLocation}
        className={`${baseBtnClass} ${isSidebar ? sidebarClass : mobileClass} ${location && !isSidebar ? 'bg-white border-gray-100 text-[var(--accent-600)]' : 'text-gray-500 hover:text-[var(--accent-500)]'}`}
      >
        <div className={`flex items-center justify-center ${isSidebar ? 'w-8 h-8 rounded-md bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-400' : ''}`}>
           {loadingLocation ? (
             <div className="w-4 h-4 border-2 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin" />
           ) : (
             <MapPin size={18} strokeWidth={2} />
           )}
        </div>
        <span className="truncate flex-1 text-left text-gray-700 dark:text-gray-300">{location || 'Add Location'}</span>
      </motion.button>

      {/* Weather */}
      {(weather || isSidebar) && (
        <div className={`${baseBtnClass} ${isSidebar ? sidebarClass : mobileClass} ${!isSidebar ? 'bg-white border-gray-100' : ''}`}>
           <div className={`flex items-center justify-center ${isSidebar ? 'w-8 h-8 rounded-md bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-orange-400' : 'text-orange-400'}`}>
              <Sun size={18} strokeWidth={2} />
           </div>
           <span className="text-gray-700 dark:text-gray-300">{weather || 'Weather unavailable'}</span>
        </div>
      )}

      {/* Add Image */}
      <motion.label 
        whileTap={{ scale: 0.98 }}
        className={`${baseBtnClass} ${isSidebar ? sidebarClass : mobileClass} cursor-pointer hover:text-[var(--accent-500)]`}
      >
        <input 
          type="file" accept="image/*" className="hidden" 
          onChange={onImageUpload} disabled={uploading} ref={fileInputRef}
        />
        <div className={`flex items-center justify-center ${isSidebar ? 'w-8 h-8 rounded-md bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-400' : ''}`}>
             {uploading ? (
               <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
             ) : (
               <ImageIcon size={18} strokeWidth={2} />
             )}
        </div>
        <span className="text-gray-700 dark:text-gray-300">{uploading ? 'Compressing...' : 'Add Photo'}</span>
      </motion.label>
    </div>
  );
};

export default MetadataBar;