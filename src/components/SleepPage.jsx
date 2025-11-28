import React, { useState, useRef } from 'react';
import { 
  Upload, ChevronLeft, Moon, Clock, Activity, 
  BarChart2, Zap, Calendar, Trash2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { motion } from 'framer-motion';

// --- DATABASE IMPORTS ---
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

// --- CSV PARSING LOGIC ---
const parseSleepCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/);
  const sessions = [];
  let currentBlockStart = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Id,') || lines[i].startsWith('"Id",')) {
      if (currentBlockStart !== -1) {
        const session = processBlock(lines.slice(currentBlockStart, i));
        if (session) sessions.push(session);
      }
      currentBlockStart = i;
    }
  }
  if (currentBlockStart !== -1) {
    const session = processBlock(lines.slice(currentBlockStart));
    if (session) sessions.push(session);
  }
  return sessions;
};

const processBlock = (blockLines) => {
  try {
    if (blockLines.length < 2) return null;

    const splitCSV = (str) => {
      const matches = str.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      return matches.map(m => m.replace(/^"|"$/g, '').trim());
    };

    const header = splitCSV(blockLines[0]);
    const values1 = splitCSV(blockLines[1]);
    
    const geoIndex = header.indexOf('Geo');
    if (geoIndex === -1) return null;

    // 1. Metadata
    const metadata = {};
    for (let i = 0; i <= geoIndex; i++) {
      metadata[header[i]] = values1[i];
    }

    // 2. Time Series
    const timeCols = header.slice(geoIndex + 1).filter(c => c.includes(':'));
    const movementData = [];
    const rawMovementValues = values1.slice(geoIndex + 1, geoIndex + 1 + timeCols.length);

    timeCols.forEach((time, index) => {
      const val = parseFloat(rawMovementValues[index]);
      if (!isNaN(val)) movementData.push({ time, value: val });
    });

    // 3. Sensor Data
    const sensorData = [];
    if (blockLines.length > 2 && blockLines[2].startsWith(',,,,')) {
         const values2 = splitCSV(blockLines[2]);
         const rawSensorValues = values2.slice(geoIndex + 1, geoIndex + 1 + timeCols.length);
         timeCols.forEach((time, index) => {
            const val = parseFloat(rawSensorValues[index]);
            if (!isNaN(val)) sensorData.push({ time, value: val });
         });
    }

    // 4. Hypnogram
    const allValues = values1; 
    const events = allValues.filter(v => v && v.match && v.match(/^[A-Z_]+-\d+$/));
    const startTimeMs = parseInt(metadata.Id);
    const hypnogram = [];
    
    const parsedEvents = events.map(e => {
        const [type, ts] = e.split('-');
        return { type, time: parseInt(ts) };
    }).sort((a, b) => a.time - b.time);

    let currentStage = 2; // Light
    if (parsedEvents.length > 0) {
        parsedEvents.forEach(e => {
            const relativeTimeMin = (e.time - startTimeMs) / 1000 / 60;
            if (e.type.includes('DEEP_START')) currentStage = 0;
            if (e.type.includes('DEEP_END')) currentStage = 2;
            if (e.type.includes('REM_START')) currentStage = 1;
            if (e.type.includes('REM_END')) currentStage = 2;
            if (e.type.includes('LIGHT_START')) currentStage = 2;
            if (e.type.includes('AWAKE_START')) currentStage = 3;
            
            hypnogram.push({
                time: Math.max(0, Math.round(relativeTimeMin)),
                stage: currentStage,
                label: getStageLabel(currentStage)
            });
        });
    }

    return {
      id: metadata.Id, // Used as Primary Key
      dateString: metadata.From,
      startTime: startTimeMs,
      duration: parseFloat(metadata.Hours),
      rating: parseFloat(metadata.Rating),
      deepSleepPerc: parseFloat(metadata.DeepSleep),
      snore: parseInt(metadata.Snore),
      noiseLevel: parseFloat(metadata.Noise),
      metadata,
      movementData,
      sensorData,
      hypnogram
    };
  } catch (e) {
    return null;
  }
};

const getStageLabel = (val) => {
    if (val === 0) return 'Deep';
    if (val === 1) return 'REM';
    if (val === 2) return 'Light';
    return 'Awake';
};

// --- COMPONENTS ---

const StatCard = ({ icon: Icon, label, value, color = "blue" }) => (
    <div className={`bg-${color}-50 p-4 rounded-2xl border border-${color}-100 flex flex-col items-center text-center`}>
        <div className={`p-2 bg-${color}-100 text-${color}-600 rounded-full mb-2`}>
            <Icon size={20} />
        </div>
        <span className="text-2xl font-bold text-gray-800">{value}</span>
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
    </div>
);

