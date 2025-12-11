import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Clock, AlignLeft, ChevronLeft, Trash2, Calendar, MapPin, Sun, Pencil, Check, UserPlus, Sparkles } from 'lucide-react';
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
import { MentionNode, $createMentionNode, $isMentionNode } from './nodes/MentionNode'; 
import MentionsPlugin from './MentionsPlugin';

import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

import MetadataBar from './MetadataBar';
import SleepWidget from './SleepWidget';
import ToolbarPlugin from './ToolbarPlugin';
import { Styles, compressImage, blobToJpeg, getWeatherLabel, findPeopleMatches } from './editorUtils';

const BlobImage = ({ src, ...props }) => {
  const url = useBlobUrl(src);
  return <img src={url} {...props} />;
};

const MOODS_LABELS = { 1: 'Awful', 2: 'Bad', 3: 'Sad', 4: 'Meh', 5: 'Okay', 6: 'Good', 7: 'Great', 8: 'Happy', 9: 'Loved', 10: 'Amazing' };

// --- PLUGINS ---

const EditorStatePlugin = ({ content, onChange, onTextChange, onSessionUpdate }) => {
  const [editor] = useLexicalComposerContext();
  const isFirstRender = useRef(true);

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

  return (
    <OnChangePlugin
      onChange={(editorState) => {
        const jsonString = JSON.stringify(editorState.toJSON());
        onChange(jsonString);
        editorState.read(() => {
            const textContent = $getRoot().getTextContent();
            onTextChange(textContent);
            onSessionUpdate(textContent, jsonString); 
        });
      }}
    />
  );
};

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

const EditorModePlugin = ({ mode }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(mode === 'edit');
  }, [editor, mode]);
  return null;
};

const TimeTravelPlugin = ({ sessions, activeIndex, isPreviewMode }) => {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    if (!isPreviewMode || !sessions || sessions.length === 0) return;
    const index = Math.min(Math.max(0, activeIndex), sessions.length - 1);
    const session = sessions[index];
    const content = session?.contentSnapshot;

    if (!content) return;

    editor.update(() => {
        try {
            const jsonState = JSON.parse(content);
            if (jsonState.root) {
                const editorState = editor.parseEditorState(jsonState);
                editor.setEditorState(editorState);
                return;
            }
        } catch (e) {
            $convertFromMarkdownString(String(content), TRANSFORMERS);
        }
    });
  }, [editor, sessions, activeIndex, isPreviewMode]);

  return null;
};

// --- PEOPLE SUGGESTIONS SIDEBAR ---
const PeopleSuggestions = ({ contentText }) => {
  const [editor] = useLexicalComposerContext();
  const people = useLiveQuery(() => db.people.toArray()) || [];
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();
      const matches = [];
      const uniqueIds = new Set();

      textNodes.forEach(node => {
        // Ignore matches if they are already MentionNodes
        if ($isMentionNode(node)) return;

        const text = node.getTextContent();
        const nodeMatches = findPeopleMatches(text, people);
        
        nodeMatches.forEach(m => {
             if (!uniqueIds.has(m.person.id)) {
                 uniqueIds.add(m.person.id);
                 matches.push(m);
             }
        });
      });
      
      setSuggestions(matches);
    });
  }, [contentText, people, editor]);

  const replaceWithMention = (person, matchWord) => {
    editor.update(() => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();
        
        for (const node of textNodes) {
            if ($isMentionNode(node)) continue;

            const text = node.getTextContent();
            const regex = new RegExp(`\\b${matchWord}\\b`, 'i');
            const match = regex.exec(text);
            
            if (match) {
                const startOffset = match.index;
                const endOffset = startOffset + match[0].length;
                let targetNode = node;
                
                if (startOffset > 0) {
                    targetNode = targetNode.splitText(startOffset)[1];
                }
                if (targetNode) {
                    if (targetNode.getTextContent().length > match[0].length) {
                         targetNode.splitText(match[0].length);
                    }
                    const mentionNode = $createMentionNode(person.name, person.id, null);
                    targetNode.replace(mentionNode);
                }
                break;
            }
        }
    });
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 shadow-sm mb-6 animate-fadeIn">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <Sparkles size={14} className="text-[var(--accent-500)]" />
            <span>Detected People</span>
        </div>
        <div className="space-y-2">
            {suggestions.map(({ person, matchWord }) => (
                <div key={person.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden flex-shrink-0">
                             <span className="flex items-center justify-center w-full h-full text-[10px] font-bold">{person.name[0]}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{person.name}</span>
                            <span className="text-[10px] text-gray-400">Matches "{matchWord}"</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => replaceWithMention(person, matchWord)}
                        className="p-1.5 bg-[var(--accent-50)] text-[var(--accent-600)] rounded-md hover:bg-[var(--accent-100)] transition-colors"
                        title="Convert to Mention"
                    >
                        <UserPlus size={16} />
                    </button>
                </div>
            ))}
        </div>
    </div>
  );
};

