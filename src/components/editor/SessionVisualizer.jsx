import React, { useState, useEffect, useMemo } from 'react';
import { diffWords } from 'diff';
import { Clock, SkipBack, SkipForward } from 'lucide-react';

const SessionVisualizer = ({ sessions = [] }) => {
  // 1. Hook: State
  const [activeIndex, setActiveIndex] = useState(sessions.length - 1);

  // 2. Hook: Effect
  useEffect(() => {
    if (sessions.length > 0 && activeIndex === -1) {
      setActiveIndex(sessions.length - 1);
    }
  }, [sessions.length, activeIndex]);

  // Derive variables (safe to do before hooks)
  const activeSession = sessions[activeIndex];
  const previousSession = sessions[activeIndex - 1];

  // 3. Hook: Memo (MUST be called before any early returns)
  const diffData = useMemo(() => {
    // Handle invalid state inside the hook
    if (!activeSession) return [];

    const currentText = activeSession?.contentSnapshot || '';
    const prevText = previousSession?.contentSnapshot || '';
    
    if (!previousSession) {
      return [{ value: currentText, added: true, removed: false }];
    }

    // Ensure we are diffing strings
    return diffWords(String(prevText), String(currentText));
  }, [activeSession, previousSession]);

  // --- EARLY RETURNS (UI Logic) ---
  // Now that all hooks have run, it is safe to return early
  if (!sessions || sessions.length === 0) return null;
  if (!activeSession) return null;

  // --- RENDERING HELPERS ---
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'Active';
    try {
      const diff = new Date(end) - new Date(start);
      const mins = Math.floor(diff / 60000);
      return mins < 1 ? '< 1m' : `${mins}m`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="text-[var(--accent-500)]" size={20} />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Time Travel</h3>
      </div>

      {/* TIMELINE CONTROLS */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-6 select-none">
        <div className="flex justify-between items-end mb-4">
            <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Session {activeIndex + 1} of {sessions.length}</span>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatTime(activeSession.startTime)}
                    <span className="text-gray-400 font-normal mx-2">-</span> 
                    {calculateDuration(activeSession.startTime, activeSession.endTime)}
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                   disabled={activeIndex === 0}
                   onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
                   className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 disabled:opacity-30 active:scale-95 transition-all"
                >
                    <SkipBack size={18} />
                </button>
                <button 
                   disabled={activeIndex === sessions.length - 1}
                   onClick={() => setActiveIndex(i => Math.min(sessions.length - 1, i + 1))}
                   className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 disabled:opacity-30 active:scale-95 transition-all"
                >
                    <SkipForward size={18} />
                </button>
            </div>
        </div>

        {/* SLIDER */}
        <div className="relative h-6 flex items-center">
            <div className="absolute left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="absolute left-0 right-0 flex justify-between px-1 pointer-events-none">
                {sessions.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`w-2 h-2 rounded-full transition-colors ${idx <= activeIndex ? 'bg-[var(--accent-500)]' : 'bg-gray-300 dark:bg-gray-600'}`} 
                    />
                ))}
            </div>
            <input 
                type="range"
                min={0}
                max={sessions.length - 1}
                step={1}
                value={activeIndex}
                onChange={(e) => setActiveIndex(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
                className="absolute h-5 w-5 bg-white border-2 border-[var(--accent-500)] rounded-full shadow-md pointer-events-none transition-all"
                style={{ 
                    left: `calc(${(activeIndex / (sessions.length - 1 || 1)) * 100}% - 10px)` 
                }}
            />
        </div>
      </div>

      {/* TEXT VIEW */}
      <div className="prose dark:prose-invert max-w-none leading-relaxed text-lg">
        {diffData.map((part, index) => {
            if (part.removed) return null; 
            return (
                <span 
                    key={index} 
                    className={`transition-colors duration-300 ${
                        part.added 
                            ? 'text-gray-900 dark:text-gray-100 font-medium bg-[var(--accent-50)] dark:bg-[var(--accent-900)/30] px-0.5 rounded' 
                            : 'text-gray-300 dark:text-gray-600'
                    }`}
                >
                    {part.value}
                </span>
            );
        })}
      </div>
      
      {/* LEGEND */}
      <div className="mt-4 flex gap-4 text-xs font-medium text-gray-400">
          <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
             <span>Existing Text</span>
          </div>
          <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-[var(--accent-500)]" />
             <span>Written in this session</span>
          </div>
      </div>
    </div>
  );
};

export default SessionVisualizer;