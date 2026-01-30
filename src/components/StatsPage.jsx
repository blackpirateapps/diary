import React, { useState, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  XAxis, YAxis, CartesianGrid, 
  BarChart, Bar, 
  ComposedChart, Line, Legend 
} from 'recharts';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { 
  Trophy, TrendingUp, Calendar as CalendarIcon, 
  Activity, ChevronDown, Leaf, AlignLeft,
  Smile, PlusCircle, Hash, CalendarDays // <--- NEW ICONS
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const COLORS = ['#60A5FA', '#34D399', '#F87171', '#FBBF24', '#A78BFA', '#F472B6', '#A3E635'];

// --- HELPER FUNCTIONS ---
const calculateStreak = (entries) => {
  if (!entries.length) return 0;
  const sortedDates = [...new Set(entries.map(e => new Date(e.date).toDateString()))]
    .sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;
  let currentDate = new Date(sortedDates[0]);
  for (let i = 0; i < sortedDates.length; i++) {
    const entryDate = new Date(sortedDates[i]);
    const diffTime = Math.abs(currentDate - entryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (i === 0) streak++;
    else if (diffDays === 1) { streak++; currentDate = entryDate; }
    else if (diffDays === 0) continue;
    else break;
  }
  return streak;
};

const StatsPage = ({ entries, isDarkMode, navigate }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month'); 
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());

  const meditationSessions = useLiveQuery(() => db.meditation_sessions.toArray(), []) || [];
  const peopleList = useLiveQuery(() => db.people.toArray(), []) || [];

  // --- THEME STYLES ---
  const themeStyles = useMemo(() => {
    return {
      grid: isDarkMode ? '#374151' : '#E5E7EB', 
      text: isDarkMode ? '#9CA3AF' : '#6B7280', 
      cardBg: isDarkMode ? '#111827' : '#FFFFFF',
      tooltipBg: isDarkMode ? '#1F2937' : '#FFFFFF', 
      tooltipColor: isDarkMode ? '#F3F4F6' : '#111827',
      tooltipBorder: isDarkMode ? '#374151' : '#E5E7EB'
    };
  }, [isDarkMode]);

  // --- FILTERING LOGIC ---
  const dateRange = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === 'year') return new Date(now.getFullYear(), 0, 1);
    if (selectedPeriod === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(0); 
  }, [selectedPeriod]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => new Date(e.date) >= dateRange).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [entries, dateRange]);

  const filteredMeditation = useMemo(() => {
    return meditationSessions
      .filter(m => new Date(m.startTime) >= dateRange)
      .sort((a, b) => a.startTime - b.startTime);
  }, [meditationSessions, dateRange]);

  // --- DATA PROCESSING ---
  
  // 1. Mood + Word Count Combined
  const moodVolumeData = useMemo(() => {
    return filteredEntries.map(e => ({
      date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      mood: e.mood,
      words: e.content.trim().split(/\s+/).length
    }));
  }, [filteredEntries]);

  // 2. Average Mood
  const averageMood = useMemo(() => {
    if (filteredEntries.length === 0) return 0;
    const sum = filteredEntries.reduce((acc, curr) => acc + (curr.mood || 0), 0);
    return (sum / filteredEntries.length).toFixed(1);
  }, [filteredEntries]);

  // 3. Time of Day
  const timeOfDayData = useMemo(() => {
    const counts = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    filteredEntries.forEach(e => {
      const hour = new Date(e.date).getHours();
      if (hour >= 5 && hour < 12) counts.Morning++;
      else if (hour >= 12 && hour < 17) counts.Afternoon++;
      else if (hour >= 17 && hour < 22) counts.Evening++;
      else counts.Night++;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).filter(d => d.value > 0);
  }, [filteredEntries]);

  // 4. [NEW] Weekly Rhythm (Entries & Mood by Day of Week)
  const weeklyRhythmData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = days.map(d => ({ name: d, entries: 0, totalMood: 0, count: 0 }));
    
    filteredEntries.forEach(e => {
      const dayIndex = new Date(e.date).getDay();
      data[dayIndex].entries++;
      if (e.mood) {
        data[dayIndex].totalMood += e.mood;
        data[dayIndex].count++;
      }
    });

    return data.map(d => ({
      ...d,
      avgMood: d.count > 0 ? (d.totalMood / d.count).toFixed(1) : 0
    }));
  }, [filteredEntries]);

  // 5. [NEW] Top Tags
  const topTagsData = useMemo(() => {
    const tagCounts = {};
    filteredEntries.forEach(e => {
      if (e.tags) {
        e.tags.forEach(t => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      }
    });
    return Object.entries(tagCounts)
      .map(([name, value]) => ({ name: `#${name}`, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8
  }, [filteredEntries]);

  const meditationStats = useMemo(() => {
    if (filteredMeditation.length === 0) return null;
    const dailyGroups = {};
    let totalSeconds = 0;
    filteredMeditation.forEach(session => {
      const dateKey = new Date(session.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!dailyGroups[dateKey]) dailyGroups[dateKey] = { date: dateKey, minutes: 0 };
      const mins = session.duration / 60;
      dailyGroups[dateKey].minutes += mins;
      totalSeconds += session.duration;
    });
    const chartData = Object.values(dailyGroups).sort((a,b) => new Date(a.date) - new Date(b.date));
    const totalMinutes = Math.floor(totalSeconds / 60);
    return { totalMinutes, chartData };
  }, [filteredMeditation]);

  const peopleIndex = useMemo(() => {
    const map = new Map();
    peopleList.forEach((person) => map.set(String(person.id), person.name || `Person ${person.id}`));
    return map;
  }, [peopleList]);

  const peopleMentionsData = useMemo(() => {
    const counts = {};
    filteredEntries.forEach((entry) => {
      const list = Array.isArray(entry.people) ? entry.people : [];
      list.forEach((personId) => {
        const key = String(personId);
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([id, value]) => ({ name: peopleIndex.get(id) || `Person ${id}`, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredEntries, peopleIndex]);

  const topLocationsData = useMemo(() => {
    const counts = {};
    filteredEntries.forEach((entry) => {
      const raw = entry.location || '';
      const location = typeof raw === 'string' ? raw.trim() : '';
      if (!location) return;
      counts[location] = (counts[location] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredEntries]);

  const availableYears = useMemo(() => {
    const years = new Set(entries.map(e => new Date(e.date).getFullYear()));
    years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [entries]);

  return (
    <div className="pb-24 animate-slideUp text-gray-900 dark:text-gray-100 transition-colors max-w-5xl mx-auto">
      <header className="px-6 pt-6 pb-2 sticky top-0 md:relative bg-[#F3F4F6]/95 dark:bg-gray-950/95 md:bg-transparent backdrop-blur-md z-20 md:z-0 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Insights</h1>
          <div className="flex p-1 bg-gray-200/50 dark:bg-gray-800 rounded-xl w-full md:w-auto">
            {['all', 'year', 'month'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`flex-1 md:flex-none md:px-6 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                  selectedPeriod === p 
                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-600)] dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                {p === 'all' ? 'All Time' : p === 'year' ? 'This Year' : 'This Month'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 space-y-6 mt-6">
        
        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-500 rounded-full mb-2"><Trophy size={20} /></div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{calculateStreak(entries)}</span>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Streak</span>
          </div>
          
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
            <div className="p-2 bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-500)] rounded-full mb-2"><TrendingUp size={20} /></div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{filteredEntries.length}</span>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Entries</span>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
            <div className="p-2 bg-pink-50 dark:bg-pink-900/30 text-pink-500 rounded-full mb-2"><Smile size={20} /></div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageMood}</span>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Avg Mood</span>
          </div>

           <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-500 rounded-full mb-2"><AlignLeft size={20} /></div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{filteredEntries.reduce((acc, curr) => acc + curr.content.split(' ').length, 0).toLocaleString()}</span>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Words</span>
          </div>
           <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full mb-2"><CalendarIcon size={20} /></div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{availableYears.length}</span>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Years</span>
          </div>
        </div>

        {/* HEATMAP */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} className="text-green-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Writing Habits</h2>
            </div>
            <div className="relative group">
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{heatmapYear}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
              <select value={heatmapYear} onChange={(e) => setHeatmapYear(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              <CalendarHeatmap
                startDate={new Date(heatmapYear, 0, 1)}
                endDate={new Date(heatmapYear, 11, 31)}
                values={entries.map(e => ({ date: e.date.split('T')[0], count: 1 }))}
                classForValue={(value) => value ? `color-scale-4` : 'color-empty'}
                showWeekdayLabels
                gutterSize={2}
              />
            </div>
          </div>
          <style>{`
            .react-calendar-heatmap text { font-size: 8px; fill: ${themeStyles.text}; }
            .react-calendar-heatmap .color-empty { fill: ${isDarkMode ? '#374151' : '#F3F4F6'}; rx: 2px; }
            .react-calendar-heatmap .color-scale-4 { fill: var(--accent-500); rx: 2px; }
          `}</style>
        </div>

        {/* --- [NEW] WEEKLY RHYTHM & TOP TAGS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Weekly Rhythm */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={18} className="text-blue-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Weekly Rhythm</h2>
            </div>
            <div className="h-48 w-full -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyRhythmData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={themeStyles.grid} />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: themeStyles.text}} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 10]} hide />
                  <Tooltip 
                    cursor={{fill: isDarkMode ? '#374151' : '#f3f4f6'}}
                    contentStyle={{borderRadius: '12px', border: `1px solid ${themeStyles.tooltipBorder}`, backgroundColor: themeStyles.tooltipBg}}
                    itemStyle={{ color: themeStyles.tooltipColor }}
                  />
                  <Bar yAxisId="left" dataKey="entries" name="Entries" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="avgMood" name="Avg Mood" stroke="#F472B6" strokeWidth={2} dot={{r: 3}} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Tags */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Hash size={18} className="text-pink-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top Tags</h2>
            </div>
            <div className="h-48 w-full -ml-2">
              {topTagsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTagsData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={themeStyles.grid} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fill: themeStyles.text}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}} 
                      contentStyle={{borderRadius: '12px', border: `1px solid ${themeStyles.tooltipBorder}`, backgroundColor: themeStyles.tooltipBg}}
                      itemStyle={{ color: themeStyles.tooltipColor }}
                    />
                    <Bar dataKey="value" name="Uses" fill="#EC4899" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">No tags used yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* VOLUME & MOOD */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <AlignLeft size={18} className="text-[var(--accent-500)]" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Volume & Mood</h2>
            </div>
            <div className="h-48 w-full -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={moodVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={themeStyles.grid} />
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: themeStyles.text}} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 10]} hide />
                  <Tooltip 
                    cursor={{fill: isDarkMode ? '#374151' : '#f3f4f6'}}
                    contentStyle={{borderRadius: '12px', border: `1px solid ${themeStyles.tooltipBorder}`, backgroundColor: themeStyles.tooltipBg}}
                    itemStyle={{ color: themeStyles.tooltipColor }}
                  />
                  <Legend iconSize={8} wrapperStyle={{fontSize: '10px'}} />
                  <Bar yAxisId="left" dataKey="words" name="Words" fill="var(--accent-500)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="mood" name="Mood" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
        </div>

        {/* TIME OF DAY */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-purple-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Posting Time</h2>
            </div>
            <div className="h-48 w-full flex items-center justify-center">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={timeOfDayData}
                     cx="50%"
                     cy="50%"
                     innerRadius={40}
                     outerRadius={70}
                     paddingAngle={5}
                     dataKey="value"
                     stroke={themeStyles.cardBg} 
                   >
                     {timeOfDayData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip 
                     contentStyle={{borderRadius: '12px', border: `1px solid ${themeStyles.tooltipBorder}`, backgroundColor: themeStyles.tooltipBg}}
                     itemStyle={{color: themeStyles.tooltipColor, fontWeight: '600'}}
                   />
                   <Legend iconSize={8} wrapperStyle={{fontSize: '10px'}} layout="vertical" verticalAlign="middle" align="right" />
                 </PieChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PEOPLE & LOCATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Smile size={18} className="text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">People Mentions</h2>
            </div>
            <div className="h-48 w-full -ml-2">
              {peopleMentionsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peopleMentionsData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={themeStyles.grid} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={90} tick={{fontSize: 10, fill: themeStyles.text}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}} 
                      contentStyle={{borderRadius: '12px', border: `1px solid ${themeStyles.tooltipBorder}`, backgroundColor: themeStyles.tooltipBg}}
                      itemStyle={{ color: themeStyles.tooltipColor }}
                    />
                    <Bar dataKey="value" name="Mentions" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">No people tagged yet.</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-emerald-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top Locations</h2>
            </div>
            <div className="h-48 w-full -ml-2">
              {topLocationsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topLocationsData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={themeStyles.grid} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} tick={{fontSize: 10, fill: themeStyles.text}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}} 
                      contentStyle={{borderRadius: '12px', border: `1px solid ${themeStyles.tooltipBorder}`, backgroundColor: themeStyles.tooltipBg}}
                      itemStyle={{ color: themeStyles.tooltipColor }}
                    />
                    <Bar dataKey="value" name="Entries" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">No locations saved yet.</div>
              )}
            </div>
          </div>
        </div>
        
        {/* MEDITATION ANALYTICS */}
        {meditationStats ? (
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Leaf size={18} className="text-teal-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mindfulness</h2>
            </div>
            <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl mb-6">
              <div>
                <span className="block text-xs text-gray-500 font-bold uppercase">Total Time</span>
                <span className="text-xl font-bold text-teal-700 dark:text-teal-400">{meditationStats.totalMinutes} min</span>
              </div>
              <div className="text-right">
                <span className="block text-xs text-gray-500 font-bold uppercase">Sessions</span>
                <span className="text-xl font-bold text-teal-700 dark:text-teal-400">{filteredMeditation.length}</span>
              </div>
            </div>
            <div className="h-48 w-full -ml-2">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={meditationStats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={themeStyles.grid} />
                    <XAxis dataKey="date" tick={{fontSize: 10, fill: themeStyles.text}} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: isDarkMode ? '#115e59' : '#f0fdfa'}} 
                      contentStyle={{borderRadius: '12px', border: `1px solid ${themeStyles.tooltipBorder}`, boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: themeStyles.tooltipBg}}
                      labelStyle={{color: themeStyles.text, fontSize:'12px', marginBottom:'4px'}}
                      itemStyle={{ color: themeStyles.tooltipColor }}
                      formatter={(val) => [`${val.toFixed(1)} mins`, 'Duration']}
                    />
                    <Bar dataKey="minutes" fill="#2dd4bf" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center flex flex-col items-center">
            <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-full mb-3 text-teal-500"><Leaf size={24} /></div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Start Meditating</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4 max-w-xs">Take a moment to breathe and track your mindfulness journey.</p>
            {navigate && (
              <button onClick={() => navigate('meditation')} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-600)] dark:text-[var(--accent-400)] rounded-lg text-sm font-bold hover:brightness-95 transition-all">
                <PlusCircle size={16} /> Start Session
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default StatsPage;
