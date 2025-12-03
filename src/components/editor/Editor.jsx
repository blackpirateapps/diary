import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlignLeft, ChevronLeft, Trash2, Calendar, MapPin, Sun } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db, useBlobUrl } from '../../db'; 
import EntryPdfDocument from './EntryPdfDocument'; 
import TagInput from './TagInput'; 

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TRANSFORMERS, $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode } from '@lexical/code';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// --- NEW IMPORTS FOR MENTIONS ---
import { MentionNode } from './nodes/MentionNode';
import MentionsPlugin from './MentionsPlugin';

import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

import EditorHeader from './EditorHeader';
import ZenOverlay from './ZenOverlay';
import MetadataBar from './MetadataBar';
import SleepWidget from './SleepWidget';
import ToolbarPlugin from './ToolbarPlugin';
import { Styles, compressImage, blobToJpeg, getWeatherLabel } from './editorUtils';

const BlobImage = ({ src, ...props }) => {
  const url = useBlobUrl(src);
  return <motion.img src={url} {...props} />;
};

const MOODS_LABELS = { 1: 'Awful', 2: 'Bad', 3: 'Sad', 4: 'Meh', 5: 'Okay', 6: 'Good', 7: 'Great', 8: 'Happy', 9: 'Loved', 10: 'Amazing' };

// --- PLUGINS ---
const MarkdownInitPlugin = ({ content }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const current = $convertToMarkdownString(TRANSFORMERS);
      if (current !== content) {
         $convertFromMarkdownString(content || '', TRANSFORMERS);
      }
    });
  }, [content, editor]); 
  return null;
};

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

