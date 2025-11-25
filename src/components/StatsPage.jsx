import React, { useState } from 'react';
import { Calendar, Sun, BarChart2, Hash } from 'lucide-react';
import LineGraph from './LineGraph';

// Shared helpers
const calculateStreak = (entries) => {
  if (!entries.length) return 0;
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  const today = new Date().setHours(0, 0, 0, 0);
  const lastEntryDate = new Date(sorted[0].date).setHours(0, 0, 0, 0);
  const diffTime = today - lastEntryDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;
  let streak = 1;
  let currentDate = lastEntryDate;
  for (let i = 1; i < sorted.length; i++) {
    const entryDate = new Date(sorted[i].date).setHours(0, 0, 0, 0);
    if (entryDate === currentDate) continue;
    const dayDiff = (currentDate - entryDate) / (1000 * 60 * 60 * 24);
    if (dayDiff >= 0.9 && dayDiff <= 1.1) {
      streak++;
      currentDate = entryDate;
    } else {
      break;
    }
  }
  return streak;
};
const countWords = (str) => str.trim().length === 0 ? 0 : str.trim().split(/\s+/).length;

const StatsPage = ({ entries }) => {
  const [filter, setFilter] = useState('all');
  const now = new Date();
  const filteredEntries = entries.filter(e => {
    const d = new Date(e.date);
    if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (filter === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalEntries = filteredEntries.length;
  const streak = calculateStreak(entries);
  const totalWords = filteredEntries.reduce((acc, curr) => acc + countWords(curr.content), 0);
  const avgWords = totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0;
  const maxWords = filteredEntries.reduce((max, curr) => Math.max(max, countWords(curr.content)), 0);

  const graphData = filteredEntries.map(e => ({
    date: e.date,
    mood: e.mood || 5,
    words: countWords(e.content)
  }));

  return (
    <div className="space-y-6 pb-24 px-6 pt-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Insights</h1>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {['all', 'year', 'month'].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${filter === f ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-3xl shadow-lg shadow-blue-500/20">
          <p className="text-blue-100 text-sm font-medium mb-1 flex items-center gap-1"><Calendar size={14} /> Days Journaled</p>
          <p className="text-3xl font-bold">{totalEntries}</p>
          <p className="text-xs text-blue-100 mt-2 opacity-80">in selected period</p>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 text-white p-5 rounded-3xl shadow-lg shadow-orange-500/20">
          <p className="text-orange-100 text-sm font-medium mb-1 flex items-center gap-1"><Sun size={14} /> Current Streak</p>
          <p className="text-3xl font-bold">{streak} <span className="text-lg font-normal">days</span></p>
          <p className="text-xs text-orange-100 mt-2 opacity-80">Keep it up!</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm text-center"><p className="text-xs text-gray-400 font-medium uppercase mb-1">Total Words</p><p className="text-xl font-bold text-gray-900">{totalWords}</p></div>
        <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm text-center"><p className="text-xs text-gray-400 font-medium uppercase mb-1">Avg Words</p><p className="text-xl font-bold text-gray-900">{avgWords}</p></div>
        <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm text-center"><p className="text-xs text-gray-400 font-medium uppercase mb-1">Most Words</p><p className="text-xl font-bold text-gray-900">{maxWords}</p></div>
      </div>
      <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm"><h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm"><BarChart2 size={16} className="text-blue-500" /> Mood Flow</h3><LineGraph data={graphData} dataKey="mood" color="#3B82F6" height={120} /></div>
      <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm"><h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm"><Hash size={16} className="text-purple-500" /> Writing Volume</h3><LineGraph data={graphData} dataKey="words" color="#A855F7" height={120} /></div>
    </div>
  );
};

export default StatsPage;
