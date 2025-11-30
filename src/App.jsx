import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, migrateFromLocalStorage, exportToZip, importFromZip } from './db'; 
import { SleepPage } from './components/SleepPage';
import { WhatsAppPage } from './components/WhatsAppPage';
import MeditationPage from './components/MeditationPage'; // NEW IMPORT
import Editor from './components/Editor';
import JournalList from './components/JournalList';
import StatsPage from './components/StatsPage';
import MediaGallery from './components/MediaGallery';
import FlashbackPage from './components/FlashbackPage';
import MapPage from './components/MapPage';
import { MoreMenu, SettingsPage, AboutPage } from './components/MorePages';

import {
  BarChart2,
  Grid,
  Home,
  Map as MapIcon, 
  Trash2,
  Menu // New Icon for 'More'
} from 'lucide-react';

const App = () => {
  // --- ROUTING LOGIC (REPLACES SIMPLE STATE) ---
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
  const isMoreRoute = ['more', 'settings', 'about'].includes(currentRoute);

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-900">
      <div className="max-w-xl mx-auto min-h-screen relative pb-16">
        
        {/* IMPORT SPINNER */}
        {isImporting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 animate-slideUp">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-semibold text-gray-700">Processing backup...</p>
            </div>
          </div>
        )}

        {/* ERROR MODAL */}
        {importError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-slideUp">
              <div className="flex items-center gap-3 text-red-500 mb-2">
                <Trash2 size={24} />
                <h3 className="font-bold text-lg">Import Failed</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">{importError}</p>
              <button onClick={() => setImportError(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-xl">Close</button>
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
            {currentRoute === 'stats' && <StatsPage entries={entries} />}
            {currentRoute === 'media' && <MediaGallery entries={entries} />}
            
            {/* NEW PAGES */}
            {currentRoute === 'more' && <MoreMenu navigate={navigate} />}
            
            {currentRoute === 'sleep' && <SleepPage navigate={navigate} />}
            {currentRoute === 'whatsapp' && <WhatsAppPage navigate={navigate} />}
            {currentRoute === 'meditation' && <MeditationPage navigate={navigate} />} 
            
            {currentRoute === 'settings' && (
              <SettingsPage 
                navigate={navigate} 
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
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/90 backdrop-blur-md z-40 pb-safe">
        <div className="max-w-xl mx-auto flex justify-around py-3">
          
          <button onClick={() => { navigate('journal'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${currentRoute === 'journal' && !showFlashback ? 'text-blue-600' : 'text-gray-400'}`}>
            <Home size={22} strokeWidth={currentRoute === 'journal' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Journal</span>
          </button>
          
          <button onClick={() => { navigate('map'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${currentRoute === 'map' ? 'text-blue-600' : 'text-gray-400'}`}>
            <MapIcon size={22} strokeWidth={currentRoute === 'map' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Atlas</span>
          </button>

          <button onClick={() => { navigate('stats'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${currentRoute === 'stats' ? 'text-blue-600' : 'text-gray-400'}`}>
            <BarChart2 size={22} strokeWidth={currentRoute === 'stats' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Stats</span>
          </button>
          
          <button onClick={() => { navigate('media'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${currentRoute === 'media' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Grid size={22} strokeWidth={currentRoute === 'media' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Media</span>
          </button>

          {/* NEW MORE TAB */}
          <button onClick={() => { navigate('more'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${isMoreRoute ? 'text-blue-600' : 'text-gray-400'}`}>
            <Menu size={22} strokeWidth={isMoreRoute ? 2.5 : 2} />
            <span className="text-[10px] font-medium">More</span>
          </button>

        </div>
      </nav>
    </div>
  );
};

export default App;