import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Clock, Trash2, X, FileDown } from 'lucide-react'; // Added X, FileDown
import { useLiveQuery } from 'dexie-react-hooks';

import { db, useBlobUrl } from '../../db'; 
import EntryPdfDocument from './EntryPdfDocument'; 
import TagInput from './TagInput'; 
import MetadataBar from './MetadataBar';
import SleepWidget from './SleepWidget';
import ToolbarPlugin from './ToolbarPlugin';

// Refactored Imports
import { safeLocalStorageSet, safeLocalStorageGet, safeLocalStorageRemove, formatBytes } from './storageUtils';
import EditorHeader from './EditorHeader';
import EditorSidebar from './EditorSidebar';
import { EditorStatePlugin, MentionsTracker, EditorModePlugin, TimeTravelPlugin } from './EditorPlugins';

// Lexical Imports
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode } from '@lexical/code';
import { ParagraphNode } from 'lexical'; 
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

import { MentionNode } from './nodes/MentionNode'; 
import MentionsPlugin from './MentionsPlugin';

// --- TIMELINE FEATURES ---
import { SessionParagraphNode } from './nodes/SessionParagraphNode';
import { SessionDividerNode } from './nodes/SessionDividerNode';
import SessionAttributionPlugin from './plugins/SessionAttributionPlugin';
import SessionVisualizerPlugin from './plugins/SessionVisualizerPlugin';
// -------------------------

import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Styles, compressImage, blobToJpeg, getWeatherLabel } from './editorUtils';

const BlobImage = ({ src, ...props }) => {
  const url = useBlobUrl(src);
  return <img src={url} {...props} />;
};

const MOODS_LABELS = { 1: 'Awful', 2: 'Bad', 3: 'Sad', 4: 'Meh', 5: 'Okay', 6: 'Good', 7: 'Great', 8: 'Happy', 9: 'Loved', 10: 'Amazing' };

// --- EXPORT MODAL COMPONENT ---
const ExportModal = ({ isOpen, onClose, onConfirm }) => {
  const [mode, setMode] = useState('NORMAL');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FileDown size={18} className="text-[var(--accent-500)]"/> Export Options
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">PDF Format Mode</label>
          <div className="space-y-3">
             {[
               { id: 'NORMAL', label: 'Standard', desc: 'Clean, readable format' },
               { id: 'MIRROR', label: 'Mirror Mode', desc: 'Flipped text for reflection reading' },
               { id: 'MORSE', label: 'Morse Code', desc: 'Encrypted visual morse translation' }
             ].map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => setMode(opt.id)}
                  className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                    mode === opt.id 
                    ? 'border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{opt.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
                </div>
             ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-950 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(mode)}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--accent-500)] hover:bg-[var(--accent-600)] rounded-lg shadow-sm transition-colors"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};


