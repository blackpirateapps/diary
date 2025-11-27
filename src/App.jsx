import React, { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import JournalList from './components/JournalList';
import StatsPage from './components/StatsPage';
import MediaGallery from './components/MediaGallery';
import FlashbackPage from './components/FlashbackPage';
import MapPage from './components/MapPage';
import { 
  BarChart2, Grid, Home, Map, 
  Plus, Calendar, MapPin, Image as ImageIcon, 
  X, Hash, ChevronLeft, ChevronRight, Trash2,
  Smile, Frown, Meh, Heart, Sun, CloudRain,
  Search, Clock, Download, Upload, Settings, Cloud,
  WifiOff
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
      // Update existing or add new
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
      // 1. Create a clean backup object
      const backupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        entries: entries // Saves EVERYTHING: images, coords, text, dates
      };

      // 2. Generate file
      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      // 3. Trigger download
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
    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const parsed = JSON.parse(text);
        
        // Support both old array format and new object format
        let incomingEntries = [];
        if (Array.isArray(parsed)) {
          incomingEntries = parsed;
        } else if (parsed.entries && Array.isArray(parsed.entries)) {
          incomingEntries = parsed.entries;
        } else {
          throw new Error("Invalid file format. Could not find entries.");
        }

        // Helper to check for valid date
        const isValidDate = (d) => {
          const date = new Date(d);
          return date instanceof Date && !isNaN(date.getTime());
        };

        // Validate and normalize each entry
        const validEntries = incomingEntries.map(entry => ({
          id: entry.id || crypto.randomUUID(), // Ensure ID exists
          content: entry.content || '',
          // FIX: Strictly validate date. Fallback to NOW if invalid.
          // This prevents the "White Screen" crash on render.
          date: isValidDate(entry.date) ? entry.date : new Date().toISOString(),
          mood: typeof entry.mood === 'number' ? entry.mood : 5,
          // Location Data
          location: entry.location || '',
          locationLat: entry.locationLat || null,
          locationLng: entry.locationLng || null,
          weather: entry.weather || '',
          // Arrays (Default to empty)
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          images: Array.isArray(entry.images) ? entry.images : []
        }));

        if (validEntries.length === 0) {
          alert("No valid entries found in file.");
          return;
        }

        if (window.confirm(`Found ${validEntries.length} entries. Import them? This will merge with your current journal.`)) {
          setEntries(prev => {
            // Merge logic: Create Map by ID to prevent duplicates
            const entryMap = new Map(prev.map(e => [e.id, e]));
            
            validEntries.forEach(e => {
              // Overwrite if exists, add if new
              entryMap.set(e.id, e);
            });

            // Convert back to array and sort by date (newest first)
            return Array.from(entryMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
          });
          alert("Import successful!");
        }

      } catch (err) {
        console.error(err);
        alert(`Import Failed: ${err.message}. Please check if the file is a valid JSON backup.`);
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = ''; // Reset input so same file can be selected again
      }
    };

    reader.onerror = () => {
      alert("Error reading file.");
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-900">
      <div className="max-w-xl mx-auto min-h-screen relative pb-16">
        
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

        {/* HIDDEN INPUTS & MODALS */}
        <input type="date" ref={dateInputRef} onChange={handleDateSelect} className="hidden" />
        
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