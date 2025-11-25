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
  Eye,
  Code,
  X,
  PenTool,
  Type
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import MoodPopup from './MoodPopup';
import TagInput from './TagInput';

// --- MARKDOWN CONFIGURATION ---
marked.use({
  gfm: true,
  breaks: true
});

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
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    /* Mobile keyboard handling */
    .editor-textarea:focus {
      scroll-margin-top: 20px;
      scroll-margin-bottom: 20px;
    }

    /* --- MARKDOWN PREVIEW TYPOGRAPHY --- */
    .prose { color: #374151; line-height: 1.6; }
    .prose h1 { font-size: 2em; font-weight: 800; margin-top: 1em; margin-bottom: 0.6em; line-height: 1.2; color: #111827; }
    .prose h2 { font-size: 1.5em; font-weight: 700; margin-top: 1.2em; margin-bottom: 0.6em; line-height: 1.3; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
    .prose h3 { font-size: 1.25em; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; line-height: 1.4; color: #374151; }
    .prose h4 { font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; }
    .prose p { margin-bottom: 1em; }
    .prose ul { list-style-type: disc; padding-left: 1.6em; margin-bottom: 1em; }
    .prose ol { list-style-type: decimal; padding-left: 1.6em; margin-bottom: 1em; }
    .prose li { margin-bottom: 0.3em; }
    .prose li p { margin: 0; }
    .prose strong, .prose b { font-weight: 700; color: #111827; }
    .prose em, .prose i { font-style: italic; }
    .prose u { text-decoration: underline; text-underline-offset: 2px; }
    .prose blockquote { border-left: 4px solid #e5e7eb; padding-left: 1em; color: #4b5563; font-style: italic; margin: 1.5em 0; background: #f9fafb; padding: 0.5em 1em; border-radius: 0 0.375em 0.375em 0; }
    .prose a { color: #2563eb; text-decoration: underline; font-weight: 500; cursor: pointer; }
    .prose pre { background-color: #1f2937; color: #e5e7eb; padding: 1em; border-radius: 0.5em; overflow-x: auto; margin: 1em 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.9em; }
    .prose code { background-color: #f3f4f6; padding: 0.2em 0.4em; border-radius: 0.25em; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85em; color: #be185d; }
    .prose pre code { background-color: transparent; padding: 0; color: inherit; font-size: inherit; }
    .prose img { max-width: 100%; height: auto; border-radius: 0.5em; margin: 1.5em 0; border: 1px solid #e5e7eb; }
    .prose hr { margin: 2em 0; border: 0; border-top: 1px solid #e5e7eb; }
    .prose table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9em; }
    .prose th { text-align: left; padding: 0.75em; border-bottom: 2px solid #e5e7eb; font-weight: 600; background: #f9fafb; }
    .prose td { padding: 0.75em; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
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
  
  // MODES: 'live' (Sans Serif), 'preview' (Read Only), 'source' (Markdown Code)
  const [mode, setMode] = useState('live'); 

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    setImgIndex(0);
  }, [entry?.id]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && (mode === 'live' || mode === 'source')) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [content, mode]);

  // Handle textarea focus with improved mobile keyboard support
  const handleTextareaFocus = (e) => {
    if (isScrollingRef.current) return;
    
    const el = e.target;
    isScrollingRef.current = true;
    
    // Wait for keyboard to appear
    setTimeout(() => {
      // Get the bounding rect of the textarea
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      
      // Check if textarea is hidden by keyboard
      if (rect.bottom > viewportHeight * 0.6) {
        el.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
      
      isScrollingRef.current = false;
    }, 300);
  };

  // Handle input changes with scroll adjustment
  const handleContentChange = (e) => {
    setContent(e.target.value);
    
    // Keep cursor visible while typing
    if (document.activeElement === e.target && !isScrollingRef.current) {
      requestAnimationFrame(() => {
        const el = e.target;
        const rect = el.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        
        // Only scroll if near bottom of visible area
        if (rect.bottom > viewportHeight - 50) {
          el.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'nearest'
          });
        }
      });
    }
  };

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
      (position) => {
        setTimeout(() => {
          setLocation(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
          setWeather("Sunny 24°C"); 
          setLoadingLocation(false);
        }, 1000);
      },
      () => {
        alert("Unable to retrieve your location");
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
    if (!entry?.id) {
      onClose();
      return;
    }
    if (window.confirm('Are you sure you want to delete this entry completely?')) {
      onDelete(entry.id);
    }
  };

  const nextImage = () => {
    if (images.length > 0) {
      setImgIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 0) {
      setImgIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const deleteCurrentImage = () => {
    if (window.confirm('Delete this image?')) {
      const newImages = images.filter((_, i) => i !== imgIndex);
      setImages(newImages);
      setImgIndex(newImages.length > 0 ? Math.min(imgIndex, newImages.length - 1) : 0);
    }
  };

  // --- CYCLE BUTTON LOGIC ---
  const toggleMode = () => {
    setMode(current => {
      if (current === 'live') return 'preview';
      if (current === 'preview') return 'source';
      return 'live';
    });
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'live': return Type;
      case 'preview': return Eye;
      case 'source': return Code;
      default: return Type;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'live': return 'Editor';
      case 'preview': return 'Preview';
      case 'source': return 'Source';
      default: return 'Editor';
    }
  };

  const ModeIcon = getModeIcon();
  const CurrentMoodIcon = MOODS.find((m) => m.value === mood)?.icon || Cloud;
  const currentMoodColor = MOODS.find((m) => m.value === mood)?.color || 'text-gray-500';

  const renderedMarkdown = content ? DOMPurify.sanitize(marked.parse(content)) : '';

  return (
    <>
      <Styles />
      <div className="fixed inset-0 bg-white z-50 flex flex-col animate-slideUp overflow-hidden" style={{ height: '100dvh' }}>
        {/* Header - Fixed at top */}
        <div className="px-4 py-3 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-100/50 flex-shrink-0">
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            {entry?.id && (
              <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <Trash2 size={20} />
              </button>
            )}
            
            <button 
              onClick={toggleMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-xs font-medium"
              title={`Current mode: ${getModeLabel()}`}
            >
              <ModeIcon size={14} />
              <span>{getModeLabel()}</span>
            </button>

            <button onClick={handleSave} className="px-4 py-1.5 bg-blue-500 text-white font-semibold rounded-full shadow-md shadow-blue-500/20 active:scale-95 transition-all text-sm">
              Done
            </button>
          </div>
        </div>

        {/* Main Scroll Container with extra bottom padding for keyboard */}
        <div 
          ref={scrollContainerRef} 
          className="flex-1 overflow-y-auto no-scrollbar px-6 py-4"
          style={{ paddingBottom: '40vh' }}
        >
          {images.length > 0 && (
            <div className="w-full h-72 relative group bg-gray-100 mb-4 rounded-lg overflow-hidden shrink-0">
              <img src={images[imgIndex]} alt="Memory" className="w-full h-full object-contain bg-gray-50/50 backdrop-blur-sm" />
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
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={deleteCurrentImage} className="bg-black/30 hover:bg-red-500/80 text-white p-1.5 rounded-full backdrop-blur-md transition-colors">
                  <Trash2 size={14} />
                </button>
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

          {/* Meta info section */}
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

          {/* LIVE MODE - Sans Serif Editor */}
          {mode === 'live' && (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onFocus={handleTextareaFocus}
              placeholder="Start writing..."
              className="editor-textarea w-full min-h-[300px] resize-none text-xl text-gray-800 placeholder-gray-300 border-none outline-none focus:ring-0 font-sans leading-relaxed"
              style={{ overflowY: 'hidden' }}
            />
          )}

          {/* SOURCE MODE - Markdown Code */}
          {mode === 'source' && (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onFocus={handleTextareaFocus}
              placeholder="Edit markdown source..."
              spellCheck={false}
              className="editor-textarea w-full min-h-[300px] resize-none text-sm text-gray-700 placeholder-gray-400 border border-gray-300 rounded-lg p-4 font-mono leading-relaxed bg-gray-50"
              style={{ overflowY: 'hidden' }}
            />
          )}

          {/* PREVIEW MODE - Read Only */}
          {mode === 'preview' && (
            <div
              className="w-full min-h-[300px] prose prose-blue max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
            />
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center text-gray-400">
            <span className="text-xs uppercase tracking-wider font-medium">Attachments</span>
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm transition-colors disabled:opacity-50">
                {uploading ? (<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />) : (<ImageIcon size={18} />)}
                <span className="text-xs">{uploading ? 'Processing...' : 'Add Image'}</span>
              </button>
            </div>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>
      </div>
    </>
  );
};

export default Editor;
