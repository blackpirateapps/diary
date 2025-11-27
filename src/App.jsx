import React, { useState, useEffect, useRef } from 'react';
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
  Map,
  Trash2,
} from 'lucide-react';

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

  // Load from localStorage
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
  const fileInputRef = useRef(null);

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

  // --- EXPORT LOGIC ---
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

  // --- IMPORT LOGIC ---
  const handleImport = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        const text = ev.target && ev.target.result;
        if (typeof text !== 'string') {
          throw new Error("Could not read file contents.");
        }

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr) {
          throw new Error("Invalid JSON format. The file might be corrupted.");
        }
        
        let incomingEntries = [];
        // Support both old backups (plain array) and new backups ({ entries: [...] })
        if (Array.isArray(parsed)) {
          incomingEntries = parsed;
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.entries)) {
          incomingEntries = parsed.entries;
        } else {
          throw new Error("Could not find 'entries' array in the file.");
        }

        const validEntries = incomingEntries.map((entry, index) => {
          // Normalize ID
          const id = entry.id || `imported_${Date.now()}_${index}`;
          
          // Strict Date Validation
          let date = entry.date;
          const parsedDate = new Date(date);
          if (!date || isNaN(parsedDate.getTime())) {
            console.warn(`Entry ${id} has invalid date: ${date}. Defaulting to NOW.`);
            date = new Date().toISOString();
          }

          return {
            id,
            content: entry.content || '',
            date: date,
            mood: typeof entry.mood === 'number' ? entry.mood : 5,
            location: entry.location || '',
            locationLat: entry.locationLat != null ? entry.locationLat : null,
            locationLng: entry.locationLng != null ? entry.locationLng : null,
            weather: entry.weather || '',
            tags: Array.isArray(entry.tags) ? entry.tags : [],
            images: Array.isArray(entry.images) ? entry.images : []
          };
        });

        if (validEntries.length === 0) {
          throw new Error("No valid entries found to import.");
        }

        // Merge and sort entries
        setEntries(prev => {
          const entryMap = new Map(prev.map(e => [e.id, e]));
          validEntries.forEach(e => entryMap.set(e.id, e));
          const newEntries = Array.from(entryMap.values()).sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          return [...newEntries];
        });

        alert(`Success! Imported ${validEntries.length} entries.`);

      } catch (err) {
        console.error("Import Error:", err);
        setImportError(err.message || "Unknown import error.");
      } finally {
        setIsImporting(false);
        // Clear the file input so the same file can be selected again
        if (event.target) {
          event.target.value = '';
        }
      }
    };

    reader.onerror = () => {
      setImportError("Failed to read the file from disk.");
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-900">
      <div className="max-w-xl mx-auto min-h-screen relative pb-16">
        
        {/* IMPORT LOADING OVERLAY */}
        {isImporting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 animate-slideUp">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-semibold text-gray-700">Processing backup file...</p>
            </div>
          </div>
        )}

        {/* IMPORT ERROR OVERLAY */}
        {importError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-slideUp">
              <div className="flex items-center gap-3 text-red-500 mb-2">
                <Trash2 size={24} />
                <h3 className="font-bold text-lg">Import Failed</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">{importError}</p>
              <button 
                onClick={() => setImportError(null)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* CONDITIONAL ROUTING */}
        {showFlashback ? (
          <FlashbackPage 
            entries={entries} 
            onBack={() => setShowFlashback(false)} 
            onEdit={(entry) => {
              setShowFlashback(false);
              openEditEditor(entry);
            }}
          />
        ) : (
          <>
            {activeTab === 'journal' && (
              <JournalList
                entries={entries}
                onEdit={openEditEditor}
                onCreate={() => openNewEditor()}
                onAddOld={() => dateInputRef.current && dateInputRef.current.showPicker && dateInputRef.current.showPicker()}
                onImport={() => fileInputRef.current && fileInputRef.current.click()}
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

        {/* HIDDEN INPUTS & MODALS */}
        <input
          type="date"
          ref={dateInputRef}
          onChange={handleDateSelect}
          className="hidden"
        />

        <input
          type="file"
          accept="application/json,.json"
          ref={fileInputRef}
          onChange={handleImport}
          className="hidden"
        />
        
        {isEditorOpen && (
          <Editor
            entry={editingEntry}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingEntry(null);
            }}
            onSave={handleSaveEntry}
            onDelete={handleDeleteEntry}
          />
        )}
      </div>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/90 backdrop-blur-md z-40 pb-safe">
        <div className="max-w-xl mx-auto flex justify-around py-3">
          <button
            onClick={() => { setActiveTab('journal'); setShowFlashback(false); }}
            className={`flex flex-col items-center gap-0.5 ${activeTab === 'journal' && !showFlashback ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Home size={22} strokeWidth={activeTab === 'journal' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Journal</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('map'); setShowFlashback(false); }}
            className={`flex flex-col items-center gap-0.5 ${activeTab === 'map' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Map size={22} strokeWidth={activeTab === 'map' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Atlas</span>
          </button>

          <button
            onClick={() => { setActiveTab('stats'); setShowFlashback(false); }}
            className={`flex flex-col items-center gap-0.5 ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <BarChart2 size={22} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Stats</span>
          </button>

          <button
            onClick={() => { setActiveTab('media'); setShowFlashback(false); }}
            className={`flex flex-col items-center gap-0.5 ${activeTab === 'media' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Grid size={22} strokeWidth={activeTab === 'media' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Media</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;