// --- MAIN EDITOR ---
const Editor = ({ entry, initialDate, onClose, onSave, onDelete, isSidebarOpen }) => { 
  const [entryId] = useState(entry?.id || Date.now().toString());
  const [currentDate, setCurrentDate] = useState(
    entry?.date 
      ? new Date(entry.date) 
      : (initialDate ? new Date(initialDate) : new Date())
  );
  
  const isToday = currentDate.toDateString() === new Date().toDateString();
  const [mode, setMode] = useState(isToday ? 'edit' : 'preview');

  const [content, setContent] = useState(entry?.content || '');
  const [previewText, setPreviewText] = useState(entry?.preview || ''); 
  
  const [sessions, setSessions] = useState(() => {
    if (entry?.sessions && entry.sessions.length > 0) return entry.sessions;
    if (entry?.content) {
      return [{
        startTime: entry.date || new Date().toISOString(),
        endTime: entry.date || new Date().toISOString(),
        contentSnapshot: entry.content 
      }];
    }
    return [];
  });

  const [previewSessionIndex, setPreviewSessionIndex] = useState(sessions.length - 1);

  // New Export State
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
      if (mode === 'edit') {
          setPreviewSessionIndex(sessions.length - 1);
      }
  }, [sessions.length, mode]);
  
  const lastTypeTimeRef = useRef(null);
  if (lastTypeTimeRef.current === null) {
      if (entry?.sessions && entry.sessions.length > 0) {
        const last = entry.sessions[entry.sessions.length - 1];
        const lastEnd = last.endTime ? new Date(last.endTime).getTime() : 0;
        lastTypeTimeRef.current = isNaN(lastEnd) ? 0 : lastEnd;
      } else {
        lastTypeTimeRef.current = 0; 
      }
  }

  const [mood, setMood] = useState(entry?.mood || 5);
  const [location, setLocation] = useState(entry?.location || '');
  const [locationLat, setLocationLat] = useState(entry?.locationLat || null);
  const [locationLng, setLocationLng] = useState(entry?.locationLng || null);
  const [weather, setWeather] = useState(entry?.weather || '');
  
  const [locationHistory, setLocationHistory] = useState(entry?.locationHistory || []);

  const [tags, setTags] = useState(entry?.tags || []);
  const [images, setImages] = useState(entry?.images || []);
  const [taggedPeople, setTaggedPeople] = useState(entry?.people || []);
  
  const stableStateRef = useRef({
    content, previewText, sessions, mood, location, locationLat, locationLng, weather, tags, images, taggedPeople, locationHistory
  });

  useEffect(() => {
    stableStateRef.current = {
      content, previewText, sessions, mood, location, locationLat, locationLng, weather, tags, images, taggedPeople, locationHistory
    };
  });

  const [isMoodOpen, setIsMoodOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');
  
  const sleepSessions = useLiveQuery(() => db.sleep_sessions.toArray(), []) || [];
  const todaysSleepSessions = sleepSessions.filter(session => 
    new Date(session.startTime).toDateString() === currentDate.toDateString()
  );

  const wordCount = previewText.trim().split(/\s+/).filter(Boolean).length;

  // --- localStorage CRASH RECOVERY ---
  const RECOVERY_KEY = `journal-recovery-${entryId}`;

  const saveToLocalStorage = useCallback((data) => {
    const backupData = {
      content: data.content,
      previewText: data.previewText,
      sessions: data.sessions,
      mood: data.mood,
      location: data.location,
      locationLat: data.locationLat,
      locationLng: data.locationLng,
      locationHistory: data.locationHistory,
      weather: data.weather,
      tags: data.tags,
      taggedPeople: data.taggedPeople,
      imageCount: data.images.length,
      lastSaved: Date.now()
    };

    const jsonString = JSON.stringify(backupData);
    const result = safeLocalStorageSet(RECOVERY_KEY, jsonString);
    
    if (!result.success) {
      if (result.reason === 'size') {
        setStorageWarning(`Entry too large (${formatBytes(result.size)}). Crash recovery disabled.`);
        setSaveStatus('storage-warning');
      } else if (result.reason === 'quota') {
        setStorageWarning('Browser storage full. Crash recovery disabled.');
        setSaveStatus('storage-warning');
      }
    } else {
      setStorageWarning('');
    }
  }, [RECOVERY_KEY]);

  useEffect(() => {
    saveToLocalStorage(stableStateRef.current);
  }, [content, previewText, sessions, mood, location, locationLat, locationLng, weather, tags, images, taggedPeople, locationHistory, saveToLocalStorage]);

  useEffect(() => {
    const recoverData = () => {
      const recovered = safeLocalStorageGet(RECOVERY_KEY);
      if (!recovered) return;
      
      try {
        const data = JSON.parse(recovered);
        const timeSince = Date.now() - data.lastSaved;
        
        if (timeSince < 5 * 60 * 1000) {
          const hasChanges = data.content && data.content !== (entry?.content || '');
          
          if (hasChanges && window.confirm('🕒 Recovered unsaved changes from browser crash. Restore?')) {
            setContent(data.content || '');
            setPreviewText(data.previewText || '');
            setMood(data.mood || 5);
            setLocation(data.location || '');
            setLocationLat(data.locationLat || null);
            setLocationLng(data.locationLng || null);
            setLocationHistory(data.locationHistory || []);
            setWeather(data.weather || '');
            setTags(data.tags || []);
            setSessions(data.sessions || []);
            setTaggedPeople(data.taggedPeople || []);
            
            if (data.imageCount && data.imageCount !== images.length) {
              console.warn(`Note: ${data.imageCount} images were in the crashed session but couldn't be recovered`);
            }
          }
        }
      } catch (e) { 
        console.error('Recovery failed:', e);
      }
    };
    
    recoverData();
  }, [RECOVERY_KEY, entry?.id, entry?.content, images.length]);

  const handleSessionUpdate = useCallback((currentText, currentJSON) => {
    const now = Date.now();
    const timeSinceLastType = now - lastTypeTimeRef.current;
    const SESSION_TIMEOUT = 5 * 60 * 1000; 

    const snapshotToSave = currentJSON || currentText;

    setSessions(prevSessions => {
      let newSessions = [...prevSessions];
      
      if (newSessions.length === 0) {
        newSessions.push({
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          contentSnapshot: snapshotToSave
        });
      } 
      else if (timeSinceLastType > SESSION_TIMEOUT) {
        newSessions.push({
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          contentSnapshot: snapshotToSave
        });
      } 
      else {
        const lastIndex = newSessions.length - 1;
        newSessions[lastIndex] = {
          ...newSessions[lastIndex],
          endTime: new Date().toISOString(),
          contentSnapshot: snapshotToSave
        };
      }
      return newSessions;
    });

    lastTypeTimeRef.current = now;
  }, []);

  const saveDataRef = useRef();
  saveDataRef.current = (isAutoSave = false, overrideDate = null) => {
    const state = stableStateRef.current;
    
    if (isAutoSave && !state.content && state.images.length === 0) return;
    
    setSaveStatus('saving');
    const dateToSave = overrideDate || currentDate;
    
    onSave({ 
      id: entryId, 
      content: state.content, 
      preview: state.previewText, 
      mood: state.mood, 
      location: state.location, 
      locationLat: state.locationLat, 
      locationLng: state.locationLng, 
      locationHistory: state.locationHistory, 
      weather: state.weather, 
      tags: state.tags, 
      images: state.images, 
      people: state.taggedPeople,
      sessions: state.sessions,
      date: dateToSave.toISOString() 
    });

    setTimeout(() => {
      setSaveStatus('saved');
      safeLocalStorageRemove(RECOVERY_KEY);
      setStorageWarning('');
    }, 500);
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const saveData = useCallback((isAutoSave = false, overrideDate = null) => {
    saveDataRef.current?.(isAutoSave, overrideDate);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveData(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, mood, location, locationLat, locationLng, weather, tags, images, taggedPeople, sessions, locationHistory, saveData]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  useEffect(() => {
    return () => {
      if (saveStatus === 'saved') {
        safeLocalStorageRemove(RECOVERY_KEY);
      }
    };
  }, [RECOVERY_KEY, saveStatus]);

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
      } catch (err) { 
        alert(err.message); 
      } finally { 
        setUploading(false); 
        e.target.value = ''; 
      }
    }
  };

  const handleLocation = useCallback(async () => {
    if (loadingLocation) return;
    setLoadingLocation(true);
    
    if (!navigator.geolocation) { 
      alert("Geolocation not supported by your browser"); 
      setLoadingLocation(false); 
      return; 
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      let newWeather = weather;
      let newAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`; 
      
      try {
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        if (wRes.ok) {
           const d = await wRes.json();
           newWeather = `${getWeatherLabel(d.current_weather.weathercode)}, ${Math.round(d.current_weather.temperature)}°C`;
           setWeather(newWeather);
        }

        const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
        if (locRes.ok) {
            const d = await locRes.json();
            const parts = [d.address.road || d.address.building, d.address.city || d.address.town || d.address.suburb].filter(Boolean);
            if (parts.length > 0) newAddress = parts.join(', ');
            setLocation(newAddress);
        }

        const newSnapshot = {
          timestamp: new Date().toISOString(),
          lat: latitude,
          lng: longitude,
          address: newAddress,
          weather: newWeather
        };
        
        setLocationHistory(prev => {
            const last = prev[prev.length - 1];
            if (last) {
                const timeDiff = new Date(newSnapshot.timestamp) - new Date(last.timestamp);
                if (timeDiff < 60000 && last.address === newAddress) {
                    return prev; 
                }
            }
            return [...prev, newSnapshot];
        });
        
        setLocationLat(latitude); 
        setLocationLng(longitude);

      } catch (e) { 
        console.error("Location fetch error:", e); 
        setLocationHistory(prev => [...prev, {
            timestamp: new Date().toISOString(),
            lat: latitude,
            lng: longitude,
            address: newAddress,
            weather: newWeather
        }]);
      } finally { 
        setLoadingLocation(false); 
      }
    }, (e) => { 
      console.error(e); 
      alert("Location access denied or failed."); 
      setLoadingLocation(false); 
    });
  }, [loadingLocation, weather]);

  const handleExportPdf = async (selectedMode) => {
    setIsExporting(true);
    setShowExportModal(false); // Close modal immediately
    try {
      const pdfImages = await Promise.all(images.map(img => blobToJpeg(img)));
      const doc = <EntryPdfDocument 
          entry={{ 
            id: entryId, 
            content: content,
            mood, 
            location, 
            weather, 
            tags, 
            images: pdfImages.filter(Boolean), 
            date: currentDate.toISOString() 
          }} 
          moodLabel={MOODS_LABELS[mood]} 
          sleepSessions={todaysSleepSessions} 
          printMode={selectedMode}
        />;
      const blob = await pdf(doc).toBlob();
      saveAs(blob, `Journal_${selectedMode}_${currentDate.toISOString().split('T')[0]}.pdf`);
    } catch (err) { 
      console.error("PDF Export Error:", err);
      alert(`PDF Failed: ${err.message}`); 
    } finally { 
      setIsExporting(false); 
    }
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
    nodes: [
      HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, MentionNode,
      SessionParagraphNode, SessionDividerNode,
      {
        replace: ParagraphNode,
        with: (node) => new SessionParagraphNode()
      }
    ],
    onError: (error) => console.error(error),
    editable: mode === 'edit'
  }), [mode]); 

  return (
    <>
      <Styles />

      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onConfirm={handleExportPdf}
      />

      <div className={`fixed inset-y-0 right-0 left-0 bg-white dark:bg-gray-950 z-40 overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:left-64' : 'md:left-0'}`}>
          <EditorHeader 
            onClose={onClose} 
            saveStatus={saveStatus} 
            onExport={() => setShowExportModal(true)} // Open modal instead of direct export
            isExporting={isExporting} 
            onDelete={() => { if(window.confirm('Are you sure you want to delete this entry?')) onDelete(entryId); }}
            toggleMode={() => setMode(m => m === 'edit' ? 'preview' : 'edit')} 
            mode={mode} 
            entry={entry}
            storageWarning={storageWarning}
          />

          <LexicalComposer initialConfig={initialConfig}>
            <SessionAttributionPlugin currentSessionIndex={sessions.length - 1} />
            <SessionVisualizerPlugin sessions={sessions} />

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white dark:bg-gray-950 min-h-0">
                
                <div className="flex-1 flex flex-col relative min-w-0 min-h-0">
                    
                    {mode === 'edit' && (
                        <div className="flex-shrink-0 z-10 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm">
                            <ToolbarPlugin onInsertImage={() => document.getElementById('img-upload-trigger')?.click()} />
                            <input id="img-upload-trigger" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </div>
                    )}

                    <main className="flex-1 overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch flex flex-col min-h-0">
                        
                        {images.length > 0 && (
                            <div 
                                style={{ height: "16rem" }}
                                className="w-full relative group bg-gray-50 dark:bg-gray-900 flex-shrink-0"
                            >
                                <BlobImage key={imgIndex} src={images[imgIndex]} className="w-full h-full object-cover opacity-90 transition-opacity hover:opacity-100" />
                                <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-gray-950/80 to-transparent pointer-events-none" />
                                <button 
                                  onClick={() => { 
                                    if(window.confirm('Delete image?')) { 
                                      setImages(i => i.filter((_,x) => x !== imgIndex)); 
                                      setImgIndex(0); 
                                    } 
                                  }} 
                                  className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-600"
                                >
                                  <Trash2 size={16}/>
                                </button>
                            </div>
                        )}

                        <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 lg:px-12 lg:py-12">
                            
                            <div className="lg:hidden mb-6 flex justify-between items-end">
    <div>
        <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {currentDate.toLocaleDateString(undefined, { weekday: 'long' })}
            </h2>
            <span className="text-xl text-gray-400 dark:text-gray-500 font-medium">
              {currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
            </span>
        </div>
    </div>
    {/* Added Word Count for Mobile */}
    <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pb-1">
        {wordCount} Words
    </div>
</div>

                            <div className="lg:hidden mb-8">
                                <MetadataBar 
                                    mood={mood} 
                                    setMood={setMood} 
                                    isMoodOpen={isMoodOpen} 
                                    setIsMoodOpen={setIsMoodOpen} 
                                    onSave={saveData}
                                    location={location} 
                                    onLocationClick={handleLocation} 
                                    loadingLocation={loadingLocation}
                                    weather={weather} 
                                    uploading={uploading} 
                                    onImageUpload={handleImageUpload}
                                    locationHistory={locationHistory}
                                    isSidebar={false}
                                />
                            </div>

                            <div className="min-h-[400px] relative pb-20">
                                <EditorModePlugin mode={mode} />
                                <MentionsPlugin />
                                <MentionsTracker onChange={setTaggedPeople} />
                                
                                <TimeTravelPlugin 
                                    sessions={sessions} 
                                    activeIndex={previewSessionIndex} 
                                    isPreviewMode={mode === 'preview'} 
                                />

                                <RichTextPlugin
                                    contentEditable={
                                      <ContentEditable className="outline-none text-lg lg:text-xl text-gray-800 dark:text-gray-200 leading-relaxed min-h-[400px]" />
                                    }
                                    placeholder={
                                      <div className="absolute top-0 left-0 text-gray-300 dark:text-gray-700 pointer-events-none text-lg lg:text-xl select-none">
                                        Start writing here...
                                      </div>
                                    }
                                    ErrorBoundary={LexicalErrorBoundary}
                                />
                                <HistoryPlugin />
                                <ListPlugin />
                                <MarkdownShortcutPlugin transformers={TRANSFORMERS} /> 
                                
                                {mode === 'edit' && (
                                    <EditorStatePlugin 
                                      content={content} 
                                      onChange={setContent} 
                                      onTextChange={(text) => {
                                        setPreviewText(text);
                                      }}
                                      onSessionUpdate={handleSessionUpdate}
                                    />
                                )}

                                {mode === 'preview' && (
                                    <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
                                      <div className="flex items-center gap-2 mb-4">
                                        <Clock size={18} className="text-[var(--accent-500)]" />
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Time Travel</h3>
                                      </div>
                                      
                                      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                                        <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
                                          <span>Start</span>
                                          <span>Session {previewSessionIndex + 1} / {sessions.length}</span>
                                          <span>Now</span>
                                        </div>
                                        <input 
                                          type="range" 
                                          min={0} 
                                          max={sessions.length - 1} 
                                          value={previewSessionIndex}
                                          onChange={(e) => setPreviewSessionIndex(Number(e.target.value))}
                                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-500)]"
                                        />
                                        <div className="text-center mt-2 text-xs text-gray-400">
                                          {sessions[previewSessionIndex]?.endTime 
                                            ? new Date(sessions[previewSessionIndex].endTime).toLocaleTimeString() 
                                            : 'Unknown Time'}
                                        </div>
                                      </div>
                                    </div>
                                )}
                            </div>

                            <div className="lg:hidden mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                                <div className="mb-8">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Tags</label>
                                    <TagInput tags={tags} onChange={setTags} />
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
                </div>

                <EditorSidebar 
                    currentDate={currentDate}
                    handleTimeChange={handleTimeChange}
                    wordCount={wordCount}
                    mode={mode}
                    previewText={previewText}
                    mood={mood}
                    setMood={setMood}
                    isMoodOpen={isMoodOpen}
                    setIsMoodOpen={setIsMoodOpen}
                    saveData={saveData}
                    location={location} 
                    handleLocation={handleLocation}
                    loadingLocation={loadingLocation}
                    weather={weather}
                    locationHistory={locationHistory}
                    uploading={uploading}
                    handleImageUpload={handleImageUpload}
                    tags={tags}
                    setTags={setTags}
                    todaysSleepSessions={todaysSleepSessions}
                />
          </div>
        </LexicalComposer>
      </div>
    </>
  );
};

export default Editor;