const SessionDetail = ({ session, onBack }) => {
    const chartData = session.hypnogram.length > 0 
        ? session.hypnogram 
        : session.movementData.map((m, i) => ({ time: i * 5, stage: 2 }));

    return (
        <div className="pb-24 animate-slideUp">
             <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50 flex items-center gap-3">
                <button onClick={onBack} className="p-2 -ml-2 text-blue-500 rounded-full hover:bg-blue-50">
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Sleep Analysis</h1>
                    <p className="text-xs text-gray-500">{session.dateString}</p>
                </div>
            </div>

            <div className="p-4 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={Clock} label="Duration" value={`${session.duration.toFixed(1)}h`} color="indigo" />
                    <StatCard icon={Moon} label="Deep Sleep" value={`${(session.deepSleepPerc * 100).toFixed(0)}%`} color="purple" />
                    <StatCard icon={Activity} label="Efficiency" value={session.rating > 0 ? `${session.rating}/5` : '-'} color="emerald" />
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Zap size={18} className="text-yellow-500" /> Sleep Stages
                    </h3>
                    <div className="h-48 w-full -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/>
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tickFormatter={getStageLabel} width={50} tick={{fontSize: 10}} />
                                <Tooltip contentStyle={{borderRadius: '12px'}} />
                                <Area type="stepAfter" dataKey="stage" stroke="#4f46e5" strokeWidth={2} fill="url(#splitColor)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-blue-500" /> Actigraphy
                    </h3>
                    <div className="h-40 w-full -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={session.movementData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="time" tick={{fontSize: 10}} minTickGap={30} />
                                <YAxis hide />
                                <Tooltip />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {session.sensorData.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BarChart2 size={18} className="text-orange-500" /> Environment
                        </h3>
                        <div className="h-40 w-full -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={session.sensorData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="time" tick={{fontSize: 10}} minTickGap={30} />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const SleepPage = ({ navigate }) => {
  // Use Dexie's useLiveQuery to automatically fetch and update data
  const sessions = useLiveQuery(() => db.sleep_sessions.orderBy('startTime').reverse().toArray(), []) || [];
  const [selectedSession, setSelectedSession] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseSleepCSV(text);
    
    if (parsed && parsed.length > 0) {
        // Save to IndexedDB (bulkPut handles upsert/duplicates based on ID)
        await db.sleep_sessions.bulkPut(parsed);
        alert(`Imported ${parsed.length} sleep sessions.`);
    } else {
        alert("Failed to parse CSV. Please ensure it's a valid Sleep as Android export.");
    }
    e.target.value = ''; 
  };

  const deleteSession = async (e, id) => {
      e.stopPropagation();
      if(window.confirm("Delete this sleep record?")) {
          await db.sleep_sessions.delete(id);
      }
  };

  if (selectedSession) {
      return <SessionDetail session={selectedSession} onBack={() => setSelectedSession(null)} />;
  }

  return (
    <div className="pb-24 animate-slideUp">
      <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
             <button onClick={() => navigate('more')} className="p-2 -ml-2 text-blue-500 rounded-full hover:bg-blue-50">
                <ChevronLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Sleep Insights</h1>
        </div>
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"
        >
            <Upload size={20} />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
      </div>

      <div className="p-4 space-y-4">
        {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center">
                    <Moon size={40} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">No Data Yet</h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">
                        Export your CSV from Sleep as Android and upload it here.
                    </p>
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-full shadow-lg shadow-indigo-500/30"
                >
                    Import CSV
                </button>
            </div>
        ) : (
            sessions.map((session) => (
                <motion.div 
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer relative group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Moon size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{session.dateString.split(' ')[0]}</h4>
                                <span className="text-xs text-gray-400">{session.dateString.split(' ').slice(1).join(' ')}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold text-gray-900">{session.duration.toFixed(1)}h</span>
                            <span className="text-xs text-green-500 font-medium">
                                {(session.deepSleepPerc * 100).toFixed(0)}% Deep
                            </span>
                        </div>
                    </div>
                    
                    <div className="h-12 w-full mt-3 opacity-50">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={session.movementData}>
                                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <button 
                        onClick={(e) => deleteSession(e, session.id)}
                        className="absolute top-4 right-4 p-2 bg-white text-red-400 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    >
                        <Trash2 size={16} />
                    </button>
                </motion.div>
            ))
        )}
      </div>
    </div>
  );
};