// --- HEADER ---
const EditorPageHeader = ({ entry, onClose, saveStatus, onExport, isExporting, onDelete, toggleMode, mode }) => {
    return (
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300">
            <ChevronLeft size={24} />
          </button>
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            {entry?.id ? 'Edit Entry' : 'New Entry'}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            saveStatus === 'saved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' :
            saveStatus === 'saving' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400' :
            'text-gray-400 dark:text-gray-600'
          }`}>
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleMode}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            title={mode === 'edit' ? 'Preview Mode' : 'Edit Mode'}
          >
            {mode === 'edit' ? <Check size={20} /> : <Pencil size={20} />}
          </button>

          {entry?.id && (
            <button 
              onClick={onDelete} 
              className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-colors text-red-600 dark:text-red-400"
              title="Delete Entry"
            >
              <Trash2 size={20} />
            </button>
          )}

          <button 
            onClick={onExport} 
            disabled={isExporting}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-50"
            title="Export to PDF"
          >
            {isExporting ? <span className="text-sm">...</span> : 'PDF'}
          </button>
        </div>
      </header>
    );
};

// --- MAIN EDITOR ---
const Editor = ({ entry, onClose, onSave, onDelete }) => {
  const [entryId] = useState(entry?.id || Date.now().toString());
  const [currentDate, setCurrentDate] = useState(entry?.date ? new Date(entry.date) : new Date());
  
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
  const [tags, setTags] = useState(entry?.tags || []);
  const [images, setImages] = useState(entry?.images || []);
  const [taggedPeople, setTaggedPeople] = useState(entry?.people || []);
  
  // Stable refs pattern for autosave - always use latest values
  const stableStateRef = useRef({
    content,
    previewText,
    sessions,
    mood,
    location,
    locationLat,
    locationLng,
    weather,
    tags,
    images,
    taggedPeople
  });

  // Update refs on every render
  useEffect(() => {
    stableStateRef.current = {
      content,
      previewText,
      sessions,
      mood,
      location,
      locationLat,
      locationLng,
      weather,
      tags,
      images,
      taggedPeople
    };
  });

  const [isMoodOpen, setIsMoodOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isExporting, setIsExporting] = useState(false);
  
  const sleepSessions = useLiveQuery(() => db.sleep_sessions.toArray(), []) || [];
  const todaysSleepSessions = sleepSessions.filter(session => 
    new Date(session.startTime).toDateString() === currentDate.toDateString()
  );

  const wordCount = previewText.trim().split(/\s+/).filter(Boolean).length;

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

  // Improved save with stable callback pattern
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
      weather: state.weather, 
      tags: state.tags, 
      images: state.images, 
      people: state.taggedPeople,
      sessions: state.sessions,
      date: dateToSave.toISOString() 
    });

    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  // Stable callback wrapper
  const saveData = useCallback((isAutoSave = false, overrideDate = null) => {
    saveDataRef.current?.(isAutoSave, overrideDate);
  }, []);

  // Debounced autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      saveData(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, mood, location, locationLat, locationLng, weather, tags, images, taggedPeople, sessions, saveData]);

  // Prevent data loss on unload
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
      setLocationLat(latitude); 
      setLocationLng(longitude);
      
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
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoadingLocation(false); 
      }
    }, (e) => { 
      console.error(e); 
      alert("Location error"); 
      setLoadingLocation(false); 
    });
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
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
        />;
      const blob = await pdf(doc).toBlob();
      saveAs(blob, `Journal_${currentDate.toISOString().split('T')[0]}.pdf`);
    } catch (err) { 
      alert("PDF Failed"); 
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
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, MentionNode],
    onError: (error) => console.error(error),
    editable: mode === 'edit'
  }), []); 

  return (
    <>
      <Styles />

      {/* Mobile-optimized fixed layout with proper height handling */}
      <div className="fixed inset-0 flex flex-col w-full bg-white dark:bg-gray-950 z-40 overflow-hidden">
          <EditorPageHeader 
            onClose={onClose} 
            saveStatus={saveStatus} 
            onExport={handleExportPdf} 
            isExporting={isExporting} 
            onDelete={() => { if(window.confirm('Are you sure you want to delete this entry?')) onDelete(entryId); }}
            toggleMode={() => setMode(m => m === 'edit' ? 'preview' : 'edit')} 
            mode={mode} 
            entry={entry}
          />

          <LexicalComposer initialConfig={initialConfig}>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white dark:bg-gray-950 min-h-0">
                
                {/* LEFT: MAIN CONTENT */}
                <div className="flex-1 flex flex-col relative min-w-0 min-h-0">
                    
                    {/* Fixed Toolbar Area */}
                    {mode === 'edit' && (
                        <div className="flex-shrink-0 z-10 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm">
                            <ToolbarPlugin onInsertImage={() => document.getElementById('img-upload-trigger')?.click()} />
                            {/* Hidden input for image trigger */}
                            <input id="img-upload-trigger" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </div>
                    )}

                    {/* Scrollable Content Area - key fix for mobile */}
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
                            
                            {/* Mobile Date Header */}
                            <div className="lg:hidden mb-6">
                                <div className="flex items-baseline gap-3 mb-1">
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                      {currentDate.toLocaleDateString(undefined, { weekday: 'long' })}
                                    </h2>
                                    <span className="text-xl text-gray-400 dark:text-gray-500 font-medium">
                                      {currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            {/* Mobile Metadata */}
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

                            {/* Mobile Tags/Sleep */}
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

                {/* RIGHT: SIDEBAR - Desktop only */}
                <aside className="hidden lg:flex lg:flex-col w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-6 overflow-y-auto min-h-0">
                    
                    {/* Desktop Date/Time Header */}
                    <div className="mb-8 flex-shrink-0">
                        <div className="flex items-center gap-2 text-[var(--accent-500)] mb-2 font-medium">
                            <Calendar size={18} />
                            <span>{currentDate.getFullYear()}</span>
                        </div>
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
                          {currentDate.toLocaleDateString(undefined, { weekday: 'long' })}
                        </h2>
                        <h3 className="text-2xl text-gray-400 font-medium mb-4">
                          {currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 border-b border-gray-200 dark:border-gray-800 pb-4">
                            <div className="relative group cursor-pointer hover:text-[var(--accent-500)] transition-colors flex items-center gap-2">
                                <Clock size={16} strokeWidth={2.5} />
                                <span className="font-semibold">
                                  {currentDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </span>
                                <input 
                                  type="time" 
                                  value={currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} 
                                  onChange={handleTimeChange} 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                />
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                                <AlignLeft size={14} />
                                <span>{wordCount} words</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 flex-1 overflow-y-auto">
                        {/* New Tooltip Component for Fuzzy Matching */}
                        {mode === 'edit' && <PeopleSuggestions contentText={previewText} />}

                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Context</label>
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
                                isSidebar={true}
                            />
                        </div>

                        <div>
                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Tags</label>
                                <TagInput tags={tags} onChange={setTags} />
                            </div>

                            {todaysSleepSessions.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Sleep Data</label>
                                    {todaysSleepSessions.map(session => <SleepWidget key={session.id} session={session} />)}
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
          </div>
        </LexicalComposer>
      </div>
    </>
  );
};

export default Editor;
