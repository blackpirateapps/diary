
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Settings, Info, Download, Upload, 
  ChevronRight, Github, Mail, Moon, MessageCircle, Flower2, 
  BookOpen, Palette, Check, Type, Sliders, Monitor
} from 'lucide-react';
import CloudBackup from './CloudBackup';
// --- SHARED HEADER COMPONENT ---
const PageHeader = ({ title, onBack }) => (
  <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 dark:bg-gray-950/95 backdrop-blur-md z-20 border-b border-gray-200/50 dark:border-gray-800/50 flex items-center gap-3 transition-colors">
    {onBack && (
      <button onClick={onBack} className="p-2 -ml-2 text-[var(--accent-500)] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
        <ChevronLeft size={24} />
      </button>
    )}
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
  </div>
);

// --- MENU ITEM HELPER ---
const MenuItem = ({ icon: Icon, label, onClick, isDestructive }) => (
  <button 
    onClick={onClick}
    className="w-full bg-white dark:bg-gray-900 p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors active:scale-[0.99]"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-600)] dark:text-[var(--accent-500)]'}`}>
        <Icon size={20} />
      </div>
      <span className={`font-medium ${isDestructive ? 'text-red-600' : 'text-gray-700 dark:text-gray-200'}`}>{label}</span>
    </div>
    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
  </button>
);