// --- ANIMATION VARIANTS ---
// Updated for a subtle modal pop-up effect on desktop
const containerVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

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
  
  const contentRef = useRef(content);
  contentRef.current = content;

  const [mode, setMode] = useState(isToday ? 'edit' : 'preview');
  const [isMoodOpen, setIsMoodOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  
  const [zenSettings] = useState(() => {
     const saved = localStorage.getItem('zen_settings');
     return saved ? JSON.parse(saved) : {};
  });

  const sleepSessions = useLiveQuery(() => db.sleep_sessions.toArray(), []) || [];
  const todaysSleepSessions = sleepSessions.filter(session => 
    new Date(session.startTime).toDateString() === currentDate.toDateString()
  );

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const isDirty = content !== (entry?.content || '');
      if (saveStatus === 'saving' || (isDirty && saveStatus !== 'saved')) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus, content, entry]);

  const saveData = useCallback((isAutoSave = false, overrideDate = null) => {
    if (isAutoSave && !contentRef.current?.trim() && images.length === 0) return;
    
    setSaveStatus('saving');
    const dateToSave = overrideDate || currentDate;
    
    onSave({ 
      id: entryId, 
      content: contentRef.current, 
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
  }, [entryId, currentDate, mood, location, locationLat, locationLng, weather, tags, images, onSave]);

  useEffect(() => {
    if (content !== (entry?.content || '')) {
      const timer = setTimeout(() => saveData(true), 500);
      return () => clearTimeout(timer);
    }
  }, [content, saveData, entry?.content]);

  // --- HANDLERS ---
  const handleZenBack = (finalContent) => {
    if (typeof finalContent === 'string') {
        contentRef.current = finalContent; 
        setContent(finalContent); 
    }
    saveData(true);
    setIsZenMode(false);
  };

  const handleTimeChange = (e) => {
    if (!e.target.value) return;
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const newDate = new Date(currentDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setCurrentDate(newDate);
    saveData(true, newDate);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const compressedBlob = await compressImage(file);
        setImages(prev => [...prev, compressedBlob]);
        setImgIndex(images.length); 
        setTimeout(() => saveData(true), 100);
      } catch (err) { alert(err.message); } 
      finally { setUploading(false); e.target.value = ''; }
    }
  };

  const handleLocation = async () => {
    if (loadingLocation) return;
    setLoadingLocation(true);
    if (!navigator.geolocation) { alert("Geolocation not supported"); setLoadingLocation(false); return; }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      setLocationLat(latitude); setLocationLng(longitude);
      
      try {
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        if (wRes.ok) {
           const d = await wRes.json();
           setWeather(`${getWeatherLabel(d.current_weather.weathercode)}, ${Math.round(d.current_weather.temperature)}°C`);
        }
        const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
        if (locRes.ok) {
            const d = await locRes.json();
            const parts = [d.address.road || d.address.building, d.address.city || d.address.town || d.address.suburb].filter(Boolean);
            setLocation(parts.length ? parts.join(', ') : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setTimeout(() => saveData(true), 200);
      } catch (e) { console.error(e); } finally { setLoadingLocation(false); }
    }, (e) => { console.error(e); alert("Location error"); setLoadingLocation(false); });
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const pdfImages = await Promise.all(images.map(img => blobToJpeg(img)));
      const doc = <EntryPdfDocument entry={{ id: entryId, content, mood, location, weather, tags, images: pdfImages.filter(Boolean), date: currentDate.toISOString() }} moodLabel={MOODS_LABELS[mood]} sleepSessions={todaysSleepSessions} />;
      const blob = await pdf(doc).toBlob();
      saveAs(blob, `Journal_${currentDate.toISOString().split('T')[0]}.pdf`);
    } catch (err) { alert("PDF Failed"); } finally { setIsExporting(false); }
  };

  const initialConfig = useMemo(() => ({
    namespace: 'MainEditor',
    theme: {
      paragraph: 'mb-4',
      heading: {
        h1: 'text-3xl font-bold mb-4 mt-6',
        h2: 'text-2xl font-bold mb-3 mt-5',
        h3: 'text-xl font-bold mb-2 mt-4',
      },
      list: {
        ul: 'list-disc ml-5 mb-4',
        ol: 'list-decimal ml-5 mb-4',
      },
      quote: 'border-l-4 border-gray-300 pl-4 italic my-4 text-gray-500',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        code: 'bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 font-mono text-sm text-pink-500',
      }
    },
    // --- UPDATED NODES ARRAY ---
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, MentionNode],
    onError: (error) => console.error(error),
    editable: mode === 'edit'
  }), [mode]);

  return (
    <>
      <Styles />
      <ZenOverlay 
        isActive={isZenMode} 
        content={content} 
        setContent={setContent} 
        onBack={handleZenBack} 
        settings={zenSettings} 
      />

      <AnimatePresence>
        {/* Backdrop for Desktop */}
        <motion.div 
            className="fixed inset-0 bg-black/5 dark:bg-black/50 backdrop-blur-sm z-40 hidden lg:block"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { saveData(false); onClose(); }}
        />

        <motion.div 
            className="fixed inset-0 lg:inset-8 lg:max-w-7xl lg:mx-auto bg-white dark:bg-gray-950 lg:rounded-2xl lg:shadow-2xl z-50 flex flex-col overflow-hidden font-sans transition-colors border border-gray-100 dark:border-gray-800" 
            variants={containerVariants} initial="hidden" animate="visible" exit="exit"
        >
            <EditorHeader 
              onClose={onClose} saveStatus={saveStatus} onZen={() => setIsZenMode(true)} 
              onExport={handleExportPdf} isExporting={isExporting} onDelete={() => { if(window.confirm('Delete?')) onDelete(entryId); }}
              toggleMode={() => setMode(m => m === 'edit' ? 'preview' : 'edit')} mode={mode} 
              onDone={() => { saveData(false); onClose(); }} entryId={entry?.id}
            />

            {/* Split Layout for Desktop */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white dark:bg-gray-950">
                
                {/* LEFT: Main Editor Area */}
                <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col order-2 lg:order-1">
                    
                    {/* Cover Image Style */}
                    <AnimatePresence>
                        {images.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: "16rem" }} 
                                exit={{ opacity: 0, height: 0 }} 
                                className="w-full relative group bg-gray-50 dark:bg-gray-900 flex-shrink-0"
                            >
                                <BlobImage key={imgIndex} src={images[imgIndex]} className="w-full h-full object-cover opacity-90 transition-opacity hover:opacity-100" />
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-gray-950/80 to-transparent pointer-events-none" />

                                {images.length > 1 && (
                                    <>
                                        <button onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-sm"><ChevronLeft size={20}/></button>
                                        <button onClick={() => setImgIndex((i) => (i + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-sm"><ChevronLeft size={20} className="rotate-180"/></button>
                                    </>
                                )}
                                <button onClick={() => { if(window.confirm('Delete image?')) { setImages(i => i.filter((_,x) => x !== imgIndex)); setImgIndex(0); saveData(true); } }} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-600"><Trash2 size={16}/></button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Editor Content Container */}
                    <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 lg:px-12 lg:py-12">
                        
                        {/* Title / Date Area (Mobile Only - Hidden on Desktop Sidebar) */}
                        <div className="lg:hidden mb-6">
                            <div className="flex items-baseline gap-3 mb-1">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{currentDate.toLocaleDateString(undefined, { weekday: 'long' })}</h2>
                                <span className="text-xl text-gray-400 dark:text-gray-500 font-medium">{currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
                            </div>
                        </div>

                        {/* Mobile Metadata Bar (Hidden on Desktop) */}
                        <div className="lg:hidden mb-8">
                             <MetadataBar 
                                mood={mood} setMood={setMood} isMoodOpen={isMoodOpen} setIsMoodOpen={setIsMoodOpen} onSave={saveData}
                                location={location} onLocationClick={handleLocation} loadingLocation={loadingLocation}
                                weather={weather} uploading={uploading} onImageUpload={handleImageUpload}
                                isSidebar={false}
                            />
                        </div>

                        {/* Lexical Editor */}
                        <div className="min-h-[400px] relative">
                             <LexicalComposer initialConfig={initialConfig}>
                               {mode === 'edit' && <ToolbarPlugin />}
                               
                               {/* --- ADDED MENTIONS PLUGIN --- */}
                               <MentionsPlugin />
                               
                               <RichTextPlugin
                                 contentEditable={
                                   <ContentEditable className="outline-none text-lg lg:text-xl text-gray-800 dark:text-gray-200 leading-relaxed min-h-[400px]" />
                                 }
                                 placeholder={
                                   <div className="absolute top-16 lg:top-14 left-0 text-gray-300 dark:text-gray-700 pointer-events-none text-lg lg:text-xl select-none">
                                     Start writing here...
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
                             {mode === 'preview' && <div className="absolute inset-0 z-10" />}
                        </div>
                    </div>
                </main>

                {/* RIGHT: Sidebar (Desktop Only) */}
                <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-6 overflow-y-auto order-1 lg:order-2">
                    
                    {/* Date Block */}
                    <div className="mb-8 hidden lg:block">
                        <div className="flex items-center gap-2 text-[var(--accent-500)] mb-2 font-medium">
                            <Calendar size={18} />
                            <span>{currentDate.getFullYear()}</span>
                        </div>
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">{currentDate.toLocaleDateString(undefined, { weekday: 'long' })}</h2>
                        <h3 className="text-2xl text-gray-400 font-medium mb-4">{currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h3>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 border-b border-gray-200 dark:border-gray-800 pb-4">
                            <div className="relative group cursor-pointer hover:text-[var(--accent-500)] transition-colors flex items-center gap-2">
                                <Clock size={16} strokeWidth={2.5} />
                                <span className="font-semibold">{currentDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                <input type="time" value={currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} onChange={handleTimeChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                                <AlignLeft size={14} />
                                <span>{wordCount} words</span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Sidebar Implementation */}
                    <div className="flex flex-col gap-6">
                        
                        {/* Re-using Metadata Bar logic but strictly for sidebar layout if LG */}
                        <div className="hidden lg:block">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Context</label>
                            <MetadataBar 
                                mood={mood} setMood={setMood} isMoodOpen={isMoodOpen} setIsMoodOpen={setIsMoodOpen} onSave={saveData}
                                location={location} onLocationClick={handleLocation} loadingLocation={loadingLocation}
                                weather={weather} uploading={uploading} onImageUpload={handleImageUpload}
                                isSidebar={true}
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Tags</label>
                            <TagInput tags={tags} onChange={(newTags) => { setTags(newTags); saveData(true); }} />
                        </div>

                        {/* Sleep */}
                        {todaysSleepSessions.length > 0 && (
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Sleep Data</label>
                                {todaysSleepSessions.map(session => <SleepWidget key={session.id} session={session} />)}
                            </div>
                        )}
                        
                        {/* Mobile: Bottom Filler */}
                        <div className="lg:hidden h-20"></div>
                    </div>
                </aside>

            </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default Editor;