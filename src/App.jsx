import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, migrateFromLocalStorage, exportToZip, importFromZip } from './db'; 
import { SleepPage } from './components/SleepPage';
import { WhatsAppPage } from './components/WhatsAppPage';
import MeditationPage from './components/MeditationPage'; 
import YearInReviewPage from './components/YearInReviewPage'; 

// --- UPDATED IMPORT PATH ---
import Editor from './components/editor/Editor'; 

import JournalList from './components/JournalList';
import StatsPage from './components/StatsPage';
import MediaGallery from './components/MediaGallery';
import FlashbackPage from './components/FlashbackPage';
import MapPage from './components/MapPage';
import { MoreMenu, SettingsPage, AboutPage, ThemesPage } from './components/MorePages';

import {
  BarChart2,
  Grid,
  Home,
  Map as MapIcon, 
  Trash2,
  Menu 
} from 'lucide-react';

// --- THEME ENGINE CONSTANTS ---
const ACCENT_COLORS = {
  blue:   { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 500: '#3b82f6', 600: '#2563eb' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 500: '#8b5cf6', 600: '#7c3aed' },
  emerald:{ 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 500: '#10b981', 600: '#059669' },
  amber:  { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 500: '#f59e0b', 600: '#d97706' },
  rose:   { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 500: '#f43f5e', 600: '#e11d48' },
};