// --- PAGE: MORE MENU ---
export const MoreMenu = ({ navigate }) => {
  return (
    <div className="pb-24">
      <PageHeader title="More" />
      <div className="p-4 space-y-6">
        
        {/* Tools */}
        <div>
           <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 ml-2">Tools</h3>
           <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
             <MenuItem icon={Moon} label="Sleep Insights" onClick={() => navigate('sleep')} />
             <MenuItem icon={Flower2} label="Meditation" onClick={() => navigate('meditation')} />
             <MenuItem icon={BookOpen} label="Year in Review (PDF)" onClick={() => navigate('year-review')} />
             <MenuItem icon={MessageCircle} label="Chat Analytics" onClick={() => navigate('whatsapp')} />
           </div>
        </div>
        
        {/* Settings */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
          <MenuItem icon={Palette} label="Appearance" onClick={() => navigate('themes')} />
          <MenuItem icon={Settings} label="Settings" onClick={() => navigate('settings')} />
          <MenuItem icon={Info} label="About" onClick={() => navigate('about')} />
        </div>

        <p className="text-center text-xs text-gray-400 font-medium mt-8">
          Journal App v1.0.0
        </p>
      </div>
    </div>
  );
};

// --- PAGE: THEMES ---
export const ThemesPage = ({ navigate, isDarkMode, setIsDarkMode, accentColor, setAccentColor }) => {
  const colors = [
    { id: 'blue', color: '#3b82f6', label: 'Ocean' },
    { id: 'violet', color: '#8b5cf6', label: 'Royal' },
    { id: 'emerald', color: '#10b981', label: 'Nature' },
    { id: 'amber', color: '#f59e0b', label: 'Sunset' },
    { id: 'rose', color: '#f43f5e', label: 'Love' },
  ];

  return (
    <div className="pb-24 animate-slideUp">
      <PageHeader title="Appearance" onBack={() => navigate('more')} />
      
      <div className="p-4 space-y-8">
        
        {/* Dark Mode Toggle */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 flex items-center justify-between border border-gray-100 dark:border-gray-800 shadow-sm">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
               <Moon size={20} />
             </div>
             <div>
               <h3 className="font-medium text-gray-900 dark:text-white">Dark Mode</h3>
               <p className="text-xs text-gray-500 dark:text-gray-400">Easier on the eyes at night</p>
             </div>
           </div>
           
           <button 
             onClick={() => setIsDarkMode(!isDarkMode)}
             className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-[var(--accent-500)]' : 'bg-gray-300'}`}
           >
             <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
           </button>
        </div>

        {/* Accent Color Selection */}
        <div>
           <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 ml-2">Accent Color</h3>
           <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm grid grid-cols-1 gap-2">
              {colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setAccentColor(c.id)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: c.color }} />
                    <span className="font-medium text-gray-700 dark:text-gray-200">{c.label}</span>
                  </div>
                  {accentColor === c.id && <Check size={20} className="text-[var(--accent-500)]" />}
                </button>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};

// --- PAGE: SETTINGS ---
export const SettingsPage = ({ navigate, appName, setAppName, onExport, onImport, importInputRef }) => {
  // State for Zen Mode settings
  const [zenSettings, setZenSettings] = useState(() => {
    const saved = localStorage.getItem('zen_settings');
    return saved ? JSON.parse(saved) : {
      fontFamily: 'Inter',
      googleFontUrl: '',
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 1.6
    };
  });

  // Save Zen settings whenever they change
  useEffect(() => {
    localStorage.setItem('zen_settings', JSON.stringify(zenSettings));
    // Trigger a custom event so App.jsx or Editor can react immediately
    window.dispatchEvent(new Event('zen-settings-changed'));
  }, [zenSettings]);

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setAppName(newName);
    localStorage.setItem('app_name', newName);
  };

  const handleZenChange = (key, value) => {
    setZenSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="pb-24 animate-slideUp">
      <PageHeader title="Settings" onBack={() => navigate('more')} />
      
      <div className="p-4 space-y-8">
        {/* PERSONALIZATION */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 ml-2">General</h3>
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-600)] dark:text-[var(--accent-500)] rounded-lg">
                 <Settings size={20} />
               </div>
               <span className="font-medium text-gray-700 dark:text-gray-200">Journal Name</span>
            </div>
            <input 
              type="text" 
              value={appName}
              onChange={handleNameChange}
              placeholder="e.g. My Life"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]/20 focus:border-[var(--accent-500)] transition-all dark:text-white"
            />
          </div>
        </div>

        {/* ZEN MODE CONFIGURATION */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 ml-2">Zen Mode</h3>
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-4">
            
            {/* Font Family */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Type size={16} className="text-gray-400" />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Font Family</label>
              </div>
              <input 
                type="text" 
                value={zenSettings.fontFamily}
                onChange={(e) => handleZenChange('fontFamily', e.target.value)}
                placeholder="e.g. Inter, Times New Roman"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-500)] dark:text-white mb-2"
              />
              <input 
                type="text" 
                value={zenSettings.googleFontUrl}
                onChange={(e) => handleZenChange('googleFontUrl', e.target.value)}
                placeholder="Google Fonts URL (e.g. https://fonts.googleapis.com...)"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-500)] dark:text-white"
              />
              <p className="text-[10px] text-gray-400 mt-1">Paste a URL from Google Fonts to load it.</p>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                   <Type size={16} className="text-gray-400" />
                   <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Size</label>
                </div>
                <span className="text-xs font-bold text-gray-500">{zenSettings.fontSize}px</span>
              </div>
              <input 
                type="range" 
                min="12" 
                max="32" 
                step="1"
                value={zenSettings.fontSize}
                onChange={(e) => handleZenChange('fontSize', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-500)]"
              />
            </div>

            {/* Font Weight */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded bg-gray-100 dark:bg-gray-800"><Type size={12} className="text-gray-500" /></div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Weight</label>
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                 {['300', '400', '600', '700'].map(w => (
                   <button
                     key={w}
                     onClick={() => handleZenChange('fontWeight', w)}
                     className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${zenSettings.fontWeight === w ? 'bg-white dark:bg-gray-700 text-[var(--accent-600)] dark:text-white shadow-sm' : 'text-gray-400'}`}
                   >
                     {w === '300' ? 'Light' : w === '400' ? 'Reg' : w === '600' ? 'Semi' : 'Bold'}
                   </button>
                 ))}
              </div>
            </div>

             {/* Density (Line Height) */}
             <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                   <Sliders size={16} className="text-gray-400" />
                   <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Density</label>
                </div>
                <span className="text-xs font-bold text-gray-500">{zenSettings.lineHeight}x</span>
              </div>
              <input 
                type="range" 
                min="1.0" 
                max="2.5" 
                step="0.1"
                value={zenSettings.lineHeight}
                onChange={(e) => handleZenChange('lineHeight', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-500)]"
              />
            </div>

          </div>
        </div>
{/* CLOUD BACKUP SECTION */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 ml-2">Cloud Sync</h3>
          <CloudBackup />
        </div>



        {/* DATA */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 ml-2">Data Management</h3>
          <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <MenuItem icon={Download} label="Export Backup (ZIP)" onClick={onExport} />
            <MenuItem icon={Upload} label="Import Backup" onClick={() => importInputRef.current?.click()} />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PAGE: ABOUT ---
export const AboutPage = ({ navigate }) => {
  return (
    <div className="pb-24 animate-slideUp">
      <PageHeader title="About" onBack={() => navigate('more')} />
      
      <div className="p-6 flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-gradient-to-tr from-[var(--accent-500)] to-purple-500 rounded-3xl shadow-xl flex items-center justify-center text-white">
          <span className="text-3xl font-bold">J</span>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Journal App</h2>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
            A privacy-focused, offline-first journal designed to keep your memories safe. 
          </p>
        </div>

        <div className="w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 text-left">
          <a href="#" className="bg-white dark:bg-gray-900 p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <Github size={20} className="text-gray-700 dark:text-gray-200" />
            <span className="text-gray-700 dark:text-gray-200 font-medium">Source Code</span>
          </a>
          <a href="#" className="bg-white dark:bg-gray-900 p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <Mail size={20} className="text-gray-700 dark:text-gray-200" />
            <span className="text-gray-700 dark:text-gray-200 font-medium">Contact Support</span>
          </a>
        </div>
      </div>
    </div>
  );
};
