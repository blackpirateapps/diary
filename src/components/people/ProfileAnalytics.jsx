// components/people/ProfileAnalytics.jsx
import React from 'react';
import { Sparkles, Clock, Smile, TrendingUp, AlertCircle } from 'lucide-react';

const ProfileAnalytics = ({ stats, entryCount }) => {
  if (!stats) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <Sparkles size={14} /> Insights
        </h3>
        
        {/* Simple Heatmap Visualization */}
        <div className="flex items-end gap-[3px] h-6">
          {stats.monthCounts.map((count, i) => (
            <div 
              key={i} 
              className={`w-1.5 rounded-sm transition-all duration-500 ${count > 0 ? 'bg-[var(--accent-500)]' : 'bg-gray-100 dark:bg-gray-800'}`}
              style={{ height: count > 0 ? `${Math.min(100, Math.max(20, count * 20))}%` : '20%' }}
              title={`${count} entries in month ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Last Seen Stat */}
        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 transition-colors">
          <Clock size={20} className="mx-auto text-blue-400 mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {stats.daysSince === 0 ? 'Today' : `${stats.daysSince}d`}
          </div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Last Seen</div>
        </div>

        {/* Vibe/Mood Stat */}
        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-yellow-100 dark:hover:border-yellow-900/30 transition-colors">
          <Smile size={20} className="mx-auto text-yellow-500 mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.avgMood}</div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Avg Mood</div>
        </div>

        {/* Total Interaction Count */}
        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-green-100 dark:hover:border-green-900/30 transition-colors">
          <TrendingUp size={20} className="mx-auto text-green-500 mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{entryCount}</div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Entries</div>
        </div>
      </div>

      {/* Social Nudge */}
      {stats.daysSince > 30 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-orange-500 font-medium bg-orange-50 dark:bg-orange-900/20 py-2.5 rounded-xl border border-orange-100 dark:border-orange-900/30">
          <AlertCircle size={14} /> 
          It's been {stats.daysSince} days. Maybe reach out?
        </div>
      )}
    </div>
  );
};


export default ProfileAnalytics;