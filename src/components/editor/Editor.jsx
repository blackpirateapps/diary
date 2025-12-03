import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Trash2, Clock, 
  MapPin, Plus, Image as ImageIcon, Cloud,
  Smile, Frown, Meh, Heart, Sun, CloudRain 
} from 'lucide-react';

// --- LEXICAL IMPORTS (Required for Mentions) ---
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS, $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode } from '@lexical/code';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// --- MENTION FEATURE IMPORTS ---
import MentionsPlugin from './MentionsPlugin';
import { MentionNode } from './nodes/MentionNode';

// Re-using your existing sub-components/utils
import TagInput from './TagInput'; 
import MoodPopup from '../MoodPopup';
import { compressImage } from './editorUtils'; 

// --- CONSTANTS ---
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

// --- HELPER PLUGINS ---
// Loads initial content into the editor
const MarkdownInitPlugin = ({ content }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const current = $convertToMarkdownString(TRANSFORMERS);
      if (current !== content) {
         $convertFromMarkdownString(content || '', TRANSFORMERS);
      }
    });
  }, []); // Run once on mount
  return null;
};

// Syncs editor changes back to your state string
const MarkdownSyncPlugin = ({ onChange }) => {
  return (
    <OnChangePlugin
      onChange={(editorState) => {
        editorState.read(() => {
          const markdown = $convertToMarkdownString(TRANSFORMERS);
          onChange(markdown);
        });
      }}
    />
  );
};

const Editor = ({ entry, onClose, onSave, onDelete }) => {
  const entryDate = entry?.date ? new Date(entry.date) : new Date();

  // --- STATE ---
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
  const scrollContainerRef = useRef(null);

  // --- LOGIC (Preserved from your original file) ---
  
  useEffect(() => {
    setImgIndex(0);
  }, [entry?.id]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const compressedBase64 = await compressImage(file);
        setImages(prev => [...prev, compressedBase64]);
        setImgIndex(prev => prev + 1);
      } catch (err) {
        alert(err.message || "Failed to process image.");
        console.error(err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleLocation = () => {
    if (!navigator.onLine) {
      const manual = window.prompt("You are offline. Please enter location manually:");
      if (manual) setLocation(manual);
      return;
    }

    if (!navigator.geolocation) {
      const manual = window.prompt("Geolocation is not supported by your browser. Please enter location manually:");
      if (manual) setLocation(manual);
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
          );
          const weatherData = await weatherRes.json();
          const temp = weatherData.current_weather?.temperature;
          if (temp !== undefined) {
            setWeather(`${temp}°C`);
          }

          const locRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
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
          const manual = window.prompt("Could not fetch details. Enter manually:");
          if (manual) setLocation(manual);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        let msg = "Unable to access location.";
        if (error.code === 1) msg = "Location permission denied.";
        const manual = window.prompt(`${msg} Please enter manually:`);
        if (manual) setLocation(manual);
        setLoadingLocation(false);
      }
    );
  };

  const handleSave = () => {
    if (!content.trim() && images.length === 0) {
      window.alert('Please write something before saving.');
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
    setImgIndex((prev) => (prev + 1) % images.length);
  };
  const prevImage = () => {
    setImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  const deleteCurrentImage = () => {
    if (window.confirm('Delete this image?')) {
      const newImages = images.filter((_, i) => i !== imgIndex);
      setImages(newImages);
      if (newImages.length === 0) {
        setImgIndex(0);
      } else if (imgIndex >= newImages.length) {
        setImgIndex(Math.max(0, newImages.length - 1));
      }
    }
  };

  const CurrentMoodIcon = MOODS.find(m => m.value === mood)?.icon || Meh;
  const currentMoodColor = MOODS.find(m => m.value === mood)?.color || 'text-gray-500';

  // --- EDITOR CONFIG ---
  const initialConfig = useMemo(() => ({
    namespace: 'JournalEditor',
    theme: {
      paragraph: 'mb-4',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      }
    },
    // REGISTER NODES (Including MentionNode)
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, MentionNode],
    onError: (error) => console.error(error),
    editable: true // Force editable to true
  }), []);

  return (
    <div
      className="fixed inset-0 bg-white dark:bg-gray-950 z-50 flex flex-col animate-slideUp overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md absolute top-0 left-0 right-0 z-20 border-b border-gray-100/50 dark:border-gray-800">
        <button
          onClick={onClose}
          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          {entry && entry.id && (
            <button
              onClick={handleDelete}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
            >
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
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto no-scrollbar pt-16"
      >
        {/* Carousel / Cover Image */}
        {images.length > 0 && (
          <div className="w-full h-72 relative group bg-gray-100 dark:bg-gray-900 mb-4">
            <img
              src={images[imgIndex]}
              alt="Memory"
              className="w-full h-full object-contain bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm"
            />
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <img
                src={images[imgIndex]}
                className="w-full h-full object-cover blur-xl opacity-50"
                alt=""
              />
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

        <div className="px-6 pb-12">
          <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
              {entryDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm mt-1 font-medium">
              <Clock size={14} />
              {entryDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              <span>•</span>
              <span>{entryDate.getFullYear()}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative">
              <button
                onClick={() => setIsMoodOpen(!isMoodOpen)}
                className={`flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  mood ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                <CurrentMoodIcon size={14} className={currentMoodColor} />
                <span>{MOODS.find(m => m.value === mood)?.label || 'Mood'}</span>
              </button>
              {isMoodOpen && (
                <MoodPopup currentMood={mood} onChange={setMood} onClose={() => setIsMoodOpen(false)} />
              )}
            </div>

            <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-full pl-2 pr-1 py-0.5 border border-gray-100 dark:border-gray-700 max-w-[160px]">
              <MapPin size={12} className="text-gray-400 mr-1 flex-shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="bg-transparent border-none p-0 text-xs text-gray-600 dark:text-gray-300 placeholder-gray-400 focus:ring-0 w-full truncate"
              />
              <button onClick={handleLocation} disabled={loadingLocation} className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-50">
                {loadingLocation ? (
                  <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus size={10} />
                )}
              </button>
            </div>

            {weather && (
              <div className="flex items-center bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 rounded-full px-2 py-0.5 border border-orange-100 dark:border-orange-800 text-xs">
                <Cloud size={12} className="mr-1" />
                {weather}
              </div>
            )}

            <TagInput
              tags={tags}
              onChange={(newTags) => setTags(newTags)}
            />
          </div>

          {/* REPLACED TEXTAREA WITH LEXICAL EDITOR */}
          <div className="relative min-h-[300px]">
            <LexicalComposer initialConfig={initialConfig}>
                {/* Mentions Plugin Integration */}
                <MentionsPlugin />
                
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable className="outline-none text-lg text-gray-800 dark:text-gray-200 leading-7 font-serif min-h-[300px] pb-20" />
                    }
                    placeholder={
                        <div className="absolute top-0 left-0 text-gray-300 dark:text-gray-600 pointer-events-none text-lg font-serif select-none">
                            Start writing... (Type @ to tag people)
                        </div>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin />
                <ListPlugin />
                <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                <MarkdownInitPlugin content={content} />
                <MarkdownSyncPlugin onChange={setContent} />
            </LexicalComposer>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-gray-400">
            <span className="text-xs uppercase tracking-wider font-medium">Attachments</span>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImageIcon size={18} />
                )}
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

export default Editor;