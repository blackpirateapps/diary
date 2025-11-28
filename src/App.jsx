import React, { useState, useEffect, useRef } from 'react';
// --- NEW IMPORTS ---
import { useLiveQuery } from 'dexie-react-hooks';
import { db, migrateFromLocalStorage, exportToZip, importFromZip } from './db'; 

import Editor from './components/Editor';
import JournalList from './components/JournalList';
import StatsPage from './components/StatsPage';
import MediaGallery from './components/MediaGallery';
import FlashbackPage from './components/FlashbackPage';
import MapPage from './components/MapPage';
import {
  BarChart2,
  Grid,
  Home,
  Map as MapIcon, 
  Trash2,
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('journal');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showFlashback, setShowFlashback] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  // --- REPLACED LOCALSTORAGE STATE WITH DEXIE QUERY ---
  // This automatically updates the UI whenever the database changes
  const entries = useLiveQuery(
    () => db.entries.orderBy('date').reverse().toArray(), 
    []
  ) || [];

  const dateInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- INIT & MIGRATION ---
  useEffect(() => {
    // 1. Migrate old localStorage data if it exists
    migrateFromLocalStorage();

    // 2. Network Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- CRUD OPERATIONS (Updated for Dexie) ---
  const handleSaveEntry = async (entry) => {
    try {
      // .put works for both insert (if id is new) and update (if id exists)
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

  // --- NAVIGATION & EDITOR ---
  const openNewEditor = (date = new Date()) => {
    const dateStr = date.toDateString();
    // Logic remains same, but we search the live array
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

  // --- EXPORT LOGIC (Now uses ZIP) ---
  const handleExport = async () => {
    try {
      await exportToZip(); // Calls logic in db.js
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  };

  // --- IMPORT LOGIC (Handles ZIP & Legacy JSON) ---
  const handleImport = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      // 1. Handle New ZIP Backups
      if (file.name.toLowerCase().endsWith('.zip')) {
        const count = await importFromZip(file);
        alert(`Success! Imported ${count} entries from ZIP archive.`);
      } 
      // 2. Handle Legacy JSON Backups
      else if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch(e) { throw new Error("Invalid JSON file"); }

        // Normalize structure (some exports are array, some are object with 'entries')
        const incomingEntries = Array.isArray(data) ? data : (data.entries || []);
        
        if (incomingEntries.length === 0) throw new Error("No entries found in JSON.");

        // Bulk insert into IndexedDB
        // Note: Dexie handles Base64 strings in the 'images' array perfectly fine
        await db.entries.bulkPut(incomingEntries);
        alert(`Success! Imported ${incomingEntries.length} legacy entries.`);
      } 
      else {
        throw new Error("Unsupported file type. Please upload a .zip or .json file.");
      }
    } catch (err) {
      console.error("Import Error:", err);
      setImportError(err.message);
    } finally {
      setIsImporting(false);
      if (event.target) event.target.value = '';
    }
  };

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

        {showFlashback ? (
          <FlashbackPage 
            entries={entries} 
            onBack={() => setShowFlashback(false)} 
            onEdit={(entry) => { setShowFlashback(false); openEditEditor(entry); }}
          />
        ) : (
          <>
            {activeTab === 'journal' && (
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
            {activeTab === 'map' && <MapPage entries={entries} onEdit={openEditEditor} />}
            {activeTab === 'stats' && <StatsPage entries={entries} />}
            {activeTab === 'media' && <MediaGallery entries={entries} />}
          </>
        )}

        {/* Note: accept attribute now allows both formats */}
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

      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/90 backdrop-blur-md z-40 pb-safe">
        <div className="max-w-xl mx-auto flex justify-around py-3">
          <button onClick={() => { setActiveTab('journal'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${activeTab === 'journal' && !showFlashback ? 'text-blue-600' : 'text-gray-400'}`}>
            <Home size={22} strokeWidth={activeTab === 'journal' ? 2.5 : 2} /><span className="text-[10px] font-medium">Journal</span>
          </button>
          
          <button onClick={() => { setActiveTab('map'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${activeTab === 'map' ? 'text-blue-600' : 'text-gray-400'}`}>
            <MapIcon size={22} strokeWidth={activeTab === 'map' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Atlas</span>
          </button>

          <button onClick={() => { setActiveTab('stats'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400'}`}>
            <BarChart2 size={22} strokeWidth={activeTab === 'stats' ? 2.5 : 2} /><span className="text-[10px] font-medium">Stats</span>
          </button>
          <button onClick={() => { setActiveTab('media'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${activeTab === 'media' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Grid size={22} strokeWidth={activeTab === 'media' ? 2.5 : 2} /><span className="text-[10px] font-medium">Media</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;