import React, { useState, useMemo } from 'react';
import { Calendar, Sun, BarChart2, Hash, Activity, ArrowLeft } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

// --- HELPERS ---
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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// --- COMPONENTS ---

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl text-xs">
        <p className="font-bold text-gray-700 mb-1">{label}</p>
        <p className="text-blue-500 font-medium">
          {payload[0].name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const StatsPage = ({ entries }) => {
  const [filter, setFilter] = useState('year'); 
  const [selectedYear, setSelectedYear] = useState(null); // State for graph drill-down
  const now = new Date();

  // 1. Global Filter Data (For streaks, totals, area charts)
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const d = new Date(e.date);
      if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (filter === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [entries, filter, now]);

  // 2. Drill-Down Graph Data Preparation
  const chartData = useMemo(() => {
    if (selectedYear) {
      // MONTHLY VIEW (For Selected Year)
      const data = new Array(12).fill(0).map((_, i) => ({ name: MONTH_NAMES[i], count: 0 }));
      entries
        .filter(e => new Date(e.date).getFullYear().toString() === selectedYear)
        .forEach(e => {
          const monthIndex = new Date(e.date).getMonth();
          data[monthIndex].count += 1;
        });
      return data;
    } else {
      // YEARLY VIEW (All Time)
      const counts = {};
      entries.forEach(e => {
        const y = new Date(e.date).getFullYear().toString();
        counts[y] = (counts[y] || 0) + 1;
      });
      // Convert to array and sort by year
      return Object.keys(counts)
        .sort()
        .map(year => ({ name: year, count: counts[year] }));
    }
  }, [entries, selectedYear]);

  // 3. Area Charts Data (Mood & Words)
  const graphData = useMemo(() => {
    return filteredEntries.map(e => ({
      date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      fullDate: new Date(e.date).toLocaleDateString(),
      mood: e.mood || 5,
      words: countWords(e.content)
    }));
  }, [filteredEntries]);

  // 4. Calculate Stats
  const totalEntries = filteredEntries.length;
  const streak = calculateStreak(entries); // Streak is usually calculated on ALL entries, not filtered
  const totalWords = filteredEntries.reduce((acc, curr) => acc + countWords(curr.content), 0);
  const avgWords = totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0;
  const maxWords = filteredEntries.reduce((max, curr) => Math.max(max, countWords(curr.content)), 0);

  const handleBarClick = (data) => {
    // Only drill down if we are in "Yearly" view
    if (!selectedYear && data && data.activePayload) {
      setSelectedYear(data.activePayload[0].payload.name);
    }
  };

  return (
    <div className="space-y-6 pb-24 px-6 pt-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Insights</h1>
        <div className="flex bg-gray-100/80 p-1 rounded-xl self-start sm:self-auto">
          {['all', 'year', 'month'].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-3xl shadow-lg shadow-blue-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-semibold mb-1 flex items-center gap-2">
              <Calendar size={16} /> Total Entries
            </p>
            <p className="text-4xl font-bold tracking-tight">{totalEntries}</p>
            <p className="text-xs text-blue-200 mt-2 font-medium opacity-80 uppercase tracking-wide">
              {filter === 'all' ? 'All Time' : `This ${filter}`}
            </p>
          </div>
          <Calendar className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-10" />
        </div>
        
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 text-white p-6 rounded-3xl shadow-lg shadow-orange-500/20 relative overflow-hidden">
           <div className="relative z-10">
            <p className="text-orange-100 text-sm font-semibold mb-1 flex items-center gap-2">
              <Sun size={16} /> Current Streak
            </p>
            <p className="text-4xl font-bold tracking-tight">{streak}<span className="text-xl ml-1 font-medium opacity-80">days</span></p>
            <p className="text-xs text-orange-100 mt-2 font-medium opacity-80 uppercase tracking-wide">Keep it up!</p>
          </div>
          <Sun className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-10" />
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Words', val: totalWords },
          { label: 'Avg Words', val: avgWords },
          { label: 'Most Words', val: maxWords }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-gray-800">{stat.val.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Graph 1: Interactive History (Year -> Month Drilldown) */}
      <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm transition-all">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {selectedYear && (
              <button 
                onClick={() => setSelectedYear(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                title="Back to Year view"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 size={18} className="text-indigo-500" /> 
              {selectedYear ? `Entries in ${selectedYear}` : 'Entries History'}
            </h3>
          </div>
          {!selectedYear && <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-md">Click a bar to see months</span>}
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              onClick={handleBarClick}
              className={!selectedYear ? "cursor-pointer" : ""}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#9CA3AF', fontSize: 10}} 
                dy={10}
              />
              <Tooltip 
                cursor={{fill: '#F3F4F6', radius: 4}} 
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.count > 0 ? '#6366f1' : '#e5e7eb'} 
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graph 2: Mood Flow (Smoothed Area Chart) */}
      <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Activity size={18} className="text-blue-500" /> Mood Flow
        </h3>
        <p className="text-xs text-gray-400 mb-6">Mood variations over time</p>
        
        <div className="h-56 w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData}>
              <defs>
                <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#9CA3AF', fontSize: 10}} 
                minTickGap={30} 
                dy={10}
              />
              <YAxis hide domain={[0, 10]} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="mood" 
                stroke="#3B82F6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMood)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graph 3: Writing Volume */}
      <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Hash size={18} className="text-purple-500" /> Writing Volume
        </h3>
        <div className="h-40 w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData}>
              <defs>
                <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                hide 
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="words" 
                stroke="#A855F7" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorWords)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;