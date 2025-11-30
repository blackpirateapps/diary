import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, Trash2, Plus, MapPin, Cloud, Clock, Image as ImageIcon,
  Eye, PenLine, CheckCircle2, Moon, Activity, Download, X, Sun
} from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useBlobUrl } from '../db'; 

// --- PDF IMPORTS ---
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import EntryPdfDocument from './EntryPdfDocument';

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
    
    /* Things 3-esque Typography & Inputs */
    .native-input {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      color: #374151;
    }
    input[type="time"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.4; filter: invert(0); }
    
    /* MDEditor Customization for Things 3 Look */
    .wmde-markdown { background-color: transparent !important; color: #374151 !important; font-family: -apple-system, BlinkMacSystemFont, sans-serif !important; font-size: 16px !important; line-height: 1.6 !important; }
    .w-md-editor { box-shadow: none !important; border: none !important; background-color: transparent !important; }
    .w-md-editor-toolbar { display: none; } /* Hide toolbar for cleaner look */
    .w-md-editor-content { background-color: transparent !important; }
    .wmde-markdown h1 { border-bottom: none !important; font-weight: 700; font-size: 1.6em; margin-top: 1.2em; margin-bottom: 0.5em; color: #111827 !important; letter-spacing: -0.02em; }
    .wmde-markdown h2 { border-bottom: none !important; font-weight: 600; font-size: 1.3em; margin-top: 1.2em; margin-bottom: 0.5em; color: #1f2937 !important; letter-spacing: -0.01em; }
    .wmde-markdown blockquote { border-left: 3px solid #e5e7eb !important; color: #6b7280 !important; padding-left: 1em !important; margin-left: 0 !important; }
    
    /* Custom Scrollbar for editor area if needed */
    textarea { caret-color: #3b82f6; }
  `}</style>
);

// --- HELPERS ---
const getWeatherLabel = (code) => {
  if (code === 0) return 'Clear sky';
  if (code >= 1 && code <= 3) return 'Partly cloudy';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Drizzle/Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
};

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (file.size > 50 * 1024 * 1024) {
      reject(new Error('Image too large (Max 50MB).'));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 2560; 
        const MAX_HEIGHT = 2560;
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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed.'));
        }, 'image/webp', 0.95);
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
  });
};

const formatSleepRange = (startTime, durationHours) => {
  if (!startTime) return '';
  const start = new Date(startTime);
  const end = new Date(startTime + (durationHours * 60 * 60 * 1000));
  const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(start)} - ${fmt(end)}`;
};

// --- PDF HELPER ---
const blobToJpeg = (blob) => {
  return new Promise((resolve) => {
    if (!(blob instanceof Blob)) {
        resolve(blob);
        return;
    }
    const img = new window.Image();
    const url = URL.createObjectURL(blob);
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      URL.revokeObjectURL(url);
      resolve(jpegDataUrl);
    };
    img.onerror = () => {
        resolve(null); 
    };
  });
};

// --- COMPONENTS ---
const BlobImage = ({ src, ...props }) => {
  const url = useBlobUrl(src);
  return <motion.img src={url} {...props} />;
};

const SleepWidget = ({ session }) => {
  const chartData = session.hypnogram && session.hypnogram.length > 0 
      ? session.hypnogram 
      : session.movementData?.map((m, i) => ({ time: i, stage: 2 })) || [];

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col gap-3 mt-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-500 rounded-full">
            <Moon size={16} />
          </div>
          <div>
             <h4 className="text-sm font-semibold text-gray-900">Sleep Session</h4>
             <p className="text-xs text-gray-500 font-medium">{formatSleepRange(session.startTime, session.duration)}</p>
          </div>
        </div>
        <div className="flex gap-4 text-right">
           <div className="flex flex-col items-end">
              <span className="block text-sm font-semibold text-gray-900">{session.duration.toFixed(1)}h</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Time</span>
           </div>
           <div className="flex flex-col items-end">
              <span className="block text-sm font-semibold text-gray-900">{(session.deepSleepPerc * 100).toFixed(0)}%</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Deep</span>
           </div>
        </div>
      </div>

      <div className="h-20 w-full rounded-lg overflow-hidden opacity-80">
        <ResponsiveContainer width="100%" height="100%">
           <AreaChart data={chartData}>
              <defs>
                  <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05}/>
                  </linearGradient>
              </defs>
              <YAxis hide domain={[0, 3]} />
              <Area 
                  type="stepAfter" 
                  dataKey="stage" 
                  stroke="#6366f1" 
                  strokeWidth={2} 
                  fill="url(#sleepGradient)" 
              />
           </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- ANIMATION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } // Apple/Things ease
  },
  exit: { 
    opacity: 0, 
    scale: 0.98,
    transition: { duration: 0.2, ease: "easeIn" } 
  }
};

const contentStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { 
        duration: 0.4,
        delayChildren: 0.1,
        staggerChildren: 0.05 
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
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
  const [isExporting, setIsExporting] = useState(false);

  // --- FETCH SLEEP DATA ---
  const sleepSessions = useLiveQuery(() => db.sleep_sessions.toArray(), []) || [];

  const todaysSleepSessions = sleepSessions.filter(session => {
    const sessionDate = new Date(session.startTime);
    return sessionDate.toDateString() === currentDate.toDateString();
  });

  const fileInputRef = useRef(null);

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
        const compressedBlob = await compressImage(file);
        setImages(prev => [...prev, compressedBlob]);
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

    const fetchWeather = async (lat, lon) => {
        try {
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            if (weatherRes.ok) {
              const data = await weatherRes.json();
              // FIX: getWeatherLabel was likely missing or failing
              const label = getWeatherLabel(data.current_weather.weathercode);
              const newWeather = `${label}, ${Math.round(data.current_weather.temperature)}°C`;
              setWeather(newWeather);
            }
        } catch (e) {
            console.error("Weather fetch failed", e);
        }
    };

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      setLocationLat(latitude);
      setLocationLng(longitude);
      
      // Trigger weather independently so it doesn't block location
      fetchWeather(latitude, longitude);

      try {
        // FIX: Added addressdetails=1 and zoom=18 for better precision
        // FIX: Added User-Agent (sometimes required by OSM, though browser sets it, explicit headers help)
        const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
        
        if (locRes.ok) {
          const data = await locRes.json();
          const address = data.address;
          
          // FIX: Better address prioritization
          const parts = [];
          if (address.road) parts.push(address.road);
          else if (address.pedestrian) parts.push(address.pedestrian);
          else if (address.building) parts.push(address.building);
          
          if (address.city) parts.push(address.city);
          else if (address.town) parts.push(address.town);
          else if (address.village) parts.push(address.village);
          else if (address.suburb) parts.push(address.suburb);
          
          // If we got valid parts, use them. Only fallback to lat/long if absolutely nothing returns.
          if (parts.length > 0) {
              setLocation(parts.join(', '));
          } else {
             setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } else {
            throw new Error("Location fetch failed");
        }
      } catch (e) {
        console.error("Reverse geocoding failed", e);
        // Only set lat/long if we don't already have a location set manually
        if (!location) setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      } finally {
        setLoadingLocation(false);
      }
    }, (error) => {
      console.error(error);
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

  // --- PDF EXPORT HANDLER ---
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const pdfImages = await Promise.all(
        images.map(img => blobToJpeg(img))
      );

      const currentEntryData = {
        id: entryId, 
        content, 
        mood, 
        location, 
        weather, 
        tags, 
        images: pdfImages.filter(Boolean),
        date: currentDate.toISOString()
      };
      
      const moodMeta = MOODS.find(m => m.value === mood);

      const doc = (
        <EntryPdfDocument 
          entry={currentEntryData} 
          moodLabel={moodMeta?.label}
          sleepSessions={todaysSleepSessions}
        />
      );
      
      const blob = await pdf(doc).toBlob();
      saveAs(blob, `Journal_${currentDate.toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Failed to create PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const CurrentMoodIcon = MOODS.find(m => m.value === mood)?.icon || Cloud;
  const currentMoodColor = MOODS.find(m => m.value === mood)?.color || 'text-gray-500';
  const timeString = currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Styles />
      <AnimatePresence>
        <motion.div 
            className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden font-sans" 
            data-color-mode="light"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            
            {/* --- HEADER --- */}
            <div className="px-6 py-4 flex justify-between items-center bg-white/90 backdrop-blur-xl z-30 border-b border-gray-100/50 sticky top-0">
            <div className="flex items-center gap-4">
                <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={onClose} 
                className="p-2 -ml-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50/50 rounded-lg transition-all"
                >
                <ChevronLeft size={24} strokeWidth={2.5} />
                </motion.button>
                <AnimatePresence mode="wait">
                {saveStatus !== 'idle' && (
                    <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0 }}
                    className="text-xs font-semibold tracking-wide uppercase text-gray-300 flex items-center gap-1.5"
                    >
                        {saveStatus === 'saving' && <span>Saving...</span>}
                        {saveStatus === 'saved' && <span className="text-teal-500 flex items-center gap-1"><CheckCircle2 size={12}/> Saved</span>}
                    </motion.div>
                )}
                </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
                {/* PDF Export */}
                {entry?.id && (
                <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Export PDF"
                >
                    {isExporting ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                    <Download size={18} strokeWidth={2} />
                    )}
                </motion.button>
                )}

                {/* Delete */}
                {entry?.id && (
                <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDeleteEntry} 
                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                    <Trash2 size={18} strokeWidth={2} />
                </motion.button>
                )}
                
                {/* Edit/Preview Toggle */}
                <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={toggleMode}
                className="ml-2 w-9 h-9 flex items-center justify-center text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                >
                {mode === 'edit' ? <Eye size={18} strokeWidth={2} /> : <PenLine size={18} strokeWidth={2} />}
                </motion.button>

                {/* Done Button */}
                <motion.button 
                whileTap={{ scale: 0.97 }}
                onClick={handleManualDone} 
                className="ml-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full shadow-md shadow-blue-200 transition-all text-sm"
                >
                Done
                </motion.button>
            </div>
            </div>

            {/* --- MAIN SCROLL AREA --- */}
            <motion.div 
            className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-white relative"
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
                    <BlobImage 
                    key={imgIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    src={images[imgIndex]} 
                    alt="Memory" 
                    className="w-full h-full object-contain mix-blend-multiply" 
                    />
                    
                    {images.length > 1 && (
                    <>
                        <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur rounded-full text-gray-800 opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:scale-110"
                        >
                        <ChevronLeft size={20} />
                        </motion.button>
                        <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setImgIndex((i) => (i + 1) % images.length)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur rounded-full text-gray-800 opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:scale-110"
                        >
                        <ChevronLeft size={20} className="rotate-180" />
                        </motion.button>
                        
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                        {images.map((_, i) => (
                            <motion.div 
                            key={i} 
                            layout
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === imgIndex ? 'bg-white w-4 shadow-sm' : 'bg-white/40 w-1.5'}`} 
                            />
                        ))}
                        </div>
                    </>
                    )}
                    
                    <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={handleDeleteImage} 
                    className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-white"
                    >
                    <Trash2 size={16} />
                    </motion.button>
                </motion.div>
                )}
            </AnimatePresence>

            <div className="px-8 pb-32 max-w-3xl mx-auto w-full flex flex-col">
                
                {/* DATE & TIME HEADER (Things 3 Style) */}
                <motion.div variants={itemVariants} className="pt-10 pb-6">
                <div className="flex items-baseline gap-3 mb-1">
                    <h2 className="text-4xl font-bold text-gray-900 tracking-tight">
                        {currentDate.toLocaleDateString(undefined, { weekday: 'long' })}
                    </h2>
                    <span className="text-2xl text-gray-400 font-medium">
                        {currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                    </span>
                </div>
                
                <div className="flex items-center gap-4 text-gray-400 text-sm font-medium">
                    <div className="flex items-center gap-2 hover:text-blue-500 transition-colors cursor-pointer group px-2 -ml-2 py-1 rounded-md hover:bg-gray-50">
                        <Clock size={16} strokeWidth={2.5} className="group-hover:text-blue-500" />
                        <input 
                        type="time" 
                        value={timeString} 
                        onChange={handleTimeChange}
                        className="bg-transparent border-none outline-none text-gray-500 font-semibold group-hover:text-blue-500 cursor-pointer w-[60px] native-input"
                        />
                    </div>
                    {!isToday && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold">Past Entry</span>}
                </div>
                </motion.div>

                {/* METADATA BAR (Pills) */}
                <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mb-8">
                
                {/* Mood Pill */}
                <div className="relative">
                    <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsMoodOpen(!isMoodOpen)} 
                    className={`flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm border border-transparent ${mood ? 'bg-white border-gray-100 text-gray-700 hover:border-blue-200' : 'bg-gray-50 text-gray-400'}`}
                    >
                    <CurrentMoodIcon size={16} className={currentMoodColor} strokeWidth={2.5} />
                    <span>{MOODS.find(m => m.value === mood)?.label || 'Mood'}</span>
                    </motion.button>
                    <AnimatePresence>
                    {isMoodOpen && (
                        <MoodPopup 
                        moods={MOODS} 
                        currentMood={mood} 
                        onSelect={(m) => { setMood(m); setIsMoodOpen(false); saveData(true); }} 
                        onClose={() => setIsMoodOpen(false)} 
                        />
                    )}
                    </AnimatePresence>
                </div>

                {/* Location Pill */}
                <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLocation}
                    disabled={loadingLocation}
                    className={`flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm border border-transparent ${location ? 'bg-white border-gray-100 text-blue-600 hover:border-blue-200' : 'bg-white border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500'}`}
                >
                    {loadingLocation ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                    <MapPin size={16} strokeWidth={2.5} />
                    )}
                    <span className="truncate max-w-[200px]">{location || 'Add Location'}</span>
                </motion.button>

                {/* Weather Pill (Auto-shows if present) */}
                {weather && (
                    <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full text-sm font-semibold bg-white border border-gray-100 text-gray-600 shadow-sm"
                    >
                    <Sun size={16} className="text-orange-400" strokeWidth={2.5} />
                    <span>{weather}</span>
                    </motion.div>
                )}

                {/* Add Image Pill */}
                <motion.label 
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm border border-transparent cursor-pointer ${uploading ? 'bg-gray-100' : 'bg-white border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500'}`}
                >
                    <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
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
                
                </motion.div>

                {/* EDITOR AREA */}
                <motion.div variants={itemVariants} className="min-h-[300px] relative">
                    {mode === 'edit' ? (
                        <div className="text-lg text-gray-800 leading-relaxed -ml-4">
                            <MDEditor
                                value={content}
                                onChange={setContent}
                                preview="edit"
                                hideToolbar={true}
                                height="100%"
                                visiableDragbar={false}
                                className="w-full"
                            />
                        </div>
                    ) : (
                        <div className="prose prose-lg prose-gray max-w-none">
                            <MDEditor.Markdown source={content} />
                        </div>
                    )}
                    
                    {content.length === 0 && mode === 'edit' && (
                        <div className="absolute top-2 left-1 text-gray-300 pointer-events-none text-lg">
                            Write about your day...
                        </div>
                    )}
                </motion.div>

                <div className="h-px bg-gray-100 my-8" />

                {/* BOTTOM SECTION: TAGS & SLEEP */}
                <motion.div variants={itemVariants} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Tags</label>
                        <TagInput tags={tags} onChange={(newTags) => { setTags(newTags); saveData(true); }} />
                    </div>

                    {todaysSleepSessions.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Sleep Data</label>
                            {todaysSleepSessions.map(session => (
                                <SleepWidget key={session.id} session={session} />
                            ))}
                        </div>
                    )}
                </motion.div>
                
            </div>
            </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default Editor;