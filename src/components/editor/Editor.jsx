import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlignLeft, ChevronLeft, Trash2, Calendar, MapPin, Sun } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db, useBlobUrl } from '../../db'; 
import EntryPdfDocument from './EntryPdfDocument'; 
import TagInput from './TagInput'; 
import SessionVisualizer from './SessionVisualizer';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TRANSFORMERS, $convertFromMarkdownString } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode } from '@lexical/code';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// --- MENTIONS IMPORTS ---
import { $nodesOfType, $getRoot } from 'lexical';
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

// --- CUSTOM PLUGINS ---

// 1. STATE SYNC & SESSION TRACKING PLUGIN
const EditorStatePlugin = ({ content, onChange, onTextChange, onSessionUpdate }) => {
  const [editor] = useLexicalComposerContext();
  const isFirstRender = useRef(true);

  // Initialize State
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (content) {
        try {
          const jsonState = JSON.parse(content);
          if (jsonState.root) {
             const editorState = editor.parseEditorState(jsonState);
             editor.setEditorState(editorState);
          } else {
             throw new Error("Not lexical state");
          }
        } catch (e) {
          editor.update(() => {
             $convertFromMarkdownString(content, TRANSFORMERS);
          });
        }
      }
    }
  }, [content, editor]);

  // Sync Changes & Track Sessions
  return (
    <OnChangePlugin
      onChange={(editorState) => {
        const jsonString = JSON.stringify(editorState.toJSON());
        onChange(jsonString);
        editorState.read(() => {
            const textContent = $getRoot().getTextContent();
            onTextChange(textContent);
            onSessionUpdate(textContent); // Notify parent to check session logic
        });
      }}
    />
  );
};

// 2. MENTIONS TRACKER
const MentionsTracker = ({ onChange }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const mentionNodes = $nodesOfType(MentionNode);
        const uniqueIds = [...new Set(mentionNodes.map((node) => node.__id))];
        onChange(uniqueIds);
      });
    });
  }, [editor, onChange]);
  return null;
};

// 3. MODE PLUGIN
const EditorModePlugin = ({ mode }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(mode === 'edit');
  }, [editor, mode]);
  return null;
};

// --- ANIMATION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

