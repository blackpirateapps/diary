import React, { useEffect, useRef } from 'react';
import { Clock, History, ChevronRight } from 'lucide-react';

const formatDuration = (start, end) => {
  if (!start || !end) return '';
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return '< 1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const SessionTimeline = ({ sessions, activeIndex, onSelect }) => {
  const scrollContainerRef = useRef(null);
  const activeItemRef = useRef(null);

  // Auto-scroll to the active item when it changes
  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 text-sm">
        No history available for this entry.
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col h-full max-h-[400px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/50 dark:bg-gray-950/50 rounded-t-xl backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <History size={16} className="text-[var(--accent-500)]" />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Session History</span>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {sessions.length} Snapshots
        </span>
      </div>

      {/* Timeline List */}
      <div 
        ref={scrollContainerRef}
        className="overflow-y-auto p-4 space-y-0 relative custom-scrollbar"
      >
        {/* Continuous vertical line background */}
        <div className="absolute left-[5.5rem] top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-800 z-0" />

        {sessions.map((session, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;

          return (
            <button
              key={index}
              ref={isActive ? activeItemRef : null}
              onClick={() => onSelect(index)}
              className={`group relative w-full flex items-center gap-4 py-3 text-left transition-all ${
                isActive ? 'opacity-100 scale-100' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {/* Time Column */}
              <div className="w-16 text-right flex-shrink-0">
                <span className={`block text-xs font-semibold ${isActive ? 'text-[var(--accent-600)]' : 'text-gray-500'}`}>
                  {formatTime(session.startTime)}
                </span>
                <span className="block text-[10px] text-gray-400">
                  {formatDuration(session.startTime, session.endTime)}
                </span>
              </div>

              {/* Timeline Dot */}
              <div className="relative z-10 flex-shrink-0">
                <div 
                  className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                    isActive 
                      ? 'bg-[var(--accent-500)] border-[var(--accent-500)] scale-125 shadow-[0_0_0_4px_rgba(var(--accent-500),0.2)]' 
                      : isPast
                        ? 'bg-gray-400 border-gray-400 dark:bg-gray-600 dark:border-gray-600'
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 group-hover:border-[var(--accent-400)]'
                  }`} 
                />
              </div>

              {/* Content Preview / Label */}
              <div className={`flex-1 min-w-0 px-3 py-2 rounded-lg border transition-all ${
                isActive 
                  ? 'bg-white dark:bg-gray-800 border-[var(--accent-200)] dark:border-[var(--accent-900)] shadow-sm translate-x-1' 
                  : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    Snapshot #{index + 1}
                  </span>
                  {isActive && <ChevronRight size={14} className="text-[var(--accent-500)]" />}
                </div>
                {/* Optional: Show first few words of content if you want */}
                 <p className="text-[10px] text-gray-400 truncate mt-0.5">
                   {(JSON.parse(session.contentSnapshot || '{}').root?.children?.[0]?.children?.[0]?.text) || "Content update"}
                 </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SessionTimeline;