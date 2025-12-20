import React from 'react';
import { Clock, Calendar, AlignLeft } from 'lucide-react';
import TagInput from './TagInput';
import MetadataBar from './MetadataBar';
import SleepWidget from './SleepWidget';
import PeopleSuggestions from './PeopleSuggestions';

const EditorSidebar = ({ 
  currentDate, 
  handleTimeChange, 
  wordCount, 
  mode, 
  previewText, 
  mood, 
  setMood, 
  isMoodOpen, 
  setIsMoodOpen, 
  saveData, 
  location, 
  handleLocation, 
  loadingLocation, 
  weather, 
  uploading, 
  handleImageUpload, 
  tags, 
  setTags, 
  todaysSleepSessions,
  locationHistory = [] // Ensure default value
}) => {
  return (
    <aside className="hidden lg:flex lg:flex-col w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-6 overflow-y-auto min-h-0">
        
        {/* Desktop Date/Time Header */}
        <div className="mb-8 flex-shrink-0">
            <div className="flex items-center gap-2 text-[var(--accent-500)] mb-2 font-medium">
                <Calendar size={18} />
                <span>{currentDate.getFullYear()}</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
              {currentDate.toLocaleDateString(undefined, { weekday: 'long' })}
            </h2>
            <h3 className="text-2xl text-gray-400 font-medium mb-4">
              {currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
            </h3>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 border-b border-gray-200 dark:border-gray-800 pb-4">
                <div className="relative group cursor-pointer hover:text-[var(--accent-500)] transition-colors flex items-center gap-2">
                    <Clock size={16} strokeWidth={2.5} />
                    <span className="font-semibold">
                      {currentDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <input 
                      type="time" 
                      value={currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} 
                      onChange={handleTimeChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                    <AlignLeft size={14} />
                    <span>{wordCount} words</span>
                </div>
            </div>
        </div>

        <div className="flex flex-col gap-6 flex-1 overflow-y-auto">
            {mode === 'edit' && <PeopleSuggestions contentText={previewText} />}

            <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Context</label>
                <MetadataBar 
                    mood={mood} 
                    setMood={setMood} 
                    isMoodOpen={isMoodOpen} 
                    setIsMoodOpen={setIsMoodOpen} 
                    onSave={() => saveData()}
                    location={location} 
                    onLocationClick={handleLocation} 
                    loadingLocation={loadingLocation}
                    weather={weather} 
                    uploading={uploading} 
                    onImageUpload={handleImageUpload}
                    locationHistory={locationHistory} // [FIX] Added this prop
                    isSidebar={true}
                />
            </div>

            <div>
                <div className="mb-6">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Tags</label>
                    <TagInput tags={tags} onChange={setTags} />
                </div>

                {todaysSleepSessions.length > 0 && (
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Sleep Data</label>
                        {todaysSleepSessions.map(session => <SleepWidget key={session.id} session={session} />)}
                    </div>
                )}
            </div>
        </div>
    </aside>
  );
};

export default EditorSidebar;