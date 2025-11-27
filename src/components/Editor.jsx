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
import MDEditor from '@uiw/react-md-editor'; // The new library
import MoodPopup from './MoodPopup';
import TagInput from './TagInput';

// --- STYLES ---
// Custom overrides to match your app's clean aesthetic
const Styles = () => (
  <style>{`
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-slideUp {
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    /* Hide scrollbar for clean look */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    
    /* Override Editor Styles to fit the theme */
    .w-md-editor {
      border: 1px solid #f3f4f6 !important;
      box-shadow: none !important;
      border-radius: 12px !important;
      background-color: transparent !important;
    }
    .w-md-editor-toolbar {
      background-color: #f9fafb !important;
      border-bottom: 1px solid #f3f4f6 !important;
      border-radius: 12px 12px 0 0 !important;
    }
    .w-md-editor-content {
      background-color: transparent !important;
    }
    /* Ensure text area font matches app */
    .w-md-editor-text-pre, .w-md-editor-text-input {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
      line-height: 1.6 !important;
      font-size: 14px !important;
    }
  `}</style>
);

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
      reject(new Error('Image too large. Please choose a smaller image.'));
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
        try {
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          resolve(compressed);
        } catch {
          reject(new Error('Failed to compress image.'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
  });
};

// --- MAIN COMPONENT ---
const Editor = ({ entry, onClose, onSave, onDelete }) => {
  const entryDate = entry?.date ? new Date(entry.date) : new Date();

  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState(entry?.mood || 5);
  const [location, setLocation] = useState(entry?.location || '');
  const [weather, setWeather] = useState(entry?.weather || '');
  const [tags, setTags] = useState(entry?.tags || []);
  const [images, setImages] = useState(entry?.images || []);
  const [isMoodOpen, setIsMoodOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setImgIndex(0);
  }, [entry?.id]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const compressedBase64 = await compressImage(file);
        setImages((prev) => [...prev, compressedBase64]);
        setImgIndex(images.length);
      } catch (err) {
        alert(err.message || 'Failed to process image.');
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
      alert("Geolocation is not supported by your browser");
      setLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // 1. Address
          const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (locRes.ok) {
            const locData = await locRes.json();
            const address = locData.address;
            const city = address.city || address.town || address.village || address.suburb;
            const country = address.country;
            setLocation([city, country].filter(Boolean).join(', ') || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          } else {
             setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
          // 2. Weather
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          if (weatherRes.ok) {
            const weatherData = await weatherRes.json();
            setWeather(`${getWeatherLabel(weatherData.current_weather.weathercode)} ${Math.round(weatherData.current_weather.temperature)}°C`);
          }
        } catch (error) {
          console.error("Failed to fetch location/weather", error);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        alert("Unable to retrieve location.");
        setLoadingLocation(false);
      }
    );
  };

  const handleSave = () => {
    if (!content.trim()) {
      alert('Please write something before saving.');
      return;
    }
    onSave({
      id: entry?.id || Date.now().toString(),
      content,
      mood,
      location,
      weather,
      tags,
      images,
      date: entry?.date || new Date().toISOString()
    });
  };

  const handleDelete = () => {
    if (!entry?.id) { onClose(); return; }
    if (window.confirm('Are you sure you want to delete this entry completely?')) {
      onDelete(entry.id);
    }
  };

  const nextImage = () => images.length > 0 && setImgIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => images.length > 0 && setImgIndex((prev) => (prev - 1 + images.length) % images.length);
  const deleteCurrentImage = () => {
    if (window.confirm('Delete this image?')) {
      const newImages = images.filter((_, i) => i !== imgIndex);
      setImages(newImages);
      setImgIndex(newImages.length > 0 ? Math.min(imgIndex, newImages.length - 1) : 0);
    }
  };

  const CurrentMoodIcon = MOODS.find((m) => m.value === mood)?.icon || Cloud;
  const currentMoodColor = MOODS.find((m) => m.value === mood)?.color || 'text-gray-500';

  return (
    <>
      <Styles />
      <div className="fixed inset-0 bg-white z-50 flex flex-col animate-slideUp overflow-hidden" data-color-mode="light" style={{ height: '100dvh' }}>
        
        {/* --- TOP HEADER --- */}
        <div className="px-4 py-3 flex justify-between items-center bg-white/80 backdrop-blur-md absolute top-0 left-0 right-0 z-20 border-b border-gray-100/50">
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            {entry?.id && (
              <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={handleSave} className="px-4 py-1.5 bg-blue-500 text-white font-semibold rounded-full shadow-md shadow-blue-500/20 active:scale-95 transition-all text-sm">
              Done
            </button>
          </div>
        </div>

        {/* --- MAIN CONTENT SCROLL AREA --- */}
        <div className="flex-1 overflow-y-auto no-scrollbar pt-16 flex flex-col">
          
          {/* IMAGE CAROUSEL */}
          {images.length > 0 && (
            <div className="w-full h-72 relative group bg-gray-100 mb-4 flex-shrink-0">
              <img src={images[imgIndex]} alt="Memory" className="w-full h-full object-contain bg-gray-50/50 backdrop-blur-sm" />
              <div className="absolute inset-0 -z-10 overflow-hidden">
                <img src={images[imgIndex]} className="w-full h-full object-cover blur-xl opacity-50" alt="" />
              </div>
              {images.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={prevImage} className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-colors"><ChevronLeft size={20} /></button>
                  <button onClick={nextImage} className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-colors"><ChevronRight size={20} /></button>
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={deleteCurrentImage} className="bg-black/30 hover:bg-red-500/80 text-white p-1.5 rounded-full backdrop-blur-md transition-colors"><Trash2 size={14} /></button>
              </div>
              {images.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-3' : 'bg-white/50'}`} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="px-6 flex-1 flex flex-col pb-6">
            
            {/* DATE & TIME */}
            <div className="mb-6">
              <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">
                {entryDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-1 font-medium">
                <Clock size={14} />
                {entryDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                <span>•</span>
                <span>{entryDate.getFullYear()}</span>
              </div>
            </div>

            {/* METADATA BAR (Mood, Loc, Tags) */}
            <div className="flex flex-wrap gap-3 mb-6 relative z-10">
              <div className="relative">
                <button onClick={() => setIsMoodOpen(!isMoodOpen)} className={`flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mood ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  <CurrentMoodIcon size={14} className={currentMoodColor} />
                  <span>{MOODS.find(m => m.value === mood)?.label || 'Mood'}</span>
                </button>
                {isMoodOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsMoodOpen(false)} />
                    <MoodPopup currentMood={mood} onChange={setMood} onClose={() => setIsMoodOpen(false)} />
                  </>
                )}
              </div>

              <div className="flex items-center bg-gray-50 rounded-full pl-2 pr-1 py-0.5 border border-gray-100 max-w-[200px]">
                <MapPin size={12} className="text-gray-400 mr-1 flex-shrink-0" />
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="bg-transparent border-none p-0 text-xs text-gray-600 placeholder-gray-400 focus:ring-0 w-full truncate" />
                <button onClick={handleLocation} disabled={loadingLocation} className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-50 flex-shrink-0">
                  {loadingLocation ? (<div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />) : (<Plus size={10} />)}
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

            {/* --- EDITOR LIBRARY --- */}
            <div className="flex-1 min-h-[400px]">
              <MDEditor
                value={content}
                onChange={setContent}
                preview="edit"
                height="100%"
                visibleDragbar={false}
                hideToolbar={false}
                enableScroll={true}
              />
            </div>

            {/* ATTACHMENTS BAR */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-gray-400">
              <span className="text-xs uppercase tracking-wider font-medium">Attachments</span>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm transition-colors disabled:opacity-50">
                {uploading ? (<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />) : (<ImageIcon size={18} />)}
                <span className="text-xs">{uploading ? 'Processing...' : 'Add Image'}</span>
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            
          </div>
        </div>
      </div>
    </>
  );
};

export default Editor;