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
  RefreshCw
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import MoodPopup from './MoodPopup';
import TagInput from './TagInput';

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

// Image compression helper (same as before)
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
          if (compressed.length > 500000) {
            reject(new Error('Compressed image still too large. Try a smaller image.'));
          } else {
            resolve(compressed);
          }
        } catch {
          reject(new Error('Failed to compress image.'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
  });
};

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
  const [mode, setMode] = useState('live'); // live, preview, source

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    setImgIndex(0);
  }, [entry?.id]);

  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (document.activeElement === el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [content, mode]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const compressedBase64 = await compressImage(file);
        setImages((prev) => [...prev, compressedBase64]);
        setImgIndex((prev) => prev + 1);
      } catch (err) {
        alert(err.message || 'Failed to process image.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  // Location handling (same as before)...

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

  const nextImage = () => setImgIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setImgIndex((prev) => (prev - 1 + images.length) % images.length);
  const deleteCurrentImage = () => {
    if (window.confirm('Delete this image?')) {
      const newImages = images.filter((_, i) => i !== imgIndex);
      setImages(newImages);
      setImgIndex(newImages.length ? Math.max(0, newImages.length - 1) : 0);
    }
  };

  const CurrentMoodIcon = MOODS.find((m) => m.value === mood)?.icon || Cloud;
  const currentMoodColor = MOODS.find((m) => m.value === mood)?.color || 'text-gray-500';

  const renderedMarkdown = DOMPurify.sanitize(marked.parse(content));

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-slideUp overflow-hidden" style={{ height: '100dvh' }}>
      {/* Header */}
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

      {/* Mode toggle */}
      <div className="flex justify-center gap-2 mt-16 border-b border-gray-200 p-2">
        <button
          onClick={() => setMode('live')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium ${mode === 'live' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <RefreshCw size={16} />
          Live
        </button>
        <button
          onClick={() => setMode('preview')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium ${mode === 'preview' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <Eye size={16} />
          Preview
        </button>
        <button
          onClick={() => setMode('source')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium ${mode === 'source' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <Code size={16} />
          Source
        </button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
        {images.length > 0 && (
          <div className="w-full h-72 relative group bg-gray-100 mb-4 rounded-lg overflow-hidden">
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
            <div className="absolute top-4 right-4 flex gap-2">
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

        {/* Meta info section unchanged */}
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

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <button onClick={() => setIsMoodOpen(!isMoodOpen)} className={`flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mood ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              <CurrentMoodIcon size={14} className={currentMoodColor} />
              <span>{MOODS.find(m => m.value === mood)?.label || 'Mood'}</span>
            </button>
            {isMoodOpen && (
              <MoodPopup currentMood={mood} onChange={setMood} onClose={() => setIsMoodOpen(false)} />
            )}
          </div>

          <div className="flex items-center bg-gray-50 rounded-full pl-2 pr-1 py-0.5 border border-gray-100 max-w-[160px]">
            <MapPin size={12} className="text-gray-400 mr-1 flex-shrink-0" />
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="bg-transparent border-none p-0 text-xs text-gray-600 placeholder-gray-400 focus:ring-0 w-full truncate" />
            <button onClick={handleLocation} disabled={loadingLocation} className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-50">
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

        {/* Editor modes content */}
        {mode === 'live' && (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Start writing markdown..."
            className="w-full min-h-[300px] resize-none text-lg text-gray-800 placeholder-gray-300 border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
          />
        )}

        {mode === 'source' && (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Edit markdown source..."
            spellCheck={false}
            className="w-full min-h-[300px] resize-none text-sm text-gray-700 placeholder-gray-400 border border-gray-300 rounded-lg p-4 font-mono leading-relaxed bg-gray-50"
          />
        )}

        {mode === 'preview' && (
          <div
            className="w-full min-h-[300px] p-4 bg-white rounded-lg border border-gray-300 overflow-auto prose max-w-none"
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
  );
};

export default Editor;
