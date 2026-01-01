import React from 'react';
import { Plus, History, ArrowRight } from 'lucide-react';

const DailyPromptWidget = ({ onWrite, isTodayDone, flashback, onViewFlashback }) => (
  <div className="space-y-3 mb-8">
    {/* PRIMARY WRITE CARD */}
    <div onClick={onWrite} className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 shadow-xl shadow-blue-500/20 text-white cursor-pointer group transition-all">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-black mb-1">{isTodayDone ? "Continue Writing" : "Write Today"}</h2>
          <p className="text-blue-100 text-xs font-bold opacity-80 uppercase tracking-wider">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform">
          <Plus size={24} strokeWidth={3} />
        </div>
      </div>
    </div>

    {/* FLASHBACK CARD (Only shows if entry exists) */}
    {flashback && (
      <div 
        onClick={onViewFlashback}
        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm cursor-pointer hover:border-[var(--accent-300)] transition-all flex items-center gap-4 group"
      >
        <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 shrink-0">
          <History size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">On This Day</h3>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">
            {new Date(flashback.date).getFullYear()}: {flashback.preview || "View memory..."}
          </p>
        </div>
        <ArrowRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
      </div>
    )}
  </div>
);

export default DailyPromptWidget;