const Editor = ({ entry, onClose, onSave, onDelete }) => {
  const [entryId] = useState(entry?.id || Date.now().toString());
  const [currentDate, setCurrentDate] = useState(entry?.date ? new Date(entry.date) : new Date());
  
  const isToday = currentDate.toDateString() === new Date().toDateString();
  const [mode, setMode] = useState(isToday ? 'edit' : 'preview');

  const [content, setContent] = useState(entry?.content || '');
  const [previewText, setPreviewText] = useState(entry?.preview || ''); 
  
  // --- SESSION STATE ---
  // MODIFIED: Automatically seed a "Baseline" session for legacy entries
  const [sessions, setSessions] = useState(() => {
    // 1. If sessions exist, use them
    if (entry?.sessions && entry.sessions.length > 0) {
      return entry.sessions;
    }
    // 2. If no sessions but content exists (Legacy), create a baseline
    if (entry?.content) {
      return [{
        startTime: entry.date || new Date().toISOString(),
        endTime: entry.date || new Date().toISOString(),
        contentSnapshot: entry.preview || entry.content // Use raw text for snapshot
      }];
    }
    // 3. New entry
    return [];
  });
  
  // Initialize ref based on the LAST SAVED session.
  // If we seeded a session above, entry.sessions is still empty here, so it defaults to 0.
  // This causes the next edit to be treated as a "New Session" (Case 2), which is exactly what we want.
  const lastTypeTimeRef = useRef(null);
  if (lastTypeTimeRef.current === null) {
      if (entry?.sessions && entry.sessions.length > 0) {
        const last = entry.sessions[entry.sessions.length - 1];
        const lastEnd = last.endTime ? new Date(last.endTime).getTime() : 0;
        lastTypeTimeRef.current = isNaN(lastEnd) ? 0 : lastEnd;
      } else {
        lastTypeTimeRef.current = 0; // Force new session if no history
      }
  }
  // --------------------

  const [mood, setMood] = useState(entry?.mood || 5);
  const [location, setLocation] = useState(entry?.location || '');
  const [locationLat, setLocationLat] = useState(entry?.locationLat || null);
  const [locationLng, setLocationLng] = useState(entry?.locationLng || null);
  const [weather, setWeather] = useState(entry?.weather || '');
  const [tags, setTags] = useState(entry?.tags || []);
  const [images, setImages] = useState(entry?.images || []);
  const [taggedPeople, setTaggedPeople] = useState(entry?.people || []);
  
  const contentRef = useRef(content);
  contentRef.current = content;
  
  const previewRef = useRef(previewText);
  previewRef.current = previewText;

  // Track sessions reference for saving
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

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

  const wordCount = previewText.trim().split(/\s+/).filter(Boolean).length;

  // --- SESSION LOGIC ---
  const handleSessionUpdate = useCallback((currentText) => {
    const now = Date.now();
    const timeSinceLastType = now - lastTypeTimeRef.current;
    const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 Minutes

    setSessions(prevSessions => {
      let newSessions = [...prevSessions];
      
      // Case 1: First session ever for this entry (New Entry)
      if (newSessions.length === 0) {
        newSessions.push({
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          contentSnapshot: currentText
        });
      } 
      // Case 2: Returned after a long break (> 5 mins) -> NEW SESSION
      // This also handles the "First Edit of Legacy Entry" case, because lastTypeTimeRef is 0
      else if (timeSinceLastType > SESSION_TIMEOUT) {
        newSessions.push({
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          contentSnapshot: currentText
        });
      } 
      // Case 3: Continuing current session -> UPDATE END TIME & SNAPSHOT
      else {
        const lastIndex = newSessions.length - 1;
        newSessions[lastIndex] = {
          ...newSessions[lastIndex],
          endTime: new Date().toISOString(),
          contentSnapshot: currentText
        };
      }
      return newSessions;
    });

    lastTypeTimeRef.current = now;
  }, []);
  // ---------------------

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
    if (isAutoSave && !contentRef.current && images.length === 0) return;
    
    setSaveStatus('saving');
    const dateToSave = overrideDate || currentDate;
    
    onSave({ 
      id: entryId, 
      content: contentRef.current, 
      preview: previewRef.current, 
      mood, 
      location, 
      locationLat, 
      locationLng, 
      weather, 
      tags, 
      images, 
      people: taggedPeople,
      sessions: sessionsRef.current, // SAVE SESSIONS
      date: dateToSave.toISOString() 
    });

    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 2500);
  }, [entryId, currentDate, mood, location, locationLat, locationLng, weather, tags, images, taggedPeople, onSave]);

  useEffect(() => {
    if (content !== (entry?.content || '')) {
      const timer = setTimeout(() => saveData(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [content, saveData, entry?.content]);

  // Handlers
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
      const doc = <EntryPdfDocument entry={{ id: entryId, content: previewText || content, mood, location, weather, tags, images: pdfImages.filter(Boolean), date: currentDate.toISOString() }} moodLabel={MOODS_LABELS[mood]} sleepSessions={todaysSleepSessions} />;
      const blob = await pdf(doc).toBlob();
      saveAs(blob, `Journal_${currentDate.toISOString().split('T')[0]}.pdf`);
    } catch (err) { alert("PDF Failed"); } finally { setIsExporting(false); }
  };

  const initialConfig = useMemo(() => ({
    namespace: 'MainEditor',
    theme: {
      paragraph: 'mb-4',
      heading: { h1: 'text-3xl font-bold mb-4 mt-6', h2: 'text-2xl font-bold mb-3 mt-5', h3: 'text-xl font-bold mb-2 mt-4' },
      list: { ul: 'list-disc ml-5 mb-4', ol: 'list-decimal ml-5 mb-4' },
      quote: 'border-l-4 border-gray-300 pl-4 italic my-4 text-gray-500',
      text: { bold: 'font-bold', italic: 'italic', underline: 'underline', code: 'bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 font-mono text-sm text-pink-500' }
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, MentionNode],
    onError: (error) => console.error(error),
    editable: mode === 'edit'
  }), []); 

  return (
    <>
      <Styles />
      <ZenOverlay 
        isActive={isZenMode} content={content} setContent={setContent} 
        onBack={handleZenBack} 
      />

      <AnimatePresence>
        <motion.div 
            className="fixed inset-0 bg-black/5 dark:bg-black/50 backdrop-blur-sm z-40 hidden lg:block"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { saveData(false); onClose(); }}
        />

        <motion.div 
            className="fixed inset-0 lg:inset-8 lg:max-w-7xl lg:mx-auto bg-white dark:bg-gray-950 lg:rounded-2xl lg:shadow-2xl z-50 flex flex-col overflow-hidden font-sans transition-colors border border-gray-100 dark:border-gray-800 h-[100dvh] lg:h-auto" 
            variants={containerVariants} initial="hidden" animate="visible" exit="exit"
        >
            <EditorHeader 
              onClose={onClose} saveStatus={saveStatus} onZen={() => setIsZenMode(true)} 
              onExport={handleExportPdf} isExporting={isExporting} onDelete={() => { if(window.confirm('Delete?')) onDelete(entryId); }}
              toggleMode={() => setMode(m => m === 'edit' ? 'preview' : 'edit')} mode={mode} 
              onDone={() => { saveData(false); onClose(); }} entryId={entry?.id}
            />

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white dark:bg-gray-950">
                <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col order-2 lg:order-1 max-w-full overflow-x-hidden">
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
                                <button onClick={() => { if(window.confirm('Delete image?')) { setImages(i => i.filter((_,x) => x !== imgIndex)); setImgIndex(0); saveData(true); } }} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-600"><Trash2 size={16}/></button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 lg:px-12 lg:py-12">
                        <div className="lg:hidden mb-6">
                            <div className="flex items-baseline gap-3 mb-1">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{currentDate.toLocaleDateString(undefined, { weekday: 'long' })}</h2>
                                <span className="text-xl text-gray-400 dark:text-gray-500 font-medium">{currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
                            </div>
                        </div>

                        <div className="lg:hidden mb-8">
                             <MetadataBar 
                                mood={mood} setMood={setMood} isMoodOpen={isMoodOpen} setIsMoodOpen={setIsMoodOpen} onSave={saveData}
                                location={location} onLocationClick={handleLocation} loadingLocation={loadingLocation}
                                weather={weather} uploading={uploading} onImageUpload={handleImageUpload}
                                isSidebar={false}
                            />
                        </div>

                        <div className="min-h-[400px] relative">
                             {mode === 'preview' ? (
                               <div className="prose dark:prose-invert max-w-none">
                                  {/* Preview mode shows Time Travel UI below, editor hidden */}
                               </div>
                             ) : null}

                             <div className={mode === 'preview' ? 'hidden' : 'block'}>
                               <LexicalComposer initialConfig={initialConfig}>
                                 <ToolbarPlugin />
                                 <EditorModePlugin mode={mode} />
                                 <MentionsPlugin />
                                 <MentionsTracker onChange={setTaggedPeople} />

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
                                 
                                 <EditorStatePlugin 
                                   content={content} 
                                   onChange={setContent} 
                                   onTextChange={(text) => {
                                      setPreviewText(text);
                                      previewRef.current = text;
                                   }} 
                                   onSessionUpdate={handleSessionUpdate}
                                 />
                               </LexicalComposer>
                             </div>

                             {/* TIME TRAVELLER UI (Visible in Preview Mode) */}
                             {mode === 'preview' && (
                                <SessionVisualizer sessions={sessions} />
                             )}
                        </div>

                        {/* MOBILE ONLY: Tags and Sleep at the bottom */}
                        <div className="lg:hidden mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                           <div className="mb-8">
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Tags</label>
                              <TagInput tags={tags} onChange={(newTags) => { setTags(newTags); saveData(true); }} />
                           </div>

                           {todaysSleepSessions.length > 0 && (
                              <div className="mb-20">
                                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Sleep Data</label>
                                  {todaysSleepSessions.map(session => <SleepWidget key={session.id} session={session} />)}
                              </div>
                           )}
                           <div className="h-10"></div>
                        </div>

                    </div>
                </main>

                <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-6 overflow-y-auto order-1 lg:order-2">
                    {/* ... Desktop Sidebar Content ... */}
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

                    <div className="flex flex-col gap-6">
                        <div className="hidden lg:block">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Context</label>
                            <MetadataBar 
                                mood={mood} setMood={setMood} isMoodOpen={isMoodOpen} setIsMoodOpen={setIsMoodOpen} onSave={saveData}
                                location={location} onLocationClick={handleLocation} loadingLocation={loadingLocation}
                                weather={weather} uploading={uploading} onImageUpload={handleImageUpload}
                                isSidebar={true}
                            />
                        </div>

                        <div className="hidden lg:block">
                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Tags</label>
                                <TagInput tags={tags} onChange={(newTags) => { setTags(newTags); saveData(true); }} />
                            </div>

                            {todaysSleepSessions.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Sleep Data</label>
                                    {todaysSleepSessions.map(session => <SleepWidget key={session.id} session={session} />)}
                                </div>
                            )}
                        </div>
                        <div className="lg:hidden h-2"></div>
                    </div>
                </aside>
            </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default Editor;