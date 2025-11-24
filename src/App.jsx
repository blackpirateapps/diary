import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Calendar, MapPin, Image as ImageIcon, 
  BarChart2, Grid, Home, X, Hash, 
  ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Save,
  Smile, Frown, Meh, Heart, Sun, CloudRain,
  Search, ChevronDown, Clock, Tag, CalendarPlus, 
  Download, Upload, Settings, AlertCircle, Cloud,
  WifiOff
} from 'lucide-react';

// --- Mock Data & Constants ---
const INITIAL_ENTRIES = [
  {
    id: '1',
    content: 'Found a new spot downtown. The light coming through the window was perfect. Spent an hour reading and sipping a cortado.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    mood: 8,
    location: 'Downtown, Seattle',
    weather: '18°C',
    tags: ['coffee', 'relaxing'],
    images: ['https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=400']
  },
  {
    id: '2',
    content: 'Heavy rain all day. Good day for coding and lo-fi beats.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    mood: 5,
    location: 'Home Office',
    weather: '12°C',
    tags: ['work', 'rain'],
    images: []
  },
  {
    id: '3',
    content: 'Beat my personal best time today! Felt exhausted but accomplished.',
    date: new Date().toISOString(),
    mood: 10,
    location: 'Central Park',
    weather: '24°C',
    tags: ['fitness', 'health'],
    images: ['https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=400', 'https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&q=80&w=400']
  }
];

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
  { value: 10, icon: Heart, color: 'text-red-500', label: 'Amazing' },
];

// --- Helper Functions ---

const MS_PER_DAY = 1000 * 60 * 60 * 24; 

