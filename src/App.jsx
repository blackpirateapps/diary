import React, { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import JournalList from './components/JournalList';
import StatsPage from './components/StatsPage';
import MediaGallery from './components/MediaGallery';
import { 
  Plus, Calendar, MapPin, Image as ImageIcon, 
  BarChart2, Grid, Home, X, Hash, 
  ChevronLeft, ChevronRight, Trash2,
  Smile, Frown, Meh, Heart, Sun, CloudRain,
  Search, Clock, 
  Download, Upload, Settings, Cloud,
  WifiOff
} from 'lucide-react';


// You can move INITIAL_ENTRIES to its own file if desired
const INITIAL_ENTRIES = [
  {
    id: '1',
    content: 'Found a new spot downtown. The light coming through the window was perfect. Spent an hour reading and sipping a cortado.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    mood: 8,
    location: 'Downtown, Seattle',
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
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isImporting, setIsImporting] = useState(false);

  // Load from localStorage or use initial
  const [entries, setEntries] = useState(() => {
    try {
      const saved = typeof localStorage !== 'undefined'
        ? localStorage.getItem('journal_entries')
        : null;
      return saved ? JSON.parse(saved) : INITIAL_ENTRIES;
    } catch (e) {
      return INITIAL_ENTRIES;
    }
  });

  const dateInputRef = useRef(null);

  // Update offline/online status
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

  // Sync localStorage
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('journal_entries', JSON.stringify(entries));
      }
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert('Storage full! Please delete some entries or images to save new data.');
      }
    }
  }, [entries]);

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

  const handleAddOldEntry = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.();
    }
  };

  const handleDateSelect = (e) => {
    if (e.target.value) {
      const selectedDate = new Date(e.target.value + 'T12:00:00');
      openNewEditor(selectedDate);
    }
    e.target.value = '';
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
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
        const candidateEntries = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.entries)
          ? parsed.entries
          : [];
        const normalized = candidateEntries
          .filter(en => en && (en.id || en.date || en.content))
          .map(en => ({
            id: en.id || Date.now().toString() + Math.random().toString(16).slice(2),
            content: en.content || '',
            date: en.date || new Date().toISOString(),
            mood: typeof en.mood === 'number' ? en.mood : 5,
            location: en.location || '',
            weather: en.weather || '',
            tags: Array.isArray(en.tags) ? en.tags : [],
            images: Array.isArray(en.images) ? en.images : []
          }));
        if (!normalized.length) {
          alert('Import file does not contain valid entries.');
          return;
        }
        setEntries(prev => {
          const byId = new Map();
          [...prev, ...normalized].forEach(en => {
            byId.set(en.id, en);
          });
          return Array.from(byId.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
        });
      } catch (err) {
        alert('Failed to import. Ensure it is a valid JSON export.');
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.onerror = () => {
      alert('Failed to read import file.');
      setIsImporting(false);
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-900">
      <div className="max-w-xl mx-auto min-h-screen relative pb-16">
        {activeTab === 'journal' && (
          <JournalList
            entries={entries}
            onEdit={openEditEditor}
            onCreate={() => openNewEditor()}
            onAddOld={handleAddOldEntry}
            onImport={handleImport}
            onExport={handleExport}
            isOffline={isOffline}
            isImporting={isImporting}
          />
        )}
        {activeTab === 'stats' && <StatsPage entries={entries} />}
        {activeTab === 'media' && <MediaGallery entries={entries} />}
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
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/90 backdrop-blur-md z-40">
  <div className="max-w-xl mx-auto flex justify-around py-2">
    <button
      onClick={() => setActiveTab('journal')}
      className={`flex flex-col items-center text-xs ${activeTab === 'journal' ? 'text-blue-600' : 'text-gray-400'}`}
      aria-label="Journal"
    >
      <Home size={20} />
      <span>Journal</span>
    </button>
    <button
      onClick={() => setActiveTab('stats')}
      className={`flex flex-col items-center text-xs ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400'}`}
      aria-label="Stats"
    >
      <BarChart2 size={20} />
      <span>Stats</span>
    </button>
    <button
      onClick={() => setActiveTab('media')}
      className={`flex flex-col items-center text-xs ${activeTab === 'media' ? 'text-blue-600' : 'text-gray-400'}`}
      aria-label="Media"
    >
      <Grid size={20} />
      <span>Media</span>
    </button>
  </div>
</nav>
    </div>
  );
};

export default App;
