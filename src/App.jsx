import React, { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import JournalList from './components/JournalList';
import StatsPage from './components/StatsPage';
import MediaGallery from './components/MediaGallery';
import FlashbackPage from './components/FlashbackPage';
import MapPage from './components/MapPage';
import { BarChart2, Grid, Home, Map, Plus, Calendar, MapPin, Image as ImageIcon, X, Hash, 
         ChevronLeft, ChevronRight, Trash2, Smile, Frown, Meh, Heart, Sun, CloudRain, 
         Search, Clock, Download, Upload, Settings, Cloud, WifiOff } from 'lucide-react';

const INITIAL_ENTRIES = [
  {
    id: '1',
    content: 'Found a new spot downtown. The light coming through the window was perfect. Spent an hour reading and sipping a cortado.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    mood: 8,
    location: 'Downtown, Seattle',
    locationLat: 47.6062,
    locationLng: -122.3321,
    weather: '18°C',
    tags: ['coffee', 'relaxing'],
    images: ['https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=400']
  },
  {
    id: '2',
    content: 'Heavy rain all day. Good day for coding and lo-fi beats.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    mood: 5,
    location: 'Home Office',
    weather: '12°C',
    tags: ['work', 'rain'],
    images: []
  },
  {
    id: '3',
    content: 'Beat my personal best time today! Felt exhausted but accomplished.',
    date: new Date().toISOString(),
    mood: 10,
    location: 'Central Park',
    locationLat: 40.785091,
    locationLng: -73.968285,
    weather: '24°C',
    tags: ['fitness', 'health'],
    images: [
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&q=80&w=400'
    ]
  }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('journal');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showFlashback, setShowFlashback] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const [entries, setEntries] = useState(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('journal_entries') : null;
      return saved ? JSON.parse(saved) : INITIAL_ENTRIES;
    } catch (e) {
      console.error("Failed to load entries:", e);
      return INITIAL_ENTRIES;
    }
  });

  const dateInputRef = useRef(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('journal_entries', JSON.stringify(entries));
      }
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert('Storage full! Please delete images or entries.');
      }
    }
  }, [entries]);

  // --- ONLINE STATUS ---
  useEffect(() => {
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
  const handleSaveEntry = (entry) => {
    setEntries(prev => {
      if (prev.some(e => e.id === entry.id)) {
        return prev.map(e => (e.id === entry.id ? entry : e));
      }
      return [entry, ...prev];
    });
  };

  const handleDeleteEntry = (id) => {
    if (!id) {
      setIsEditorOpen(false);
      setEditingEntry(null);
      return;
    }
    setEntries(prev => prev.filter(e => e.id !== id));
    setIsEditorOpen(false);
    setEditingEntry(null);
  };

  // --- NAVIGATION & EDITOR ---
  const openNewEditor = (date = new Date()) => {
    const dateStr = date.toDateString();
    const existing = entries.find(e => new Date(e.date).toDateString() === dateStr);
    if (existing) {
      setEditingEntry(existing);
    } else {
      setEditingEntry({ date: date.toISOString() });
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

  // --- IMPORT / EXPORT LOGIC ---
  const handleExport = () => {
    try {
      const backupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        entries: entries
      };
      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blackpirates_journal_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    const reader = new FileReader();
    
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        let parsed;
        
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr) {
          throw new Error("Invalid JSON format. The file might be corrupted.");
        }

        let incomingEntries = [];
        if (Array.isArray(parsed)) {
          incomingEntries = parsed;
        } else if (parsed.entries && Array.isArray(parsed.entries)) {
          incomingEntries = parsed.entries;
        } else {
          throw new Error("Could not find 'entries' array in the file.");
        }

        const validEntries = incomingEntries.map((entry, index) => {
          const id = entry.id || `imported_${Date.now()}_${index}`;
          
          // Strict Date Validation - FIXED
          let date;
          const parsedDate = new Date(entry.date);
          if (!entry.date || isNaN(parsedDate.getTime())) {
            console.warn(`Entry ${id} has invalid date: ${entry.date}. Defaulting to NOW.`);
            date = new Date().toISOString();
          } else {
            date = parsedDate.toISOString(); // Convert valid dates too!
          }

          return {
            id,
            content: entry.content || '',
            date: date,
            mood: typeof entry.mood === 'number' ? entry.mood : 5,
            location: entry.location || '',
            locationLat: entry.locationLat || null,
            locationLng: entry.locationLng || null,
            weather: entry.weather || '',
            tags: Array.isArray(entry.tags) ? entry.tags : [],
            images: Array.isArray(entry.images) ? entry.images : []
          };
        });

        if (validEntries.length === 0) {
          throw new Error("No valid entries found to import.");
        }

        setEntries(prev => {
          const entryMap = new Map(prev.map(e => [e.id, e]));
          validEntries.forEach(e => entryMap.set(e.id, e));
          const newEntries = Array.from(entryMap.values()).sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          return newEntries;
        });

        alert(`Success! Imported ${validEntries.length} entries.`);
        
      } catch (err) {
        console.error("Import Error:", err);
        setImportError(err.message);
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = '';
      }
    };

    reader.onerror = () => {
      setImportError("Failed to read the file from disk.");
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {isOffline && (
        <div className="bg-amber-600/20 border-b border-amber-600/30 px-4 py-2 flex items-center gap-2 text-amber-400 text-sm">
          <WifiOff size={16} />
          <span>You're offline. Changes will sync when reconnected.</span>
        </div>
      )}

      {/* Import Status Messages */}
      {isImporting && (
        <div className="bg-blue-600/20 border-b border-blue-600/30 px-4 py-2 flex items-center gap-2 text-blue-400 text-sm">
          <Cloud size={16} className="animate-pulse" />
          <span>Processing backup file...</span>
        </div>
      )}

      {importError && (
        <div className="bg-red-600/20 border-b border-red-600/30 px-4 py-2 flex items-center gap-2 text-red-400 text-sm">
          <X size={16} />
          <span>{importError}</span>
          <button 
            onClick={() => setImportError(null)}
            className="ml-auto hover:bg-red-600/30 p-1 rounded"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Black Pirates Journal</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{entries.length} total entries</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Export Backup"
          >
            <Download size={20} />
          </button>
          
          <label className="p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer" title="Import Backup">
            <Upload size={20} />
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          <button
            onClick={() => dateInputRef.current?.showPicker()}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Pick a Date"
          >
            <Calendar size={20} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            onChange={handleDateSelect}
            className="hidden"
          />

          <button
            onClick={() => openNewEditor()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">New Entry</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'journal' && (
          <JournalList 
            entries={entries}
            onEdit={openEditEditor}
            onDelete={handleDeleteEntry}
          />
        )}
        {activeTab === 'stats' && <StatsPage entries={entries} />}
        {activeTab === 'gallery' && <MediaGallery entries={entries} />}
        {activeTab === 'map' && <MapPage entries={entries} />}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-zinc-800 px-4 py-3 flex justify-around">
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'journal' ? 'bg-zinc-800 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Home size={20} />
          <span className="text-xs">Journal</span>
        </button>
        
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'stats' ? 'bg-zinc-800 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BarChart2 size={20} />
          <span className="text-xs">Stats</span>
        </button>
        
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'gallery' ? 'bg-zinc-800 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Grid size={20} />
          <span className="text-xs">Gallery</span>
        </button>
        
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'map' ? 'bg-zinc-800 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Map size={20} />
          <span className="text-xs">Map</span>
        </button>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <Editor
          entry={editingEntry}
          onSave={handleSaveEntry}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingEntry(null);
          }}
          onDelete={handleDeleteEntry}
        />
      )}
    </div>
  );
};

export default App;