// Compress image to avoid localStorage quota limits
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      reject(new Error('Image too large. Please choose a smaller image.'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
         
        try {
          const compressed = canvas.toDataURL('image/jpeg', 0.6); // Lower quality
          // Check if result is too large for localStorage
          if (compressed.length > 500000) { // ~500KB per image
            reject(new Error('Compressed image still too large. Try a smaller image.'));
          } else {
            resolve(compressed);
          }
        } catch (err) {
          reject(new Error('Failed to compress image.'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
  });
};

const calculateStreak = (entries) => {
  if (!entries.length) return 0;
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  const today = new Date().setHours(0,0,0,0);
   
  const lastEntryDate = new Date(sorted[0].date).setHours(0,0,0,0);
  const diffTime = today - lastEntryDate; 
  const diffDays = Math.floor(diffTime / MS_PER_DAY); 

  if (diffDays > 1) return 0;

  let streak = 1;
  let currentDate = lastEntryDate;

  for (let i = 1; i < sorted.length; i++) {
    const entryDate = new Date(sorted[i].date).setHours(0,0,0,0);
    if (entryDate === currentDate) continue; 
    
    const dayDiff = (currentDate - entryDate) / MS_PER_DAY;
    if (dayDiff >= 0.9 && dayDiff <= 1.1) { 
      streak++;
      currentDate = entryDate;
    } else {
      break;
    }
  }
  return streak;
};

const countWords = (str) => {
  return str.trim().length === 0 ? 0 : str.trim().split(/\s+/).length;
};

// --- Components ---

const LineGraph = ({ data, dataKey, color = "#3B82F6", height = 100 }) => {
  if (!data || data.length < 2) return <div className="h-24 flex items-center justify-center text-gray-400 text-xs">Not enough data</div>;

  const values = data.map(d => d[dataKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
   
  const points = values.map((val, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 80 - 10; 
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {values.map((val, i) => (
           <circle 
             key={i}
             cx={(i / (values.length - 1)) * 100}
             cy={100 - ((val - min) / range) * 80 - 10}
             r="1.5"
             fill="white"
             stroke={color}
             strokeWidth="1"
             vectorEffect="non-scaling-stroke"
           />
        ))}
      </svg>
    </div>
  );
};

const MoodPopup = ({ currentMood, onChange, onClose }) => {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-10 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 w-64 grid grid-cols-5 gap-2 animate-slideUp origin-top-left">
        {MOODS.map((m) => {
          const Icon = m.icon;
          const isSelected = currentMood === m.value;
          return (
            <button
              key={m.value}
              onClick={() => { onChange(m.value); onClose(); }}
              className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                isSelected ? 'bg-blue-50 ring-2 ring-blue-500/20' : 'hover:bg-gray-50'
              }`}
            >
              <Icon size={20} className={isSelected ? m.color : 'text-gray-400'} />
            </button>
          );
        })}
      </div>
    </>
  );
};

const TagInput = ({ tags, onAdd, onRemove }) => {
  const [input, setInput] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isInputVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputVisible]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput('');
      setIsInputVisible(false);
    }
    if (e.key === 'Escape') {
      setIsInputVisible(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
          #{tag}
          <button onClick={() => onRemove(tag)} className="ml-1 hover:text-blue-800"><X size={12} /></button>
        </span>
      ))}
       
      {isInputVisible ? (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if(!input) setIsInputVisible(false); }}
          placeholder="New tag..."
          className="w-24 px-2 py-1 bg-gray-50 border-none rounded-full text-xs focus:ring-2 focus:ring-blue-500/20 placeholder-gray-400"
        />
      ) : (
        <button 
          onClick={() => setIsInputVisible(true)}
          className="p-1 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
};

// --- Main Pages ---

const JournalList = ({ entries, onEdit, onCreate, onAddOld, onImport, onExport, isOffline, isImporting }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const importInputRef = useRef(null);

  // FIX #5: Sort filtered entries by date (newest first)
  const filteredEntries = entries
    .filter(entry => 
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.location && entry.location.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6 pb-24">
      <header className="px-6 pt-6 pb-2 sticky top-0 bg-[#F8F9FA]/90 backdrop-blur-md z-10">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
             <h1 className="text-3xl font-bold text-gray-900 tracking-tight truncate">BlackPirate's Journal</h1>
             <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                Capture your life.
                {isOffline && (
                  <span className="flex items-center gap-1 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                    <WifiOff size={10} /> Offline
                  </span>
                )}
             </p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-shrink-0">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-500 shadow-sm'}`}
            >
              <Search size={20} />
            </button>
            
            <button 
              onClick={onAddOld}
              className="p-2 bg-white text-gray-500 shadow-sm rounded-full hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Add Past Entry"
            >
              <CalendarPlus size={20} />
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 bg-white text-gray-500 shadow-sm rounded-full hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Settings size={20} />
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-32 z-30 flex flex-col gap-1 animate-slideUp">
                    <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg w-full text-left">
                      <Download size={14} /> Export
                    </button>
                    <button onClick={() => { importInputRef.current.click(); setIsMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg w-full text-left">
                      <Upload size={14} /> Import
                    </button>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={onCreate}
              className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-full shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center gap-1 text-sm ml-1"
            >
              <Plus size={16} /> New
            </button>
          </div>
        </div>
        
        {/* Hidden File Input for Import */}
        <input ref={importInputRef} type="file" className="hidden" accept=".json" onChange={onImport} />
         
        {isSearchOpen && (
          <div className="mt-4 animate-slideUp">
            <input 
              type="text" 
              placeholder="Search memories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-none shadow-sm rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
          </div>
        )}
      </header>
      
      {/* Import Loading Overlay */}
      {isImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex items-center gap-4 animate-slideUp">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium text-gray-700">Importing memories...</span>
            </div>
        </div>
      )}

      <div className="px-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>{searchTerm ? 'No matching entries.' : 'No entries yet. Tap + to start.'}</p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const dateObj = new Date(entry.date);
            const mainDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            const yearTime = dateObj.toLocaleDateString(undefined, { year: 'numeric' }) + ' • ' + dateObj.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'});

            return (
              <div 
                key={entry.id} 
                onClick={() => onEdit(entry)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform duration-200 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                     <span className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{mainDate}</span>
                     <span className="text-xs text-gray-400 font-medium">{yearTime}</span>
                  </div>
                  {entry.mood && (
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 ${MOODS.find(m => m.value === entry.mood)?.color || 'text-gray-500'}`}>
                       {React.createElement(MOODS.find(m => m.value === entry.mood)?.icon || Meh, { size: 18 })}
                     </div>
                  )}
                </div>
                 
                <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mt-2 font-serif">{entry.content}</p>
                 
                {(entry.tags.length > 0 || entry.location) && (
                  <div className="mt-3 flex items-center gap-3 overflow-hidden text-gray-400">
                    {entry.location && (
                      <div className="flex items-center text-xs bg-gray-50 px-2 py-1 rounded-md">
                        <MapPin size={12} className="mr-1" />
                        <span className="truncate max-w-[100px]">{entry.location}</span>
                      </div>
                    )}
                    {entry.weather && (
                       <div className="flex items-center text-xs bg-gray-50 px-2 py-1 rounded-md">
                        <Cloud size={12} className="mr-1" />
                        <span>{entry.weather}</span>
                      </div>
                    )}
                    {entry.tags.length > 0 && (
                      <div className="flex items-center text-xs">
                        <Hash size={12} className="mr-1" />
                        <span className="truncate">{entry.tags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {entry.images && entry.images.length > 0 && (
                  <div className="mt-3 h-24 w-full rounded-xl overflow-hidden relative">
                     <img src={entry.images[0]} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="Cover" />
                     {entry.images.length > 1 && (
                       <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                         +{entry.images.length - 1}
                       </div>
                     )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const StatsPage = ({ entries }) => {
  const [filter, setFilter] = useState('all'); 

  const now = new Date();
  const filteredEntries = entries.filter(e => {
    const d = new Date(e.date);
    if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (filter === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalEntries = filteredEntries.length;
  const streak = calculateStreak(entries); 
   
  const totalWords = filteredEntries.reduce((acc, curr) => acc + countWords(curr.content), 0);
  const avgWords = totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0;
  const maxWords = filteredEntries.reduce((max, curr) => Math.max(max, countWords(curr.content)), 0);

  const graphData = filteredEntries.map(e => ({
    date: e.date,
    mood: e.mood || 5,
    words: countWords(e.content)
  }));

  return (
    <div className="space-y-6 pb-24 px-6 pt-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Insights</h1>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {['all', 'year', 'month'].map(f => (
             <button 
               key={f}
               onClick={() => setFilter(f)}
               className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${filter === f ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
             >
               {f}
             </button>
          ))}
        </div>
      </div>
       
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-3xl shadow-lg shadow-blue-500/20">
          <p className="text-blue-100 text-sm font-medium mb-1 flex items-center gap-1"><Calendar size={14}/> Days Journaled</p>
          <p className="text-3xl font-bold">{totalEntries}</p>
          <p className="text-xs text-blue-100 mt-2 opacity-80">in selected period</p>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 text-white p-5 rounded-3xl shadow-lg shadow-orange-500/20">
          <p className="text-orange-100 text-sm font-medium mb-1 flex items-center gap-1"><Sun size={14}/> Current Streak</p>
          <p className="text-3xl font-bold">{streak} <span className="text-lg font-normal">days</span></p>
           <p className="text-xs text-orange-100 mt-2 opacity-80">Keep it up!</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm text-center">
          <p className="text-xs text-gray-400 font-medium uppercase mb-1">Total Words</p>
          <p className="text-xl font-bold text-gray-900">{totalWords}</p>
        </div>
        <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm text-center">
          <p className="text-xs text-gray-400 font-medium uppercase mb-1">Avg Words</p>
          <p className="text-xl font-bold text-gray-900">{avgWords}</p>
        </div>
        <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm text-center">
          <p className="text-xs text-gray-400 font-medium uppercase mb-1">Most Words</p>
          <p className="text-xl font-bold text-gray-900">{maxWords}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm">
          <BarChart2 size={16} className="text-blue-500"/> Mood Flow
        </h3>
        <LineGraph data={graphData} dataKey="mood" color="#3B82F6" height={120} />
      </div>

      <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm">
          <Hash size={16} className="text-purple-500"/> Writing Volume
        </h3>
        <LineGraph data={graphData} dataKey="words" color="#A855F7" height={120} />
      </div>
    </div>
  );
};

const MediaGallery = ({ entries }) => {
  const allImages = entries.reduce((acc, entry) => {
    return [...acc, ...entry.images.map(img => ({ src: img, entryId: entry.id }))];
  }, []);

  return (
    <div className="space-y-6 pb-24 px-6 pt-6">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Media</h1>
      {allImages.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-20 text-gray-400">
           <ImageIcon size={48} className="mb-4 opacity-50" />
           <p>No photos added yet.</p>
         </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {allImages.map((img, idx) => (
            <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative group">
              <img src={img.src} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Editor Modal ---

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
  const textareaRef = useRef(null); // Ref for the textarea

  useEffect(() => {
    setImgIndex(0);
  }, [entry?.id]);

  // Auto-resize logic
  // Auto-resize logic with scroll position preservation
useEffect(() => {
  if (textareaRef.current) {
    const currentScrollPos = textareaRef.current.scrollTop; // Save scroll position
    textareaRef.current.style.height = 'auto'; // Reset height to recalculate
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    textareaRef.current.scrollTop = currentScrollPos; // Restore scroll position
  }
}, [content]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      try {
        const compressedBase64 = await compressImage(file);
        setImages(prev => [...prev, compressedBase64]);
        setImgIndex(images.length); 
      } catch (err) {
        alert(err.message || "Failed to process image.");
        console.error(err);
      } finally {
        setUploading(false);
        // FIX #10: Reset file input to allow same file upload
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleLocation = () => {
    if (!navigator.onLine) {
        const manual = prompt("You are offline. Please enter location manually:");
        if(manual) setLocation(manual);
        return;
    }

    if (!navigator.geolocation) {
      const manual = prompt("Geolocation is not supported by your browser. Please enter location manually:");
      if(manual) setLocation(manual);
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // 1. Get Weather (Open-Meteo)
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const weatherData = await weatherRes.json();
          const temp = weatherData.current_weather?.temperature;
          if (temp !== undefined) {
            setWeather(`${temp}°C`);
          }

          // 2. Get Location Name (BigDataCloud - Free, No Key)
          const locRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const locData = await locRes.json();
          
          const city = locData.city || locData.locality || locData.principalSubdivision;
          const country = locData.countryName;
          
          if (city) {
            setLocation(country ? `${city}, ${country}` : city);
          } else {
             setLocation("Unknown Location");
          }

        } catch (error) {
          console.error("Error fetching data", error);
          const manual = prompt("Could not fetch location details automatically. Please enter manually:");
          if(manual) setLocation(manual);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        console.error("Geo error", error);
        let msg = "Unable to access location.";
        if (error.code === 1) msg = "Location permission denied.";
        const manual = prompt(`${msg} Please enter manually:`);
        if(manual) setLocation(manual);
        setLoadingLocation(false);
      }
    );
  };

  const handleSave = () => {
    // FIX #7: Validate content before saving
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
    // FIX #6: Check if entry has ID before attempting delete
    if (!entry?.id) {
      // If no ID, this is a new unsaved entry, just close
      onClose();
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this entry completely?')) {
      onDelete(entry.id);
    }
  };

  const nextImage = () => {
    setImgIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const deleteCurrentImage = () => {
    if(window.confirm('Delete this image?')) {
      const newImages = images.filter((_, i) => i !== imgIndex);
      setImages(newImages);
       
      // FIX #7: Properly handle index after deletion
      if (newImages.length === 0) {
        setImgIndex(0);
      } else if (imgIndex >= newImages.length) {
        setImgIndex(Math.max(0, newImages.length - 1));
      }
    }
  };

  const CurrentMoodIcon = MOODS.find(m => m.value === mood)?.icon || Meh;
  const currentMoodColor = MOODS.find(m => m.value === mood)?.color || 'text-gray-500';

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-slideUp overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center bg-white/80 backdrop-blur-md absolute top-0 left-0 right-0 z-20 border-b border-gray-100/50">
        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          {entry && entry.id && (
            <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-500 text-white font-semibold rounded-full shadow-md shadow-blue-500/20 active:scale-95 transition-all text-sm"
          >
            Done
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-16">
        
        {/* Carousel / Cover Image */}
        {images.length > 0 && (
          <div className="w-full h-72 relative group bg-gray-100 mb-4">
            <img 
              src={images[imgIndex]} 
              alt="Memory" 
              className="w-full h-full object-contain bg-gray-50/50 backdrop-blur-sm" 
            />
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <img src={images[imgIndex]} className="w-full h-full object-cover blur-xl opacity-50" alt="" />
            </div>
            
            {images.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={prevImage} className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={nextImage} className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={deleteCurrentImage}
                  className="bg-black/30 hover:bg-red-500/80 text-white p-1.5 rounded-full backdrop-blur-md transition-colors"
                >
                  <Trash2 size={14} />
                </button>
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-3' : 'bg-white/50'}`} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-6 pb-12">
          <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">
              {entryDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-1 font-medium">
               <Clock size={14} />
               {entryDate.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}
               <span>•</span>
               <span>{entryDate.getFullYear()}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
             <div className="relative">
                <button 
                  onClick={() => setIsMoodOpen(!isMoodOpen)}
                  className={`flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mood ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  <CurrentMoodIcon size={14} className={currentMoodColor} />
                  <span>{MOODS.find(m => m.value === mood)?.label || 'Mood'}</span>
                </button>
                {isMoodOpen && (
                  <MoodPopup 
                    currentMood={mood} 
                    onChange={setMood} 
                    onClose={() => setIsMoodOpen(false)} 
                  />
                )}
             </div>

             <div className="flex items-center bg-gray-50 rounded-full pl-2 pr-1 py-0.5 border border-gray-100 max-w-[160px]">
                <MapPin size={12} className="text-gray-400 mr-1 flex-shrink-0" />
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                  className="bg-transparent border-none p-0 text-xs text-gray-600 placeholder-gray-400 focus:ring-0 w-full truncate"
                />
                <button onClick={handleLocation} disabled={loadingLocation} className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-50">
                   {loadingLocation ? <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/> : <Plus size={10} />}
                </button>
             </div>

             {weather && (
               <div className="flex items-center bg-orange-50 text-orange-600 rounded-full px-2 py-0.5 border border-orange-100 text-xs">
                  <Cloud size={12} className="mr-1"/>
                  {weather}
               </div>
             )}

             <TagInput tags={tags} onAdd={(t) => setTags([...tags, t])} onRemove={(t) => setTags(tags.filter(tag => tag !== t))} />
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            className="w-full min-h-[300px] resize-none text-lg text-gray-800 placeholder-gray-300 border-none p-0 focus:ring-0 outline-none focus:outline-none leading-7 font-serif bg-transparent scroll-padding-bottom scroll-pb-20 overflow-hidden"
          />

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center text-gray-400">
             <span className="text-xs uppercase tracking-wider font-medium">Attachments</span>
             <div className="flex gap-2">
               <button 
                 onClick={() => fileInputRef.current.click()}
                 disabled={uploading}
                 className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm transition-colors disabled:opacity-50"
               >
                 {uploading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/> : <ImageIcon size={18} />}
                 <span className="text-xs">{uploading ? 'Processing...' : 'Add Image'}</span>
               </button>
             </div>
          </div>
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept="image/*" 
             onChange={handleImageUpload} 
           />

        </div>
      </div>
    </div>
  );
};

// --- App Container ---

const App = () => {
  const [activeTab, setActiveTab] = useState('journal');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isImporting, setIsImporting] = useState(false); // Add isImporting state to App

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem('journal_entries');
      return saved ? JSON.parse(saved) : INITIAL_ENTRIES;
    } catch (e) {
      return INITIAL_ENTRIES;
    }
  });

  const dateInputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('journal_entries', JSON.stringify(entries));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert('Storage full! Please delete some entries or images to save new data.');
      }
    }
  }, [entries]);

  const handleSaveEntry = (entry) => {
    if (entries.some(e => e.id === entry.id)) {
      setEntries(entries.map(e => e.id === entry.id ? entry : e));
    } else {
      setEntries([entry, ...entries]);
    }
    setIsEditorOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = (id) => {
    if (!id) {
      setIsEditorOpen(false);
      setEditingEntry(null);
      return;
    }
    setEntries(entries.filter(e => e.id !== id));
    setIsEditorOpen(false);
    setEditingEntry(null);
  };

  const openNewEditor = (date = new Date()) => {
    const dateStr = date.toDateString();
    const existing = entries.find(e => new Date(e.date).toDateString() === dateStr);

    if (existing) {
      setEditingEntry(existing);
    } else {
      setEditingEntry({ date: date.toISOString() });
    }
    setIsEditorOpen(true);
  };

  const openEditEditor = (entry) => {
    setEditingEntry(entry);
    setIsEditorOpen(true);
  };

  const handleAddOldEntry = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker();
    }
  };

  const handleDateSelect = (e) => {
    if (e.target.value) {
      // FIX #8: Simplified date handling - browser handles timezone correctly
      const selectedDate = new Date(e.target.value + 'T12:00:00');
      openNewEditor(selectedDate);
    }
    e.target.value = ''; 
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
     
    // FIX #8: Revoke URL to prevent memory leak
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true); // Start loading

    const reader = new FileReader();
    reader.onload = (event) => {
      // Small timeout to allow UI to render loading state
      setTimeout(() => {
          try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
               if (confirm(`Import ${imported.length} entries? This will replace current data.`)) {
                 setEntries(imported);
               }
            } else {
              alert('Invalid file format.');
            }
          } catch (err) {
            alert('Error parsing JSON.');
          } finally {
            setIsImporting(false); // Stop loading
            e.target.value = ''; // Reset file input
          }
      }, 100);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-md mx-auto min-h-screen relative bg-white shadow-2xl overflow-hidden flex flex-col">
        
        <input 
          type="date" 
          ref={dateInputRef} 
          className="absolute top-0 left-0 opacity-0 pointer-events-none" 
          onChange={handleDateSelect}
        />

        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {activeTab === 'journal' && (
            <JournalList 
              entries={entries} 
              onEdit={openEditEditor} 
              onCreate={() => openNewEditor()}
              onAddOld={handleAddOldEntry}
              onExport={handleExport}
              onImport={handleImport}
              isOffline={isOffline}
              isImporting={isImporting} // Pass isImporting to JournalList
            />
          )}
          {activeTab === 'stats' && <StatsPage entries={entries} />}
          {activeTab === 'media' && <MediaGallery entries={entries} />}
        </main>

        {!isEditorOpen && activeTab === 'journal' && (
          <div className="absolute bottom-24 right-6 z-30">
            <button 
              onClick={() => openNewEditor()}
              className="w-14 h-14 bg-blue-500 rounded-full text-white shadow-lg shadow-blue-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 group"
            >
              <Plus size={28} className="group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        )}

        <nav className="border-t border-gray-100 bg-white/90 backdrop-blur-lg fixed bottom-0 w-full max-w-md z-20 pb-safe">
          <div className="flex justify-around items-center h-16">
            <button 
              onClick={() => setActiveTab('journal')}
              className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'journal' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Home size={24} strokeWidth={activeTab === 'journal' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Journal</span>
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'stats' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <BarChart2 size={24} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Stats</span>
            </button>
            <button 
              onClick={() => setActiveTab('media')}
              className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'media' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid size={24} strokeWidth={activeTab === 'media' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Media</span>
            </button>
          </div>
        </nav>

        {isEditorOpen && (
          <Editor 
            entry={editingEntry} 
            onClose={() => { setIsEditorOpen(false); setEditingEntry(null); }} 
            onSave={handleSaveEntry}
            onDelete={handleDeleteEntry}
          />
        )}

      </div>
       
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
};

export default App;