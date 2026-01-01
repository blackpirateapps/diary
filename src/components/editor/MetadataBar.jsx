import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Sun, Image as ImageIcon, CloudRain, Frown, Meh, Smile, Heart, ChevronDown, X, Clock } from 'lucide-react';
import MoodPopup from '../MoodPopup';

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
  weather, uploading, onImageUpload, 
  locationHistory = [], 
  isSidebar = false
}) => {
  const fileInputRef = useRef(null);
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  
  const CurrentMoodIcon = MOODS.find(m => m.value === mood)?.icon || Meh;
  const currentMoodColor = MOODS.find(m => m.value === mood)?.color || 'text-gray-500';

  const baseBtnClass = "flex items-center gap-2 rounded-lg text-sm font-medium transition-all group";
  const mobileClass = "pl-3 pr-4 py-1.5 rounded-full border shadow-sm border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900";
  const sidebarClass = "w-full p-2 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700";

  const handleLocationTap = () => {
    if (!isSidebar && locationHistory.length > 1) {
      setShowHistoryPopup(true);
    } else {
      onLocationClick();
    }
  };

  return (
    <div className={isSidebar ? "flex flex-col gap-1" : "flex flex-wrap gap-3 mb-8"}>
      
      {/* Mood Section */}
      <div className="relative">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsMoodOpen(!isMoodOpen)} 
          className={`${baseBtnClass} ${isSidebar ? sidebarClass : mobileClass} ${mood && !isSidebar ? '' : 'text-gray-500 dark:text-gray-400'}`}
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

      {/* Location Section */}
      <div className="flex flex-col gap-1">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleLocationTap}
          disabled={loadingLocation}
          className={`${baseBtnClass} ${isSidebar ? sidebarClass : mobileClass} ${location && !isSidebar ? 'text-[var(--accent-600)] dark:text-[var(--accent-400)]' : 'text-gray-500 dark:text-gray-400 hover:text-[var(--accent-500)]'}`}
        >
          <div className={`flex items-center justify-center ${isSidebar ? 'w-8 h-8 rounded-md bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-400' : ''}`}>
             {loadingLocation ? (
               <div className="w-4 h-4 border-2 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin" />
             ) : (
               <MapPin size={18} strokeWidth={2} />
             )}
          </div>
          <span className="truncate flex-1 text-left text-gray-700 dark:text-gray-300">
            {locationHistory.length > 1 
              ? `Check in (${locationHistory.length})` 
              : (location || 'Add Location')}
          </span>
          {!isSidebar && locationHistory.length > 1 && <ChevronDown size={14} className="text-gray-400 opacity-50" />}
        </motion.button>

        {/* Desktop Sidebar Inline Timeline */}
        {isSidebar && locationHistory && locationHistory.length > 0 && (
          <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-4 py-2">
            {locationHistory.map((entry, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-[var(--accent-500)] border-2 border-white dark:border-gray-900" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">
                    {entry.address}
                  </span>
                  {entry.weather && (
                    <span className="text-[10px] text-orange-500 dark:text-orange-400 mt-0.5 flex items-center gap-1">
                      <Sun size={10} /> {entry.weather}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile History Modal Popup */}
      <AnimatePresence>
        {showHistoryPopup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800"
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-950/50">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <MapPin size={18} className="text-[var(--accent-500)]"/> Location History
                </h3>
                <button onClick={() => setShowHistoryPopup(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6 ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
                  {locationHistory.map((entry, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[25px] top-1.5 w-3 h-3 rounded-full bg-[var(--accent-500)] border-2 border-white dark:border-gray-900" />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                          <Clock size={10} />
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">
                          {entry.address}
                        </div>
                        {entry.weather && (
                          <div className="text-xs text-orange-500 dark:text-orange-400 mt-1.5 flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/30 w-fit px-2 py-0.5 rounded-md">
                            <Sun size={12} /> {entry.weather}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
                <button 
                  onClick={onLocationClick}
                  className="w-full py-3 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-[var(--accent-500)]/20"
                >
                  Check in Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Weather Section */}
      {(weather || isSidebar) && !isSidebar && (
        <div className={`${baseBtnClass} ${isSidebar ? sidebarClass : mobileClass}`}>
           <div className={`flex items-center justify-center ${isSidebar ? 'w-8 h-8 rounded-md bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-orange-400' : 'text-orange-400'}`}>
              <Sun size={18} strokeWidth={2} />
           </div>
           <span className="text-gray-700 dark:text-gray-300">{weather || 'Weather unavailable'}</span>
        </div>
      )}

      {/* Add Photo Section */}
      <motion.label 
        whileTap={{ scale: 0.98 }}
        className={`${baseBtnClass} ${isSidebar ? sidebarClass : mobileClass} cursor-pointer hover:text-[var(--accent-500)]`}
      >
        <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} disabled={uploading} ref={fileInputRef} />
        <div className={`flex items-center justify-center ${isSidebar ? 'w-8 h-8 rounded-md bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-400' : ''}`}>
             {uploading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <ImageIcon size={18} strokeWidth={2} />}
        </div>
        <span className="text-gray-700 dark:text-gray-300">{uploading ? 'Compressing...' : 'Add Photo'}</span>
      </motion.label>
    </div>
  );
};

export default MetadataBar;