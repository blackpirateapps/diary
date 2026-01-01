// components/people/TimelineEntryCard.jsx
import React, { useMemo } from 'react';
import { MapPin, ArrowRight, Quote } from 'lucide-react';
import { extractMentionContext } from './extractMentionContext';

const TimelineEntryCard = ({ entry, person, onClick }) => {
  // Use the helper to get clean text instead of JSON
  const snippet = useMemo(() => 
    extractMentionContext(entry.content, person.id, person.name), 
  [entry.content, person]);

  const dateObj = new Date(entry.date);

  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      {/* Timeline Connector Line */}
      <div className="absolute left-[11px] top-8 bottom-0 w-[2px] bg-gray-200 dark:bg-gray-800 last:hidden" />
      
      {/* Timeline Indicator Dot */}
      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-[var(--accent-50)] dark:bg-gray-800 border-2 border-[var(--accent-500)] flex items-center justify-center z-10">
        <div className="w-2 h-2 rounded-full bg-[var(--accent-500)]" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
           <div>
             <h4 className="font-bold text-gray-900 dark:text-white text-lg">
               {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
             </h4>
             <p className="text-xs text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1 mt-0.5">
               {dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit' })}
               {entry.location && <>• <MapPin size={10} /> {entry.location}</>}
               {entry.mood && <>• <span className="text-[var(--accent-500)] font-bold">Mood: {entry.mood}</span></>}
             </p>
           </div>
           <button 
             onClick={() => onClick(entry)}
             className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-[var(--accent-50)] dark:hover:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-1"
           >
             Read <ArrowRight size={12} />
           </button>
        </div>

        {/* The Snippet: Plain text only, no JSON */}
        <div className="relative bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
           <Quote size={16} className="absolute top-3 left-3 text-[var(--accent-500)] opacity-40" />
           <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed pl-6 italic font-medium">
             "{snippet}"
           </p>
        </div>
      </div>
    </div>
  );
};

export default TimelineEntryCard;