const App = () => {
  // --- APP PREFERENCES STATE ---
  const [appName, setAppName] = useState(() => localStorage.getItem('app_name') || 'Journal');
  
  // THEME STATE
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app_theme') === 'dark');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('app_accent') || 'blue');

  // --- GLOBAL FONT LOADER (FOR ZEN MODE) ---
  useEffect(() => {
    const loadFont = () => {
      const saved = localStorage.getItem('zen_settings');
      if (saved) {
        const { googleFontUrl } = JSON.parse(saved);
        if (googleFontUrl && googleFontUrl.startsWith('http')) {
           // Remove old link if exists
           const oldLink = document.getElementById('zen-font-link');
           if (oldLink) oldLink.remove();

           const link = document.createElement('link');
           link.id = 'zen-font-link';
           link.rel = 'stylesheet';
           link.href = googleFontUrl;
           document.head.appendChild(link);
        }
      }
    };
    
    // Load on mount
    loadFont();

    // Listen for changes from SettingsPage
    window.addEventListener('zen-settings-changed', loadFont);
    return () => window.removeEventListener('zen-settings-changed', loadFont);
  }, []);

  // --- THEME ENGINE EFFECT ---
  useEffect(() => {
    const root = document.documentElement;
    const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;

    // 1. Handle Dark Mode Class
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('app_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('app_theme', 'light');
    }

    // 2. Inject CSS Variables for Accent Colors
    root.style.setProperty('--accent-50', colors[50]);
    root.style.setProperty('--accent-100', colors[100]);
    root.style.setProperty('--accent-200', colors[200]);
    root.style.setProperty('--accent-500', colors[500]);
    root.style.setProperty('--accent-600', colors[600]);
    
    localStorage.setItem('app_accent', accentColor);
  }, [isDarkMode, accentColor]);

  // --- ROUTING LOGIC ---
  const getHash = () => window.location.hash.replace('#', '') || 'journal';
  const [currentRoute, setCurrentRoute] = useState(getHash());

  useEffect(() => {
    const handleHashChange = () => setCurrentRoute(getHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route) => {
    window.location.hash = route;
  };

  // --- STATE ---
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showFlashback, setShowFlashback] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const entries = useLiveQuery(
    () => db.entries.orderBy('date').reverse().toArray(), 
    []
  ) || [];

  const dateInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- INIT & MIGRATION ---
  useEffect(() => {
    migrateFromLocalStorage();
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- CRUD OPERATIONS ---
  const handleSaveEntry = async (entry) => {
    try {
      await db.entries.put(entry);
    } catch (error) {
      console.error("Failed to save entry:", error);
      alert("Failed to save. Storage might be full.");
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!id) {
      setIsEditorOpen(false);
      setEditingEntry(null);
      return;
    }
    try {
      await db.entries.delete(id);
      setIsEditorOpen(false);
      setEditingEntry(null);
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  // --- EDITOR HANDLING ---
  const openNewEditor = (date = new Date()) => {
    const dateStr = date.toDateString();
    const existing = entries.find(e => new Date(e.date).toDateString() === dateStr);
    if (existing) {
      setEditingEntry(existing);
    } else {
      setEditingEntry({ id: Date.now().toString(), date: date.toISOString() });
    }
    setIsEditorOpen(true);
  };

  const openEditEditor = (entry) => {
    setEditingEntry(entry);
    setIsEditorOpen(true);
  };

  const handleDateSelect = (e) => {
    if (e.target.value) {
      const selectedDate = new Date(e.target.value + 'T12:00:00');
      openNewEditor(selectedDate);
    }
    e.target.value = '';
  };

  // --- IMPORT/EXPORT HANDLERS ---
  const handleExport = async () => {
    try {
      await exportToZip();
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const count = await importFromZip(file);
        alert(`Success! Imported ${count} entries from ZIP archive.`);
      } else if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        const incomingEntries = Array.isArray(data) ? data : (data.entries || []);
        if (incomingEntries.length === 0) throw new Error("No entries found in JSON.");
        await db.entries.bulkPut(incomingEntries);
        alert(`Success! Imported ${incomingEntries.length} legacy entries.`);
      } else {
        throw new Error("Unsupported file type.");
      }
    } catch (err) {
      console.error("Import Error:", err);
      setImportError(err.message);
    } finally {
      setIsImporting(false);
      if (event.target) event.target.value = '';
    }
  };

  // Helper to determine if a route belongs to the "More" tab
  const isMoreRoute = ['more', 'settings', 'about', 'themes'].includes(currentRoute);

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="max-w-xl mx-auto min-h-screen relative pb-16">
        
        {/* IMPORT SPINNER */}
        {isImporting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 animate-slideUp">
              <div className="w-8 h-8 border-4 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin"></div>
              <p className="font-semibold text-gray-700 dark:text-gray-200">Processing backup...</p>
            </div>
          </div>
        )}

        {/* ERROR MODAL */}
        {importError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl max-w-sm w-full animate-slideUp">
              <div className="flex items-center gap-3 text-red-500 mb-2">
                <Trash2 size={24} />
                <h3 className="font-bold text-lg">Import Failed</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{importError}</p>
              <button onClick={() => setImportError(null)} className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-white font-medium py-2 rounded-xl">Close</button>
            </div>
          </div>
        )}

        {/* --- PAGE ROUTING --- */}
        {showFlashback ? (
          <FlashbackPage 
            entries={entries} 
            onBack={() => setShowFlashback(false)} 
            onEdit={(entry) => { setShowFlashback(false); openEditEditor(entry); }}
          />
        ) : (
          <>
            {currentRoute === 'journal' && (
              <JournalList
                entries={entries}
                appName={appName}
                onEdit={openEditEditor}
                onCreate={() => openNewEditor()}
                onAddOld={() => dateInputRef.current?.showPicker()}
                onImport={handleImport}
                onExport={handleExport}
                isOffline={isOffline}
                isImporting={isImporting}
                onOpenFlashback={() => setShowFlashback(true)} 
              />
            )}
            {currentRoute === 'map' && <MapPage entries={entries} onEdit={openEditEditor} />}
            {currentRoute === 'stats' && <StatsPage entries={entries} isDarkMode={isDarkMode} />}
            {currentRoute === 'media' && 
            (<
            MediaGallery entries={entries}
            onEdit={openEditEditor}
             />)}
            
            {/* NEW PAGES */}
            {currentRoute === 'more' && <MoreMenu navigate={navigate} />}
            
            {currentRoute === 'sleep' && <SleepPage navigate={navigate} />}
            {currentRoute === 'whatsapp' && <WhatsAppPage navigate={navigate} />}
            {currentRoute === 'meditation' && <MeditationPage navigate={navigate} />}
            {currentRoute === 'year-review' && <YearInReviewPage navigate={navigate} />}
            
            {/* THEMES PAGE */}
            {currentRoute === 'themes' && (
              <ThemesPage 
                navigate={navigate}
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
                accentColor={accentColor}
                setAccentColor={setAccentColor}
              />
            )}
            
            {currentRoute === 'settings' && (
              <SettingsPage 
                navigate={navigate} 
                appName={appName} 
                setAppName={setAppName} 
                onExport={handleExport} 
                onImport={() => fileInputRef.current?.click()}
                importInputRef={fileInputRef} 
              />
            )}
            {currentRoute === 'about' && <AboutPage navigate={navigate} />}
          </>
        )}

        {/* Hidden Inputs */}
        <input type="date" ref={dateInputRef} onChange={handleDateSelect} className="hidden" />
        <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".zip,.json" />
        
        {isEditorOpen && (
          <Editor
            entry={editingEntry}
            onClose={() => { setIsEditorOpen(false); setEditingEntry(null); }}
            onSave={handleSaveEntry}
            onDelete={handleDeleteEntry}
          />
        )}
      </div>

      {/* --- BOTTOM NAVIGATION --- */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-40 pb-safe transition-colors">
        <div className="max-w-xl mx-auto flex justify-around py-3">
          
          <button onClick={() => { navigate('journal'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${currentRoute === 'journal' && !showFlashback ? 'text-[var(--accent-600)]' : 'text-gray-400 dark:text-gray-500'}`}>
            <Home size={22} strokeWidth={currentRoute === 'journal' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{appName.length > 8 ? 'Journal' : appName}</span>
          </button>
          
          <button onClick={() => { navigate('map'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${currentRoute === 'map' ? 'text-[var(--accent-600)]' : 'text-gray-400 dark:text-gray-500'}`}>
            <MapIcon size={22} strokeWidth={currentRoute === 'map' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Atlas</span>
          </button>

          <button onClick={() => { navigate('stats'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${currentRoute === 'stats' ? 'text-[var(--accent-600)]' : 'text-gray-400 dark:text-gray-500'}`}>
            <BarChart2 size={22} strokeWidth={currentRoute === 'stats' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Stats</span>
          </button>
          
          <button onClick={() => { navigate('media'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${currentRoute === 'media' ? 'text-[var(--accent-600)]' : 'text-gray-400 dark:text-gray-500'}`}>
            <Grid size={22} strokeWidth={currentRoute === 'media' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Media</span>
          </button>

          <button onClick={() => { navigate('more'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${isMoreRoute ? 'text-[var(--accent-600)]' : 'text-gray-400 dark:text-gray-500'}`}>
            <Menu size={22} strokeWidth={isMoreRoute ? 2.5 : 2} />
            <span className="text-[10px] font-medium">More</span>
          </button>

        </div>
      </nav>
    </div>
  );
};

export default App;