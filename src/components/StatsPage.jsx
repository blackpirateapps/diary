import React, { useState, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  BarChart, Bar, ReferenceLine 
} from 'recharts';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { 
  Trophy, TrendingUp, Calendar as CalendarIcon, 
  Clock, Activity, Moon, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

// --- CONFIGURATION ---
const COLORS = ['#60A5FA', '#34D399', '#F87171', '#FBBF24', '#A78BFA'];

// --- HELPERS ---
const calculateStreak = (entries) => {
  if (!entries.length) return 0;
  
  const sortedDates = [...new Set(entries.map(e => new Date(e.date).toDateString()))]
    .sort((a, b) => new Date(b) - new Date(a)); // Newest first

  let streak = 0;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  // Check if streak is active (entry today or yesterday)
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0;
  }

  // Count backwards
  let currentDate = new Date(sortedDates[0]);
  
  for (let i = 0; i < sortedDates.length; i++) {
    const entryDate = new Date(sortedDates[i]);
    const diffTime = Math.abs(currentDate - entryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (i === 0) {
      streak++;
    } else if (diffDays === 1) {
      streak++;
      currentDate = entryDate;
    } else if (diffDays === 0) {
      continue; // Same day entry
    } else {
      break; // Gap found
    }
  }
  return streak;
};

// Format hours to HH:MM
const formatDecimalHour = (decimal) => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}h ${minutes}m`;
};

// Normalize time for the Sleep Schedule graph (Noon to Noon shift)
// 12 PM = 12, 6 PM = 18, 12 AM = 24, 6 AM = 30, 11 AM = 35
const normalizeTime = (dateMs) => {
  const date = new Date(dateMs);
  let hours = date.getHours() + date.getMinutes() / 60;
  if (hours < 12) hours += 24; // Shift morning hours to "next day" scale
  return hours;
};

const formatAxisTime = (val) => {
  let normalized = val;
  if (normalized >= 24) normalized -= 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const displayHour = normalized > 12 ? normalized - 12 : (normalized === 0 || normalized === 24 ? 12 : normalized);
  return `${Math.floor(displayHour)} ${suffix}`;
};

const StatsPage = ({ entries }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // all, year, month
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());

  // --- FETCH SLEEP DATA ---
  const sleepSessions = useLiveQuery(() => db.sleep_sessions.toArray(), []) || [];

  // --- FILTERING LOGIC ---
  const dateRange = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === 'year') {
      return new Date(now.getFullYear(), 0, 1);
    } else if (selectedPeriod === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return new Date(0); // All time
  }, [selectedPeriod]);

  // Filter Journal Entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => new Date(e.date) >= dateRange).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [entries, dateRange]);

  // Filter Sleep Sessions
  const filteredSleep = useMemo(() => {
    return sleepSessions
      .filter(s => new Date(s.startTime) >= dateRange)
      .sort((a, b) => a.startTime - b.startTime);
  }, [sleepSessions, dateRange]);

  // --- PREPARE CHART DATA ---
  
  // 1. Mood & Volume (Journal)
  const moodVolumeData = useMemo(() => {
    return filteredEntries.map(e => ({
      date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      mood: e.mood,
      words: e.content.trim().split(/\s+/).length
    }));
  }, [filteredEntries]);

  // 2. Time of Day (Journal)
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

  // 3. Sleep Stats
  const sleepStats = useMemo(() => {
    if (filteredSleep.length === 0) return null;
    
    let totalDur = 0;
    let min = filteredSleep[0];
    let max = filteredSleep[0];

    const chartData = filteredSleep.map(s => {
      totalDur += s.duration;
      if (s.duration < min.duration) min = s;
      if (s.duration > max.duration) max = s;

      // Prepare range for Bar chart [start, end]
      // We assume sleep generally starts in evening and ends next morning
      const start = normalizeTime(s.startTime);
      const end = start + s.duration;

      return {
        date: new Date(s.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        duration: s.duration,
        fullDate: new Date(s.startTime).toLocaleDateString(),
        range: [start, end] 
      };
    });

    return {
      avg: totalDur / filteredSleep.length,
      min,
      max,
      chartData
    };
  }, [filteredSleep]);

  // --- HEATMAP YEARS ---
  const availableYears = useMemo(() => {
    const years = new Set(entries.map(e => new Date(e.date).getFullYear()));
    years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [entries]);

  return (
    <div className="pb-24 animate-slideUp">
      {/* Header */}
      <header className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Insights</h1>
        
        {/* Filter Tabs */}
        <div className="flex p-1 bg-gray-200/50 rounded-xl mt-4 mb-2">
          {['all', 'year', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                selectedPeriod === p 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p === 'all' ? 'All Time' : p === 'year' ? 'This Year' : 'This Month'}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 space-y-6 mt-6">
        
        {/* 1. KEY METRICS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="p-2 bg-orange-50 text-orange-500 rounded-full mb-2">
              <Trophy size={20} />
            </div>
            <span className="text-2xl font-bold text-gray-900">{calculateStreak(entries)}</span>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Day Streak</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="p-2 bg-blue-50 text-blue-500 rounded-full mb-2">
              <TrendingUp size={20} />
            </div>
            <span className="text-2xl font-bold text-gray-900">{filteredEntries.length}</span>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Entries</span>
          </div>
        </div>

        {/* 2. WRITING CONSISTENCY (Adjustable Year) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} className="text-green-500" />
              <h2 className="text-lg font-bold text-gray-900">Writing Habits</h2>
            </div>
            
            {/* Year Selector */}
            <div className="flex items-center bg-gray-50 rounded-lg p-0.5">
              <button 
                onClick={() => setHeatmapYear(y => availableYears.includes(y - 1) ? y - 1 : y)}
                disabled={!availableYears.includes(heatmapYear - 1)}
                className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-gray-700 w-12 text-center">{heatmapYear}</span>
              <button 
                onClick={() => setHeatmapYear(y => availableYears.includes(y + 1) ? y + 1 : y)}
                disabled={!availableYears.includes(heatmapYear + 1)}
                className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[500px]"> {/* Force scroll on mobile */}
              <CalendarHeatmap
                startDate={new Date(heatmapYear, 0, 1)}
                endDate={new Date(heatmapYear, 11, 31)}
                values={entries.map(e => ({ date: e.date.split('T')[0], count: 1 }))}
                classForValue={(value) => {
                  if (!value) return 'color-empty';
                  return `color-scale-4`; 
                }}
                showWeekdayLabels
                gutterSize={2}
              />
            </div>
          </div>
          <style>{`
            .react-calendar-heatmap text { font-size: 8px; fill: #9ca3af; }
            .react-calendar-heatmap .color-empty { fill: #f3f4f6; rx: 2px; }
            .react-calendar-heatmap .color-scale-4 { fill: #3b82f6; rx: 2px; }
          `}</style>
        </div>

        {/* 3. SLEEP ANALYTICS */}
        {sleepStats ? (
          <div className="space-y-4">
            
            {/* 3a. Sleep Duration Graph */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Moon size={18} className="text-indigo-500" />
                <h2 className="text-lg font-bold text-gray-900">Sleep Duration</h2>
              </div>
              
              <div className="flex justify-between text-center mb-6 bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="block text-xs text-gray-400 font-bold uppercase">Avg</span>
                  <span className="text-lg font-bold text-gray-800">{formatDecimalHour(sleepStats.avg)}</span>
                </div>
                <div className="px-4 border-l border-r border-gray-200">
                  <span className="block text-xs text-gray-400 font-bold uppercase">Shortest</span>
                  <span className="text-lg font-bold text-gray-800">{formatDecimalHour(sleepStats.min.duration)}</span>
                  <span className="block text-[10px] text-gray-400">{new Date(sleepStats.min.startTime).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-bold uppercase">Longest</span>
                  <span className="text-lg font-bold text-gray-800">{formatDecimalHour(sleepStats.max.duration)}</span>
                  <span className="block text-[10px] text-gray-400">{new Date(sleepStats.max.startTime).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                </div>
              </div>

              <div className="h-48 w-full -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sleepStats.chartData}>
                    <defs>
                      <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                    <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      labelStyle={{color:'#6b7280', fontSize:'12px', marginBottom:'4px'}}
                      formatter={(val) => [formatDecimalHour(val), 'Duration']}
                    />
                    <Area type="monotone" dataKey="duration" stroke="#6366f1" fillOpacity={1} fill="url(#colorSleep)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3b. Sleep Schedule (Start/End Time) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-purple-500" />
                <h2 className="text-lg font-bold text-gray-900">Sleep Schedule</h2>
              </div>
              
              <div className="h-56 w-full -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sleepStats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                    {/* Y Axis mapped from 12 (Noon) to 36 (Noon next day) */}
                    <YAxis 
                      domain={[18, 34]} // Roughly 6PM to 10AM
                      tickFormatter={formatAxisTime} 
                      width={45} 
                      tick={{fontSize: 10}} 
                      tickLine={false} 
                      axisLine={false}
                      allowDataOverflow={false} // Allow auto-scale if outliers exist
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const [start, end] = payload[0].value;
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">{label}</p>
                              <p className="text-sm font-bold text-gray-800">
                                {formatAxisTime(start)} - {formatAxisTime(end)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="range" fill="#8b5cf6" radius={[4, 4, 4, 4]} barSize={12} />
                    
                    {/* Reference Lines for typical sleep times */}
                    <ReferenceLine y={24} stroke="#e5e7eb" strokeDasharray="3 3" label={{ value: 'Midnight', fontSize: 9, fill: '#9ca3af', position: 'insideTopLeft' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-2">Bars represent time from Bedtime to Wake up</p>
            </div>

          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-300 text-center">
            <Moon size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No sleep data found for this period.</p>
          </div>
        )}

        {/* 4. MOOD & VOLUME (Existing) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">Mood & Volume</h2>
          </div>
          <div className="h-48 w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={moodVolumeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" hide />
                <YAxis yAxisId="right" orientation="right" hide />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Area yAxisId="left" type="monotone" dataKey="mood" stroke="#3b82f6" fill="url(#colorSleep)" strokeWidth={2} name="Mood" />
                <Area yAxisId="right" type="monotone" dataKey="words" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} name="Words" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. TIME OF DAY (Existing) */}
        {timeOfDayData.length > 0 && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-orange-500" />
              <h2 className="text-lg font-bold text-gray-900">Time of Day</h2>
            </div>
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeOfDayData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {timeOfDayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '12px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2 flex-wrap">
              {timeOfDayData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-gray-500 font-medium">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StatsPage;