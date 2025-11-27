import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Trash2,
  Plus,
  MapPin,
  Cloud,
  Clock,
  Image as ImageIcon,
  Eye,
  PenLine,
  CheckCircle2
} from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { motion, AnimatePresence } from 'framer-motion';

import MoodPopup from './MoodPopup';
import TagInput from './TagInput';

// --- CONFIGURATION ---
const MOODS = [
  { value: 1, icon: Cloud, color: 'text-gray-400', label: 'Awful' },
  { value: 2, icon: Cloud, color: 'text-blue-400', label: 'Bad' },
  { value: 3, icon: Cloud, color: 'text-blue-500', label: 'Sad' },
  { value: 4, icon: Cloud, color: 'text-indigo-400', label: 'Meh' },
  { value: 5, icon: Cloud, color: 'text-indigo-500', label: 'Okay' },
  { value: 6, icon: Cloud, color: 'text-yellow-500', label: 'Good' },
  { value: 7, icon: Cloud, color: 'text-orange-500', label: 'Great' },
  { value: 8, icon: Cloud, color: 'text-orange-600', label: 'Happy' },
  { value: 9, icon: Cloud, color: 'text-pink-500', label: 'Loved' },
  { value: 10, icon: Cloud, color: 'text-red-500', label: 'Amazing' }
];

// --- STYLES ---
const Styles = () => (
  <style>{`
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* NATIVE INPUTS & TYPOGRAPHY */
    .native-input {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 17px;
      line-height: 1.5;
      color: #374151;
    }
    
    /* TIME INPUT STYLING */
    input[type="time"]::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.6;
      filter: invert(0.5);
    }

    /* MARKDOWN PREVIEW STYLING */
    .wmde-markdown {
      background-color: transparent !important;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      font-size: 17px !important;
      color: #374151 !important;
    }
    .wmde-markdown h1 { border-bottom: none !important; font-weight: 800; font-size: 1.8em; margin-top: 1em; color: #111827 !important; }
    .wmde-markdown h2 { border-bottom: none !important; font-weight: 700; font-size: 1.5em; margin-top: 1em; color: #1f2937 !important; }
    .wmde-markdown p { margin-bottom: 0.8em; }
    .wmde-markdown ul { list-style-type: disc !important; padding-left: 1.5em !important; margin-bottom: 1em !important; }
    .wmde-markdown ol { list-style-type: decimal !important; padding-left: 1.5em !important; margin-bottom: 1em !important; }
    .wmde-markdown blockquote { border-left: 4px solid #e5e7eb !important; color: #6b7280 !important; padding-left: 1em !important; margin: 1em 0 !important; }
    .wmde-markdown a { color: #2563eb !important; text-decoration: none !important; }
  `}</style>
);

// --- HELPERS ---
const getWeatherLabel = (code) => {
  const codes = {
    0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
    61: 'Rain', 63: 'Rain', 65: 'Heavy Rain', 71: 'Snow', 73: 'Snow', 75: 'Heavy Snow',
    77: 'Snow Grains', 80: 'Rain Showers', 81: 'Rain Showers', 82: 'Rain Showers',
    85: 'Snow Showers', 86: 'Snow Showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
  };
  return codes[code] || 'Unknown';
};

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('Image too large.'));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
  });
};

// --- UPDATED ANIMATION VARIANTS (Simple Fade) ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: 0.2, ease: "easeOut" } // Simple fade, very fast
  },
  exit: { 
    opacity: 0, 
    transition: { duration: 0.15, ease: "easeIn" } 
  }
};

const contentStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { 
        duration: 0.3,
        delayChildren: 0.05, // Reduced delay for snappiness
        staggerChildren: 0.05 
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 5 }, // Reduced movement range
  visible: { opacity: 1, y: 0 }
};

