import React, { useState, useEffect, useMemo } from 'react';
import { diffWords } from 'diff';
import { Clock, Play, SkipBack, SkipForward } from 'lucide-react';

const SessionVisualizer = ({ sessions = [] }) => {
  // Default to showing the latest version
  const [activeIndex, setActiveIndex] = useState(sessions.length - 1);

  // Sync activeIndex when sessions update (Fix for crash when loading sessions)
  useEffect(() => {
    setActiveIndex(sessions.length - 1);
  }, [sessions.length]);

  // Handle case with no sessions (legacy entries)
  if (!sessions || sessions.length === 0) return null;

  // SAFE GUARD: Ensure index is within bounds (Fix for crash when activeIndex is -1)
  const safeIndex = Math.min(Math.max(0, activeIndex), sessions.length - 1);
  
  const activeSession = sessions[safeIndex];
  const previousSession = sessions[safeIndex - 1];
  
  // Guard against undefined session (double safety)
  if (!activeSession) return null;

  // Calculate Diff: Compare Current Session vs Previous Session
  const diffData = useMemo(() => {
    const currentText = activeSession?.contentSnapshot || '';
    const prevText = previousSession?.contentSnapshot || '';
    
    // If it's the first session, everything is "Added"
    if (!previousSession) {
      return [{ value: currentText, added: true, removed: false }];
    }

    return diffWords(prevText, currentText);
  }, [activeSession, previousSession]);

  // Safe formatting helper (Native Date, no external lib needed)
  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'Active';
    const diff = new Date(end) - new Date(start);
    const mins = Math.floor(diff / 60000);
    return mins < 1 ? '< 1m' : `${mins}m`;
  };

  return (
    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="text-[var(--accent-500)]" size={20} />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Time Travel</h3>
      </div>

      {/* 1. TIMELINE CONTROLS (Touch Friendly) */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-6 select-none">
        <div className="flex justify-between items-end mb-4">
            <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Session {safeIndex + 1} of {sessions.length}</span>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatTime(activeSession.startTime)}
                    <span className="text-gray-400 font-normal mx-2">-</span> 
                    {calculateDuration(activeSession.startTime, activeSession.endTime)}
                </div>
            </div>
            
            {/* Quick Navigation Buttons */}
            <div className="flex gap-2">
                <button 
                   disabled={safeIndex === 0}
                   onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
                   className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 disabled:opacity-30 active:scale-95 transition-all"
                >
                    <SkipBack size={18} />
                </button>
                <button 
                   disabled={safeIndex === sessions.length - 1}
                   onClick={() => setActiveIndex(i => Math.min(sessions.length - 1, i + 1))}
                   className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 disabled:opacity-30 active:scale-95 transition-all"
                >
                    <SkipForward size={18} />
                </button>
            </div>
        </div>

        {/* The Slider */}
        <div className="relative h-6 flex items-center">
            {/* Track Line */}
            <div className="absolute left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            
            {/* Step Dots */}
            <div className="absolute left-0 right-0 flex justify-between px-1 pointer-events-none">
                {sessions.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`w-2 h-2 rounded-full transition-colors ${idx <= safeIndex ? 'bg-[var(--accent-500)]' : 'bg-gray-300 dark:bg-gray-600'}`} 
                    />
                ))}
            </div>

            {/* Input Range (Invisible Touch Target) */}
            <input 
                type="range"
                min={0}
                max={sessions.length - 1}
                step={1}
                value={safeIndex}
                onChange={(e) => setActiveIndex(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            {/* Visible Thumb Handle (Calculated Position) */}
            <div 
                className="absolute h-5 w-5 bg-white border-2 border-[var(--accent-500)] rounded-full shadow-md pointer-events-none transition-all"
                style={{ 
                    left: `calc(${(safeIndex / (sessions.length - 1 || 1)) * 100}% - 10px)` 
                }}
            />
        </div>
      </div>

      {/* 2. TEXT VIEW (The "Diff" Display) */}
      <div className="prose dark:prose-invert max-w-none leading-relaxed text-lg">
        {diffData.map((part, index) => {
            // Logic:
            // - If added: Show normally (or bold/green).
            // - If removed: Don't show (we want to see the state of the doc *at that time*).
            // - If unchanged: Show grayed out (context).
            
            if (part.removed) return null; // Hide deleted text to show clean state

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
      
      {/* Legend */}
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