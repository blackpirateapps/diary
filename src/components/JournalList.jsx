import React, { useState, useRef } from 'react';
import { 
  Plus, Calendar, MapPin, Image as ImageIcon, 
  BarChart2, Grid, Home, X, Hash, 
  ChevronLeft, ChevronRight, Trash2,
  Smile, Frown, Meh, Heart, Sun, CloudRain,
  Search, Clock, 
  Download, Upload, Settings, Cloud,
  WifiOff
} from 'lucide-react';
import MoodPopup from './MoodPopup';
const MOODS = [
  { value: 1, icon: CloudRain, color: 'text-gray-400', label: 'Awful' },
  { value: 2, icon: CloudRain, color: 'text-blue-400', label: 'Bad' },
  { value: 3, icon: Frown, color: 'text-blue-500', label: 'Sad' },
  { value: 4, icon: Meh, color: 'text-indigo-400', label: 'Meh' },
  { value: 5, icon: Meh, color: 'text-indigo-500', label: 'Okay' },
  { value: 6, icon: Sun, color: 'text-yellow-500', label: 'Good' },
  { value: 7, icon: Sun, color: 'text-orange-500', label: 'Great' },
  { value: 8, icon: Smile, color: 'text-orange-600', label: 'Happy' },
  { value: 9, icon: Heart, color: 'text-pink-500', label: 'Loved' },
  { value: 10, icon: Heart, color: 'text-red-500', label: 'Amazing' },
];


const JournalList = ({
  entries,
  onEdit,
  onCreate,
  onAddOld,
  onImport,
  onExport,
  isOffline,
  isImporting
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const importInputRef = useRef(null);

  const filteredEntries = entries
    .filter(entry =>
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.location && entry.location.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6 pb-24">
      <header className="px-6 pt-6 pb-2 sticky top-0 bg-[#F8F9FA]/90 backdrop-blur-md z-10">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight truncate">BlackPirate&apos;s Journal</h1>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
              Capture your life.
              {isOffline && (
                <span className="flex items-center gap-1 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                  <WifiOff size={10} /> Offline
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-shrink-0">
            <button onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-500 shadow-sm'}`}>
              <Search size={20} />
            </button>
            <button onClick={onAddOld}
              className="p-2 bg-white text-gray-500 shadow-sm rounded-full hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Add Past Entry">
              <Calendar size={20} />
            </button>
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 bg-white text-gray-500 shadow-sm rounded-full hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Settings size={20} />
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-32 z-30 flex flex-col gap-1 animate-slideUp">
                    <button onClick={() => { onExport(); setIsMenuOpen(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg w-full text-left">
                      <Download size={14} /> Export
                    </button>
                    <button onClick={() => { importInputRef.current.click(); setIsMenuOpen(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg w-full text-left">
                      <Upload size={14} /> Import
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={onCreate}
              className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-full shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center gap-1 text-sm ml-1">
              <Plus size={16} /> New
            </button>
          </div>
        </div>
        <input ref={importInputRef} type="file" className="hidden" accept=".json" onChange={onImport} />
        {isSearchOpen && (
          <div className="mt-4 animate-slideUp">
            <input type="text" placeholder="Search memories..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border-none shadow-sm rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20"
              autoFocus />
          </div>
        )}
      </header>
      {isImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white p-5 rounded-2xl shadow-xl flex items-center gap-4 animate-slideUp">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium text-gray-700">Importing memories...</span>
          </div>
        </div>
      )}
      <div className="px-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>{searchTerm ? 'No matching entries.' : 'No entries yet. Tap + to start.'}</p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const dateObj = new Date(entry.date);
            const mainDate = dateObj.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
            const yearTime =
              dateObj.toLocaleDateString(undefined, { year: 'numeric' }) +
              ' • ' +
              dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={entry.id}
                onClick={() => onEdit(entry)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform duration-200 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{mainDate}</span>
                    <span className="text-xs text-gray-400 font-medium">{yearTime}</span>
                  </div>
                 {entry.mood && (() => {
  const moodMeta = MOODS.find(m => m.value === entry.mood);
  if (!moodMeta) return null;
  const Icon = moodMeta.icon;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 ${moodMeta.color}`}>
      <Icon size={18} />
    </div>
  );
})()}

                </div>
                <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mt-2 font-serif">{entry.content}</p>
                {(entry.tags?.length > 0 || entry.location || entry.weather) && (
                  <div className="mt-3 flex items-center gap-3 overflow-hidden text-gray-400">
                    {entry.location && (
                      <div className="flex items-center text-xs bg-gray-50 px-2 py-1 rounded-md">
                        <span className="truncate max-w-[100px]">{entry.location}</span>
                      </div>
                    )}
                    {entry.weather && (
                      <div className="flex items-center text-xs bg-gray-50 px-2 py-1 rounded-md">
                        <span>{entry.weather}</span>
                      </div>
                    )}
                    {entry.tags?.length > 0 && (
                      <div className="flex items-center text-xs">
                        <span className="truncate">{entry.tags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
                {entry.images && entry.images.length > 0 && (
                  <div className="mt-3 h-24 w-full rounded-xl overflow-hidden relative">
                    <img
                      src={entry.images[0]}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      alt="Cover"
                    />
                    {entry.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                        +{entry.images.length - 1}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default JournalList;
