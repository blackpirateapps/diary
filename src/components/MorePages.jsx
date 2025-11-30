import React from 'react';
import { 
  ChevronLeft, Settings, Info, Download, Upload, 
  ChevronRight, Github, Mail, Shield, Smartphone, Moon, MessageCircle, Flower2, BookOpen, PenTool
} from 'lucide-react';

// --- SHARED HEADER COMPONENT ---
const PageHeader = ({ title, onBack }) => (
  <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50 flex items-center gap-3">
    {onBack && (
      <button onClick={onBack} className="p-2 -ml-2 text-blue-500 rounded-full hover:bg-blue-50">
        <ChevronLeft size={24} />
      </button>
    )}
    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
  </div>
);

// --- MENU ITEM HELPER ---
const MenuItem = ({ icon: Icon, label, onClick, isDestructive }) => (
  <button 
    onClick={onClick}
    className="w-full bg-white p-4 flex items-center justify-between border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors active:scale-[0.99]"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
        <Icon size={20} />
      </div>
      <span className={`font-medium ${isDestructive ? 'text-red-600' : 'text-gray-700'}`}>{label}</span>
    </div>
    <ChevronRight size={16} className="text-gray-300" />
  </button>
);

// --- PAGE: MORE MENU (The root of the "More" tab) ---
export const MoreMenu = ({ navigate }) => {
  return (
    <div className="pb-24">
      <PageHeader title="More" />
      <div className="p-4 space-y-6">
        
        {/* New "Tools" Section */}
        <div>
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">Tools</h3>
           <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
             <MenuItem icon={Moon} label="Sleep Insights" onClick={() => navigate('sleep')} />
             <MenuItem icon={Flower2} label="Meditation" onClick={() => navigate('meditation')} />
             <MenuItem icon={BookOpen} label="Year in Review (PDF)" onClick={() => navigate('year-review')} />
             <MenuItem icon={MessageCircle} label="Chat Analytics" onClick={() => navigate('whatsapp')} />
           </div>
        </div>
        
        {/* Section 1 */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <MenuItem icon={Settings} label="Settings" onClick={() => navigate('settings')} />
          <MenuItem icon={Info} label="About" onClick={() => navigate('about')} />
        </div>

        {/* Section 2 (Example of future expansion) */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <MenuItem icon={Smartphone} label="App Icon" onClick={() => alert('Coming soon!')} />
          <MenuItem icon={Shield} label="Privacy" onClick={() => alert('Data is stored locally on your device.')} />
        </div>

        <p className="text-center text-xs text-gray-400 font-medium mt-8">
          Journal App v1.0.0
        </p>
      </div>
    </div>
  );
};

// --- PAGE: SETTINGS ---
export const SettingsPage = ({ navigate, appName, setAppName, onExport, onImport, importInputRef }) => {
  
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setAppName(newName);
    localStorage.setItem('app_name', newName);
  };

  return (
    <div className="pb-24 animate-slideUp">
      <PageHeader title="Settings" onBack={() => navigate('more')} />
      
      <div className="p-4 space-y-6">
        
        {/* PERSONALIZATION */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">Personalization</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                 <PenTool size={20} />
               </div>
               <span className="font-medium text-gray-700">Journal Name</span>
            </div>
            <input 
              type="text" 
              value={appName}
              onChange={handleNameChange}
              placeholder="e.g. My Life, Captain's Log"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <p className="text-[10px] text-gray-400 mt-2 ml-1">
              This name will appear on the main journal page.
            </p>
          </div>
        </div>

        {/* DATA */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">Data Management</h3>
          <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <MenuItem icon={Download} label="Export Backup (ZIP)" onClick={onExport} />
            <MenuItem icon={Upload} label="Import Backup" onClick={() => importInputRef.current?.click()} />
          </div>
          <p className="text-xs text-gray-400 mt-2 ml-2">
            Backups include all your entries and full-quality images.
          </p>
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
        <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-3xl shadow-xl flex items-center justify-center text-white">
          <span className="text-3xl font-bold">J</span>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">Journal App</h2>
          <p className="text-gray-500 leading-relaxed">
            A privacy-focused, offline-first journal designed to keep your memories safe. 
            Built with React, Dexie.js, and Tailwind CSS.
          </p>
        </div>

        <div className="w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 text-left">
          <a href="#" className="bg-white p-4 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100">
            <Github size={20} className="text-gray-700" />
            <span className="text-gray-700 font-medium">Source Code</span>
          </a>
          <a href="#" className="bg-white p-4 flex items-center gap-3 hover:bg-gray-50">
            <Mail size={20} className="text-gray-700" />
            <span className="text-gray-700 font-medium">Contact Support</span>
          </a>
        </div>
      </div>
    </div>
  );
};