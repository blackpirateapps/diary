import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Trash2,
  Plus,
  ChevronRight,
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
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-slideUp {
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* --- THINGS 3 AESTHETIC OVERRIDES --- */
    
    /* 1. Typography: Use System Fonts (San Francisco/Segoe UI) instead of Monospace */
    .w-md-editor-text-pre, 
    .w-md-editor-text-input, 
    .w-md-editor-text {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      font-size: 17px !important; 
      line-height: 1.6 !important;
      color: #374151 !important; /* Gray-700 */
    }

    /* 2. Editor Container: Clean, no heavy borders */
    .w-md-editor {
      background-color: transparent !important;
      box-shadow: none !important;
      border: none !important;
      color: #374151 !important;
    }
    
    /* 3. Hide the default markdown toolbar (we built our own minimal one) */
    .w-md-editor-toolbar {
      display: none !important;
    }
    
    /* 4. Preview Area Styling */
    .wmde-markdown {
      background-color: transparent !important;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      font-size: 17px !important;
      color: #374151 !important;
    }
    
    /* Markdown Element Styling for Preview */
    .wmde-markdown h1 { border-bottom: none !important; font-weight: 800; font-size: 1.8em; margin-top: 1em; }
    .wmde-markdown h2 { border-bottom: none !important; font-weight: 700; font-size: 1.5em; margin-top: 1em; }
    .wmde-markdown p { margin-bottom: 1em; }
    .wmde-markdown ul { list-style-type: disc !important; padding-left: 1.5em !important; }
    .wmde-markdown ol { list-style-type: decimal !important; padding-left: 1.5em !important; }
    .wmde-markdown blockquote { border-left: 4px solid #e5e7eb !important; color: #6b7280 !important; }
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

// --- MAIN COMPONENT ---
const Editor = ({ entry, onClose, onSave, onDelete }) => {
  const entryDate = entry?.date ? new Date(entry.date) : new Date();
  
  // Logic: Is this entry from "Today"?
  const isToday = new Date().toDateString() === entryDate.toDateString();

  // State
  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState(entry?.mood || 5);
  const [location, setLocation] = useState(entry?.location || '');
  const [weather, setWeather] = useState(entry?.weather || '');
  const [tags, setTags] = useState(entry?.tags || []);
  const [images, setImages] = useState(entry?.images || []);
  
  // Mode State: If not today, default to Preview
  const [mode, setMode] = useState(isToday ? 'edit' : 'preview');
  
  const [isMoodOpen, setIsMoodOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved'

  const fileInputRef = useRef(null);

  useEffect(() => { setImgIndex(0); }, [entry?.id]);

  // --- AUTO SAVE LOGIC ---
  // We use useCallback to create a stable function for the effect
  const saveData = useCallback((isAutoSave = false) => {
    // Don't save empty entries on auto-save
    if (isAutoSave && !content.trim() && images.length === 0) return;

    setSaveStatus('saving');
    
    onSave({
      id: entry?.id || Date.now().toString(),
      content,
      mood, location, weather, tags, images,
      date: entry?.date || new Date().toISOString()
    });

    // Show "Saved" tick briefly
    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [entry?.id, entry?.date, content, mood, location, weather, tags, images, onSave]);

  // Trigger Auto-Save when data changes (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveData(true);
    }, 2000); // Wait 2 seconds after last change

    return () => clearTimeout(timer);
  }, [content, mood, location, weather, tags, images, saveData]);

  // Handlers
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const compressedBase64 = await compressImage(file);
        setImages(prev => [...prev, compressedBase64]);
        setImgIndex(images.length);
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
      try {
        const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        if (locRes.ok) {
          const data = await locRes.json();
          const city = data.address.city || data.address.town || data.address.village;
          setLocation([city, data.address.country].filter(Boolean).join(', '));
        }
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        if (weatherRes.ok) {
          const data = await weatherRes.json();
          setWeather(`${getWeatherLabel(data.current_weather.weathercode)} ${Math.round(data.current_weather.temperature)}°C`);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingLocation(false);
      }
    }, () => {
      alert("Unable to retrieve location");
      setLoadingLocation(false);
    });
  };

  const handleManualSave = () => {
    saveData(false);
    onClose(); // Close on manual "Done"
  };

  const handleDelete = () => {
    if (entry?.id && window.confirm('Delete this entry?')) onDelete(entry.id);
    else if (!entry?.id) onClose();
  };

  const toggleMode = () => {
    setMode(prev => prev === 'edit' ? 'preview' : 'edit');
  };

  const CurrentMoodIcon = MOODS.find(m => m.value === mood)?.icon || Cloud;
  const currentMoodColor = MOODS.find(m => m.value === mood)?.color || 'text-gray-500';

  return (
    <>
      <Styles />
      <div className="fixed inset-0 bg-white z-50 flex flex-col animate-slideUp overflow-hidden" data-color-mode="light">
        
        {/* --- HEADER --- */}
        <div className="px-4 py-3 flex justify-between items-center bg-white/90 backdrop-blur-md z-30 border-b border-gray-100 absolute top-0 left-0 right-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <ChevronLeft size={24} />
            </button>
            {/* Auto-Save Indicator */}
            <div className="text-xs font-medium text-gray-400 flex items-center gap-1 transition-opacity duration-300">
               {saveStatus === 'saving' && <span>Saving...</span>}
               {saveStatus === 'saved' && <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> Saved</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {entry?.id && (
              <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                <Trash2 size={20} />
              </button>
            )}
            
            {/* PREVIEW BUTTON */}
            <button 
              onClick={toggleMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-xs font-medium"
            >
              {mode === 'edit' ? <Eye size={14} /> : <PenLine size={14} />}
              <span>{mode === 'edit' ? 'Preview' : 'Editor'}</span>
            </button>

            <button onClick={handleManualSave} className="px-4 py-1.5 bg-blue-500 text-white font-semibold rounded-full shadow-md shadow-blue-500/20 active:scale-95 transition-all text-sm">
              Done
            </button>
          </div>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto no-scrollbar pt-16 pb-0 flex flex-col">
          
          {/* IMAGE CAROUSEL */}
          {images.length > 0 && (
            <div className="w-full h-64 relative group bg-gray-100 flex-shrink-0">
              <img src={images[imgIndex]} alt="Memory" className="w-full h-full object-contain" />
              <div className="absolute inset-0 -z-10">
                <img src={images[imgIndex]} className="w-full h-full object-cover blur-xl opacity-50" alt="" />
              </div>
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/30 backdrop-blur rounded-full text-white"><ChevronLeft size={20} /></button>
                  <button onClick={() => setImgIndex((i) => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/30 backdrop-blur rounded-full text-white"><ChevronRight size={20} /></button>
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                    {images.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIndex ? 'bg-white' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
              <button onClick={() => {
                 setImages(imgs => imgs.filter((_, i) => i !== imgIndex));
                 setImgIndex(0);
              }} className="absolute top-2 right-2 p-1.5 bg-black/30 text-white rounded-full"><Trash2 size={14} /></button>
            </div>
          )}

          <div className="px-4 flex flex-col gap-4 flex-1 pb-20">
            {/* Header Info */}
            <div className="pt-4">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {entryDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2 text-gray-400 text-xs mt-1 font-medium">
                <Clock size={12} />
                {entryDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                {!isToday && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">Past Entry</span>}
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <button onClick={() => setIsMoodOpen(!isMoodOpen)} className={`flex items-center gap-1 pl-2 pr-3 py-1 rounded-full text-xs font-medium border ${mood ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  <CurrentMoodIcon size={12} className={currentMoodColor} />
                  <span>{MOODS.find(m => m.value === mood)?.label || 'Mood'}</span>
                </button>
                {isMoodOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsMoodOpen(false)} />
                    <MoodPopup currentMood={mood} onChange={setMood} onClose={() => setIsMoodOpen(false)} />
                  </>
                )}
              </div>

              <div className="flex items-center bg-gray-50 rounded-full pl-2 pr-1 py-0.5 border border-gray-200">
                <MapPin size={12} className="text-gray-400 mr-1" />
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="bg-transparent text-xs w-24 outline-none text-gray-600 placeholder-gray-400" />
                <button onClick={handleLocation} disabled={loadingLocation} className="p-1 text-blue-500">
                  {loadingLocation ? <div className="w-2 h-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <Plus size={10} />}
                </button>
              </div>

              {weather && (
                <div className="flex items-center bg-orange-50 text-orange-600 rounded-full px-2 py-0.5 border border-orange-100 text-xs">
                  <Cloud size={12} className="mr-1" />
                  {weather}
                </div>
              )}
              
              <TagInput tags={tags} onAdd={t => setTags([...tags, t])} onRemove={t => setTags(tags.filter(tag => tag !== t))} />
            </div>

            {/* --- EDITOR vs PREVIEW --- */}
            <div className="flex-1 w-full mt-2">
              <MDEditor
                value={content}
                onChange={setContent}
                preview={mode} // 'edit' shows textarea, 'preview' shows rendered HTML
                height="100%"
                visibleDragbar={false}
                hideToolbar={true} // Hidden via CSS, but this prop ensures internal state matches
                enableScroll={false}
                textareaProps={{
                  placeholder: isToday ? "What's on your mind today?" : "Entry for this day..."
                }}
              />
            </div>

          </div>
        </div>

        {/* Attachments Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white flex justify-between items-center text-gray-400 z-20 safe-area-bottom">
          <span className="text-xs font-bold uppercase tracking-wider">Attachments</span>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm transition-colors">
            {uploading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <ImageIcon size={16} />}
            <span className="text-xs">{uploading ? 'Uploading...' : 'Add Image'}</span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

      </div>
    </>
  );
};

export default Editor;