// --- MAIN COMPONENT ---
const Editor = ({ entry, onClose, onSave, onDelete }) => {
  const [entryId] = useState(entry?.id || Date.now().toString());
  const [currentDate, setCurrentDate] = useState(entry?.date ? new Date(entry.date) : new Date());
  const isToday = currentDate.toDateString() === new Date().toDateString();

  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState(entry?.mood || 5);
  const [location, setLocation] = useState(entry?.location || '');
  const [locationLat, setLocationLat] = useState(entry?.locationLat || null);
  const [locationLng, setLocationLng] = useState(entry?.locationLng || null);

  const [weather, setWeather] = useState(entry?.weather || '');
  const [tags, setTags] = useState(entry?.tags || []);
  const [images, setImages] = useState(entry?.images || []);
  
  const [mode, setMode] = useState(isToday ? 'edit' : 'preview');
  
  const [isMoodOpen, setIsMoodOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (mode === 'edit' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content, mode]);

  const saveData = useCallback((isAutoSave = false, overrideDate = null) => {
    if (isAutoSave && !content.trim() && images.length === 0) return;
    setSaveStatus('saving');
    const dateToSave = overrideDate || currentDate;

    onSave({
      id: entryId, 
      content,
      mood, 
      location, 
      locationLat, 
      locationLng, 
      weather, 
      tags, 
      images,
      date: dateToSave.toISOString()
    });

    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 2500);
  }, [entryId, currentDate, content, mood, location, locationLat, locationLng, weather, tags, images, onSave]);

  useEffect(() => {
    if (content !== (entry?.content || '')) {
      const timer = setTimeout(() => saveData(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [content, saveData, entry?.content]);

  const handleTimeChange = (e) => {
    const timeValue = e.target.value;
    if (!timeValue) return;
    const [hours, minutes] = timeValue.split(':').map(Number);
    const newDate = new Date(currentDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setCurrentDate(newDate);
    saveData(true, newDate);
  };

  const handleDeleteImage = () => {
    if (window.confirm('Are you sure you want to remove this image?')) {
      setImages(imgs => imgs.filter((_, i) => i !== imgIndex));
      setImgIndex(0);
      saveData(true);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const compressedBase64 = await compressImage(file);
        setImages(prev => [...prev, compressedBase64]);
        setImgIndex(images.length);
        saveData(true);
      } catch (err) {
        alert(err.message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleLocation = async () => {
    if (loadingLocation) return;
    setLoadingLocation(true);
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      setLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      setLocationLat(latitude);
      setLocationLng(longitude);
      try {
        const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        if (locRes.ok) {
          const data = await locRes.json();
          const address = data.address;
          const street = address.road || address.pedestrian || address.building || '';
          const city = address.city || address.town || address.village || address.suburb || address.hamlet;
          const country = address.country;
          const newLoc = [street, city, country].filter(Boolean).join(', ');
          setLocation(newLoc);
        }
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        if (weatherRes.ok) {
          const data = await weatherRes.json();
          const newWeather = `${getWeatherLabel(data.current_weather.weathercode)} ${Math.round(data.current_weather.temperature)}°C`;
          setWeather(newWeather);
        }
      } catch (e) {
        console.error(e);
        if (!location) setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      } finally {
        setLoadingLocation(false);
      }
    }, () => {
      alert("Unable to retrieve location");
      setLoadingLocation(false);
    });
  };

  const handleManualDone = () => {
    saveData(false);
    onClose(); 
  };

  const handleDeleteEntry = () => {
    if (entry?.id && window.confirm('Delete this entry?')) onDelete(entry.id);
    else if (!entry?.id) onClose();
  };

  const toggleMode = () => setMode(prev => prev === 'edit' ? 'preview' : 'edit');

  const CurrentMoodIcon = MOODS.find(m => m.value === mood)?.icon || Cloud;
  const currentMoodColor = MOODS.find(m => m.value === mood)?.color || 'text-gray-500';
  const timeString = currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Styles />
      <motion.div 
        className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden" 
        data-color-mode="light"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        
        {/* --- HEADER --- */}
        <div className="px-4 py-3 flex justify-between items-center bg-white/95 backdrop-blur-xl z-30 border-b border-gray-100 absolute top-0 left-0 right-0 h-16">
          <div className="flex items-center gap-3">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={onClose} 
              className="p-2 -ml-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={24} />
              <span className="text-base font-medium">Back</span>
            </motion.button>
            <AnimatePresence mode="wait">
              {saveStatus !== 'idle' && (
                 <motion.div 
                   initial={{ opacity: 0, x: -10 }} 
                   animate={{ opacity: 1, x: 0 }} 
                   exit={{ opacity: 0 }}
                   className="text-xs font-medium text-gray-400 flex items-center gap-1"
                 >
                    {saveStatus === 'saving' && <span>Saving...</span>}
                    {saveStatus === 'saved' && <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> Saved</span>}
                 </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            {entry?.id && (
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleDeleteEntry} 
                className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 size={20} />
              </motion.button>
            )}
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={toggleMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-xs font-medium"
            >
              {mode === 'edit' ? <Eye size={14} /> : <PenLine size={14} />}
              <span>{mode === 'edit' ? 'Preview' : 'Edit'}</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleManualDone} 
              className="px-5 py-1.5 bg-blue-500 text-white font-semibold rounded-full shadow-lg shadow-blue-500/30 transition-all text-sm"
            >
              Done
            </motion.button>
          </div>
        </div>

        {/* --- MAIN SCROLL AREA --- */}
        <motion.div 
          className="flex-1 overflow-y-auto no-scrollbar pt-16 flex flex-col bg-white"
          variants={contentStagger}
        >
          
          {/* IMAGE CAROUSEL */}
          <AnimatePresence>
            {images.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "18rem" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full relative group bg-gray-50 flex-shrink-0"
              >
                <motion.img 
                  key={imgIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  src={images[imgIndex]} 
                  alt="Memory" 
                  className="w-full h-full object-contain" 
                />
                
                <div className="absolute inset-0 -z-10">
                   {/* Blur Background */}
                  <img src={images[imgIndex]} className="w-full h-full object-cover blur-2xl opacity-30" alt="" />
                </div>
                
                {/* Navigation Controls */}
                {images.length > 1 && (
                  <>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 shadow-lg"
                    >
                      <ChevronLeft size={24} />
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setImgIndex((i) => (i + 1) % images.length)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 shadow-lg"
                    >
                      <ChevronLeft size={24} className="rotate-180" />
                    </motion.button>
                    
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                      {images.map((_, i) => (
                        <motion.div 
                          key={i} 
                          layout
                          className={`h-1.5 rounded-full shadow-sm ${i === imgIndex ? 'bg-white w-3' : 'bg-white/50 w-1.5'}`} 
                        />
                      ))}
                    </div>
                  </>
                )}
                
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDeleteImage} 
                  className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 shadow-lg"
                >
                  <Trash2 size={16} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-6 flex flex-col gap-6 flex-1 pb-32 max-w-2xl mx-auto w-full">
            {/* Header Info */}
            <motion.div variants={itemVariants} className="pt-8 border-b border-gray-100 pb-6">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                {currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              <div className="flex items-center gap-3 text-gray-400 text-sm mt-2 font-medium">
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer group">
                    <Clock size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <input 
                      type="time" 
                      value={timeString} 
                      onChange={handleTimeChange}
                      className="bg-transparent border-none outline-none text-gray-500 font-medium text-xs font-mono cursor-pointer w-[60px]"
                    />
                </div>
                
                {!isToday && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wide font-bold">Past Entry</span>}
              </div>
            </motion.div>

            {/* Metadata Bar */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
              <div className="relative">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMoodOpen(!isMoodOpen)} 
                  className={`flex items-center gap-1.5 pl-3 pr-4 py-1.5 rounded-full text-sm font-medium transition-colors ${mood ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  <CurrentMoodIcon size={16} className={currentMoodColor} />
                  <span>{MOODS.find(m => m.value === mood)?.label || 'Mood'}</span>
                </motion.button>
                
                <AnimatePresence>
                  {isMoodOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsMoodOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className="absolute z-30 top-full mt-2"
                      >
                         <MoodPopup currentMood={mood} onChange={(m) => { setMood(m); saveData(true); }} onClose={() => setIsMoodOpen(false)} />
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center bg-gray-50 rounded-full pl-3 pr-2 py-1.5 hover:bg-gray-100 transition-colors">
                <MapPin size={14} className="text-gray-400 mr-2" />
                <input 
                    type="text" 
                    value={location} 
                    onChange={e => setLocation(e.target.value)} 
                    placeholder="Add Location" 
                    className="bg-transparent text-sm w-full min-w-[120px] outline-none text-gray-600 placeholder-gray-400 native-input truncate" 
                />
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLocation} 
                  disabled={loadingLocation} 
                  className="p-1 text-blue-500 hover:bg-blue-100 rounded-full transition-colors ml-1"
                >
                  {loadingLocation ? <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <Plus size={14} />}
                </motion.button>
              </div>

              {weather && (
                <div className="flex items-center bg-orange-50 text-orange-600 rounded-full px-3 py-1.5 text-sm font-medium">
                  <Cloud size={14} className="mr-2" />
                  {weather}
                </div>
              )}
              
              <TagInput tags={tags} onAdd={t => { setTags([...tags, t]); saveData(true); }} onRemove={t => { setTags(tags.filter(tag => tag !== t)); saveData(true); }} />
            </motion.div>
            
            {/* --- EDITOR AREA --- */}
            <motion.div variants={itemVariants} className="min-h-[200px] flex flex-col gap-4">
              {mode === 'edit' ? (
                <>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your thoughts..."
                    className="w-full resize-none outline-none text-lg text-gray-700 placeholder-gray-300 native-input bg-transparent leading-relaxed"
                    style={{ minHeight: '150px' }}
                  />
                  
                  {/* Image Upload Button */}
                  <div className="flex gap-4 border-t border-gray-100 pt-4 mt-auto">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                      ref={fileInputRef}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors text-sm font-medium"
                    >
                      <ImageIcon size={18} />
                      {uploading ? 'Compressing...' : 'Add Photo'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="prose prose-gray max-w-none">
                  <MDEditor.Markdown source={content || '*No content yet...*'} className="wmde-markdown" />
                </div>
              )}
            </motion.div>

          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default Editor;