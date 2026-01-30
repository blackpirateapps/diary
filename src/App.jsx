import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, migrateFromLocalStorage, exportToZip, importFromZip } from './db'; 
import {
  BarChart2, Grid, Home, Map as MapIcon, Menu,
  Settings, Book, Moon, MessageCircle, Coffee, Calendar,
  History, Users, Loader2, PanelLeft
} from 'lucide-react'; 

// --- LAZY LOAD IMPORTS ---
const MeditationPage = lazy(() => import('./components/MeditationPage'));
const YearInReviewPage = lazy(() => import('./components/YearInReviewPage'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const Editor = lazy(() => import('./components/editor/Editor'));
const JournalList = lazy(() => import('./components/JournalList'));
const StatsPage = lazy(() => import('./components/StatsPage'));
const MediaGallery = lazy(() => import('./components/MediaGallery'));
const FlashbackPage = lazy(() => import('./components/FlashbackPage'));
const MapPage = lazy(() => import('./components/MapPage'));
const TravelRoute = lazy(() => import('./components/TravelRoute'));

// Lazy load named exports
const SleepPage = lazy(() => import('./components/SleepPage').then(module => ({ default: module.SleepPage })));
const WhatsAppPage = lazy(() => import('./components/WhatsAppPage').then(module => ({ default: module.WhatsAppPage })));
const PeoplePage = lazy(() => import('./components/people/PeoplePage').then(module => ({ default: module.PeoplePage })));

// More Menu Pages
const MoreMenu = lazy(() => import('./components/MorePages').then(module => ({ default: module.MoreMenu })));
const SettingsPage = lazy(() => import('./components/MorePages').then(module => ({ default: module.SettingsPage })));
const AboutPage = lazy(() => import('./components/MorePages').then(module => ({ default: module.AboutPage })));
const ThemesPage = lazy(() => import('./components/MorePages').then(module => ({ default: module.ThemesPage })));

// --- THEME CONSTANTS ---
const ACCENT_COLORS = {
  blue:   { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 500: '#3b82f6', 600: '#2563eb' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 500: '#8b5cf6', 600: '#7c3aed' },
  emerald:{ 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 500: '#10b981', 600: '#059669' },
  amber:  { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 500: '#f59e0b', 600: '#d97706' },
  rose:   { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 500: '#f43f5e', 600: '#e11d48' },
};

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
    <Loader2 size={32} className="animate-spin mb-2 text-[var(--accent-500)]" />
    <p className="text-sm font-medium">Loading component...</p>
  </div>
);

const App = () => {
  const [appName, setAppName] = useState(() => localStorage.getItem('app_name') || 'Journal');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app_theme') === 'dark');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('app_accent') || 'blue');
  // Sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 

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
  const [currentEntryId, setCurrentEntryId] = useState(null);
  const [showFlashback, setShowFlashback] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
const [newEntryDate, setNewEntryDate] = useState(null);
  const entries = useLiveQuery(() => db.entries.orderBy('date').reverse().toArray());

  const dateInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- THEME & INIT EFFECT ---
  useEffect(() => {
    const root = document.documentElement;
    const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;

    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('app_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('app_theme', 'light');
    }

    root.style.setProperty('--accent-50', colors[50]);
    root.style.setProperty('--accent-100', colors[100]);
    root.style.setProperty('--accent-200', colors[200]);
    root.style.setProperty('--accent-500', colors[500]);
    root.style.setProperty('--accent-600', colors[600]);
    
    localStorage.setItem('app_accent', accentColor);
    
    migrateFromLocalStorage();
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isDarkMode, accentColor]);

  // --- ACTIONS ---
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
      navigate('journal');
      return;
    }
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await db.entries.delete(id);
        navigate('journal');
      } catch (error) {
        console.error("Failed to delete:", error);
      }
    }
  };

  // Replace your existing openNewEditor function with this:
const openNewEditor = (date = new Date()) => {
  const dateStr = date.toDateString();
  const existing = entries?.find(e => new Date(e.date).toDateString() === dateStr);
  
  if (existing) {
    setCurrentEntryId(existing.id);
    setNewEntryDate(null); // Clear it if editing existing
    navigate('editor');
  } else {
    setCurrentEntryId(null);
    setNewEntryDate(date); // <--- STORE THE CHOSEN DATE
    navigate('editor');
  }
};

  const openEditEditor = (entry) => {
    setCurrentEntryId(entry.id);
    navigate('editor');
  };

  const handleDateSelect = (e) => {
    if (e.target.value) {
      const selectedDate = new Date(e.target.value + 'T12:00:00');
      openNewEditor(selectedDate);
    }
    e.target.value = '';
  };

  const handleExport = async () => {
    try {
      await exportToZip(true);
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
        alert(`Success! Imported ${count} entries.`);
      } else {
        throw new Error("Please upload a .zip backup file.");
      }
    } catch (err) {
      console.error("Import Error:", err);
      setImportError(err.message);
    } finally {
      setIsImporting(false);
      if (event.target) event.target.value = '';
    }
  };

  const isMoreRoute = ['more', 'settings', 'about', 'themes', 'privacy'].includes(currentRoute);
  const isMoreMenuRoute = ['more', 'about', 'themes', 'privacy'].includes(currentRoute);

  const SidebarItem = ({ route, icon: Icon, label, activeCheck, onClick }) => (
    <button
      onClick={() => { 
        if(onClick) onClick();
        else {
          navigate(route); 
          setShowFlashback(false); 
        }
      }}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeCheck 
          ? 'bg-[var(--accent-100)] text-[var(--accent-700)] dark:bg-[var(--accent-900)] dark:text-[var(--accent-300)]' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 flex">
      
      {/* SIDEBAR */}
      <aside 
        className={`fixed h-full bg-[#f8f9fa] dark:bg-gray-900 z-50 transition-all duration-300 ease-in-out overflow-hidden
                   ${isSidebarOpen ? 'w-64 translate-x-0 p-4 border-r border-gray-200 dark:border-gray-800' : 'w-0 -translate-x-full p-0 border-transparent pointer-events-none'} 
                   hidden md:flex flex-col`}
      >
        <div className="mb-6 px-2 flex items-center justify-between">
           <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              <Book className="text-[var(--accent-500)]" size={24} />
              {appName}
           </h1>
           <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Collapse Sidebar"
            >
                <PanelLeft size={20} />
            </button>
        </div>
        <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
          <div className="pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Journal</div>
          <SidebarItem route="journal" icon={Home} label="Entries" activeCheck={currentRoute === 'journal'} />
          <SidebarItem route="map" icon={MapIcon} label="Atlas" activeCheck={currentRoute === 'map'} />
          
          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Memories</div>
          <SidebarItem route="flashback" icon={History} label="On This Day" activeCheck={currentRoute === 'flashback'} />
          <SidebarItem route="media" icon={Grid} label="Media Gallery" activeCheck={currentRoute === 'media'} />
          
          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Insights</div>
          <SidebarItem route="stats" icon={BarChart2} label="Analytics" activeCheck={currentRoute === 'stats'} />
          <SidebarItem route="whatsapp" icon={MessageCircle} label="Chat Analytics" activeCheck={currentRoute === 'whatsapp'} />

          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Wellbeing</div>
          <SidebarItem route="people" icon={Users} label="People" activeCheck={currentRoute === 'people'} />
          <SidebarItem route="sleep" icon={Moon} label="Sleep Insights" activeCheck={currentRoute === 'sleep'} />
          <SidebarItem route="meditation" icon={Coffee} label="Meditation" activeCheck={currentRoute === 'meditation'} />
          <SidebarItem route="year-review" icon={Calendar} label="Year in Review" activeCheck={currentRoute === 'year-review'} />
        </nav>
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
           <SidebarItem route="more" icon={Menu} label="More" activeCheck={isMoreMenuRoute} />
           <SidebarItem route="settings" icon={Settings} label="Settings" activeCheck={currentRoute === 'settings'} />
        </div>
      </aside>

      {/* CONTENT AREA */}
      <div 
        className={`flex-1 w-full min-h-screen transition-all duration-300 ease-in-out
                    ${isSidebarOpen ? 'md:pl-64' : 'md:pl-0'}`} 
      >
         {/* Sidebar Toggle Button */}
        {!isSidebarOpen && (
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="fixed top-4 left-4 z-50 p-2 rounded-full bg-[var(--accent-500)] text-white shadow-lg hover:bg-[var(--accent-600)] transition-colors hidden md:block"
                title="Open Sidebar"
            >
                <PanelLeft size={24} />
            </button>
        )}
        
        <div className="md:max-w-full mx-auto pb-20 md:pb-8 min-h-screen"> 
          
          {isImporting && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 animate-slideUp">
                <Loader2 size={32} className="animate-spin text-[var(--accent-500)]" />
                <p className="font-semibold text-gray-700 dark:text-gray-200">Processing backup...</p>
              </div>
            </div>
          )}

          <Suspense fallback={<PageLoader />}>
            {currentRoute === 'editor' ? (
              <Editor
                entry={entries?.find(e => e.id === currentEntryId)}
                initialDate={newEntryDate}
                onClose={() => navigate('journal')}
                onSave={handleSaveEntry}
                onDelete={handleDeleteEntry}
                isSidebarOpen={isSidebarOpen} // <--- Added Prop
              />
            ) : showFlashback || currentRoute === 'flashback' ? (
              <FlashbackPage 
                entries={entries || []} 
                onBack={() => { setShowFlashback(false); if(currentRoute === 'flashback') navigate('journal'); }} 
                onEdit={(entry) => { setShowFlashback(false); openEditEditor(entry); }}
              />
            ) : (
              <>
                {(currentRoute === 'journal' || currentRoute === 'calendar' || currentRoute === 'tags') && (
                  <JournalList
                    entries={entries || []}
                    appName={appName}
                    onEdit={openEditEditor}
                    onCreate={() => openNewEditor()}
                    onAddOld={() => dateInputRef.current?.showPicker()}
                    onImport={handleImport}
                    onExport={handleExport}
                    isOffline={isOffline}
                    onOpenFlashback={() => setShowFlashback(true)}
                    initialView={currentRoute === 'calendar' ? 'calendar' : 'list'}
                  />
                )}
                {currentRoute === 'map' && <MapPage entries={entries || []} onEdit={openEditEditor} />}
                {currentRoute === 'stats' && <StatsPage entries={entries || []} isDarkMode={isDarkMode} navigate={navigate} />}
                {currentRoute === 'media' && <MediaGallery entries={entries || []} onEdit={openEditEditor} />}
                
                {currentRoute === 'more' && <MoreMenu navigate={navigate} />}
                {currentRoute === 'travel-route' && <TravelRoute navigate={navigate} />}
                {currentRoute === 'sleep' && <SleepPage navigate={navigate} />}
                {currentRoute === 'whatsapp' && <WhatsAppPage navigate={navigate} />}
                {currentRoute === 'meditation' && <MeditationPage navigate={navigate} />}
                {currentRoute === 'people' && <PeoplePage navigate={navigate} onEdit={openEditEditor} />}
                {currentRoute === 'year-review' && <YearInReviewPage navigate={navigate} />}
                {currentRoute === 'privacy' && <PrivacyPolicy navigate={navigate} />}
                
                {currentRoute === 'themes' && (
                  <ThemesPage navigate={navigate} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} accentColor={accentColor} setAccentColor={setAccentColor} />
                )}
                {currentRoute === 'settings' && (
                  <SettingsPage navigate={navigate} appName={appName} setAppName={setAppName} onExport={handleExport} onImport={() => fileInputRef.current?.click()} importInputRef={fileInputRef} />
                )}
                {currentRoute === 'about' && <AboutPage navigate={navigate} />}
              </>
            )}
          </Suspense>

          <input type="date" ref={dateInputRef} onChange={handleDateSelect} className="hidden" />
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".zip" />
        </div>
      </div>

      {/* MOBILE NAV (Unchanged) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-40 pb-safe transition-colors">
        <div className="max-w-xl mx-auto flex justify-around py-3">
          <button onClick={() => { navigate('journal'); setShowFlashback(false); }} className={`flex flex-col items-center gap-0.5 ${currentRoute === 'journal' && !showFlashback ? 'text-[var(--accent-600)]' : 'text-gray-400 dark:text-gray-500'}`}>
            <Home size={22} strokeWidth={currentRoute === 'journal' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Home</span>
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
