import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Trash2,
  Plus,
  ChevronRight,
  MapPin,
  Cloud,
  Clock,
  Image as ImageIcon,
  X
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

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

// Simplified Toolbar for Mobile
const MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote'],
    ['clean']
  ],
};

const FORMATS = [
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'blockquote'
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

    /* --- QUILL OVERRIDES FOR MOBILE --- */
    .quill {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .ql-container {
      flex: 1;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 16px; /* Larger font for mobile readability */
      border: none !important;
    }
    .ql-toolbar {
      border: none !important;
      border-bottom: 1px solid #f3f4f6 !important;
      background: #f9fafb;
      border-radius: 12px 12px 0 0;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .ql-editor {
      padding: 16px;
      line-height: 1.6;
      color: #374151;
    }
    .ql-editor.ql-blank::before {
      font-style: normal;
      color: #9ca3af;
      font-size: 16px;
    }
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

  // State
  // Note: Content will now be HTML string, not Markdown
  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState(entry?.mood || 5);
  const [location, setLocation] = useState(entry?.location || '');
  const [weather, setWeather] = useState(entry?.weather || '');
  const [tags, setTags] = useState(entry?.tags || []);
  const [images, setImages] = useState(entry?.images || []);
  
  // UI State
  const [isMoodOpen, setIsMoodOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => { setImgIndex(0); }, [entry?.id]);

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

  const handleSave = () => {
    // Check if empty (Quill leaves <p><br></p> even when empty)
    if (content.replace(/<(.|\n)*?>/g, '').trim().length === 0 && images.length === 0) {
      alert('Please write something or add an image.');
      return;
    }
    onSave({
      id: entry?.id || Date.now().toString(),
      content, // This is now HTML
      mood, location, weather, tags, images,
      date: entry?.date || new Date().toISOString()
    });
  };

  const handleDelete = () => {
    if (entry?.id && window.confirm('Delete this entry?')) onDelete(entry.id);
    else if (!entry?.id) onClose();
  };

  const CurrentMoodIcon = MOODS.find(m => m.value === mood)?.icon || Cloud;
  const currentMoodColor = MOODS.find(m => m.value === mood)?.color || 'text-gray-500';

  return (
    <>
      <Styles />
      <div className="fixed inset-0 bg-white z-50 flex flex-col animate-slideUp overflow-hidden">
        
        {/* --- HEADER --- */}
        <div className="px-4 py-3 flex justify-between items-center bg-white/90 backdrop-blur-md z-30 border-b border-gray-100 absolute top-0 left-0 right-0">
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            {entry?.id && (
              <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={handleSave} className="px-4 py-1.5 bg-blue-500 text-white font-semibold rounded-full shadow-md shadow-blue-500/20 active:scale-95 transition-all text-sm">
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
              
              {/* Image Controls */}
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

          <div className="px-4 flex flex-col gap-4 flex-1">
            {/* Header Info */}
            <div className="pt-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {entryDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2 text-gray-400 text-xs mt-1 font-medium">
                <Clock size={12} />
                {entryDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
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

            {/* --- EDITOR COMPONENT (QUILL) --- */}
            {/* The container grows to fill remaining space */}
            <div className="flex-1 -mx-4 mt-2 border-t border-gray-100">
               <ReactQuill 
                ref={editorRef}
                theme="snow"
                value={content}
                onChange={setContent}
                modules={MODULES}
                formats={FORMATS}
                placeholder="Write your thoughts..."
              />
            </div>

          </div>
        </div>

        {/* Attachments Footer (Fixed at Bottom) */}
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