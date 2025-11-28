import React, { useState, useRef, useMemo, useCallback } from 'react';
import { 
  Upload, ChevronLeft, MessageCircle, BarChart2, Calendar, 
  User, MessageSquare, Zap, Trash2, Sliders, Hash, Smile,
  Image as ImageIcon, Clock, AlertCircle, Download, Users
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList 
} from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { toPng } from 'html-to-image'; // NEW IMPORT
import { db } from '../db';

// --- CONFIG ---
const COLORS = [
  '#25D366', '#34B7F1', '#F59E0B', '#8B5CF6', '#EC4899', 
  '#10B981', '#6366F1', '#F43F5E', '#14B8A6', '#A855F7',
  '#ECE5DD', '#128C7E' 
];
const STOP_WORDS = new Set(['the', 'and', 'to', 'of', 'a', 'in', 'is', 'that', 'for', 'i', 'you', 'it', 'on', 'with', 'me', 'this', 'but', 'so', 'be', 'are', 'not', 'was', 'at', 'if', 'my', 'have', 'your', 'do', 'what', 'no', 'can', 'just', 'like', 'all', 'ok', 'we', 'up', 'out', 'how', 'yeah', 'good', 'got', 'did', 'why', 'has', 'too', 'one', 'now', 'see', 'im', 'u', 'its', 'go', 'well', 'will', 'he', 'she', 'or', 'as', 'by', 'an', 'omg', 'lol', 're', 'er']);

// --- PARSER ---
const parseWhatsAppChat = (text) => {
  const lines = text.split(/\r?\n/);
  const messages = [];
  const msgRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}(?:[\s\u202f]?[ap]m)?)\s-\s(.*?):\s(.*)$/i;
  
  let currentMsg = null;

  const parseDate = (dateStr, timeStr) => {
    try {
      const parts = dateStr.split('/').map(Number);
      let day, month, year;
      if (parts[0] > 12) { [day, month, year] = parts; } 
      else if (parts[1] > 12) { [month, day, year] = parts; } 
      else { [day, month, year] = parts; }

      const fullYear = year < 100 ? 2000 + year : year;
      const cleanTime = timeStr.replace(/[\u202f]/g, ' ').toLowerCase();
      let [time, modifier] = cleanTime.split(' ');
      let [hours, minutes] = time.split(':').map(Number);

      if (modifier === 'pm' && hours < 12) hours += 12;
      if (modifier === 'am' && hours === 12) hours = 0;

      return new Date(fullYear, month - 1, day, hours, minutes);
    } catch (e) { return null; }
  };

  lines.forEach(line => {
    if (line.includes('Messages and calls are end-to-end encrypted')) return;

    const match = line.match(msgRegex);
    if (match) {
      if (currentMsg) messages.push(currentMsg);
      const [_, dateStr, timeStr, sender, content] = match;
      const date = parseDate(dateStr, timeStr);
      
      if (date && !isNaN(date.getTime())) {
        currentMsg = { date, sender, content, timestamp: date.getTime() };
      }
    } else if (currentMsg) {
      currentMsg.content += `\n${line}`;
    }
  });
  if (currentMsg) messages.push(currentMsg);
  return messages;
};

// --- ANALYTICS ENGINE ---
const analyzeChat = (messages, chatName) => {
  if (!messages.length) return null;
  messages.sort((a, b) => a.timestamp - b.timestamp);

  const startDate = messages[0].date;
  const endDate = messages[messages.length - 1].date;
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const totalDurationDays = Math.round((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1;

  const stats = {
    id: Date.now().toString(),
    name: chatName.replace('.txt', '').replace('WhatsApp Chat with ', ''),
    totalMessages: messages.length,
    startDate: messages[0].timestamp,
    endDate: messages[messages.length - 1].timestamp,
    totalDurationDays,
    participants: {},
    streaks: { max: { count: 0, start: null, end: null }, current: 0, activeDays: 0, emptyDays: 0, maxGap: { count: 0, start: null, end: null } },
    topWords: [],
    topEmojis: [],
    messageLog: messages.map(m => ({ t: m.timestamp, s: m.sender })) 
  };

  const activeDateSet = new Set();
  const wordCounts = {};
  const emojiCounts = {};
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const mediaRegex = /(<Media omitted>|image omitted|video omitted|GIF omitted|sticker omitted)/i;

  messages.forEach((msg) => {
    if (!stats.participants[msg.sender]) stats.participants[msg.sender] = { count: 0, words: 0, media: 0 };
    stats.participants[msg.sender].count++;
    
    if (mediaRegex.test(msg.content)) {
        stats.participants[msg.sender].media++;
    } else {
        const cleanText = msg.content.toLowerCase();
        const words = cleanText.split(/[\s,.;!?"]+/);
        words.forEach(w => {
            if (w.length > 2 && !STOP_WORDS.has(w) && !w.match(/^\d+$/)) {
                wordCounts[w] = (wordCounts[w] || 0) + 1;
            }
            stats.participants[msg.sender].words++;
        });
        const emojis = msg.content.match(emojiRegex);
        if (emojis) emojis.forEach(e => { emojiCounts[e] = (emojiCounts[e] || 0) + 1; });
    }
    activeDateSet.add(new Date(msg.date.getFullYear(), msg.date.getMonth(), msg.date.getDate()).toDateString());
  });

  let currentStreak = 0;
  let currentGap = 0;
  let streakStart = null;
  let gapStart = null;

  for (let i = 0; i < totalDurationDays; i++) {
      const current = new Date(startDay);
      current.setDate(current.getDate() + i);
      const dateStr = current.toDateString();
      
      if (activeDateSet.has(dateStr)) {
          if (currentStreak === 0) streakStart = dateStr;
          currentStreak++;
          if (currentStreak > stats.streaks.max.count) stats.streaks.max = { count: currentStreak, start: streakStart, end: dateStr };
          
          if (currentGap > 0) {
              if (currentGap > stats.streaks.maxGap.count) {
                  const gapEnd = new Date(current);
                  gapEnd.setDate(gapEnd.getDate() - 1);
                  stats.streaks.maxGap = { count: currentGap, start: gapStart, end: gapEnd.toDateString() };
              }
              currentGap = 0;
          }
      } else {
          if (currentGap === 0) gapStart = dateStr;
          currentGap++;
          currentStreak = 0;
      }
  }
  if (currentGap > 0 && currentGap > stats.streaks.maxGap.count) {
      const gapEnd = new Date(endDay); 
      stats.streaks.maxGap = { count: currentGap, start: gapStart, end: gapEnd.toDateString() };
  }

  stats.streaks.activeDays = activeDateSet.size;
  stats.streaks.emptyDays = totalDurationDays - activeDateSet.size;
  stats.topWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }));
  stats.topEmojis = Object.entries(emojiCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([char, count]) => ({ char, count }));
  
  stats.baseChartData = Object.keys(stats.participants).map(p => ({
    name: p,
    messages: stats.participants[p].count,
    words: stats.participants[p].words,
    media: stats.participants[p].media
  }));

  return stats;
};

// --- COMPONENTS ---

const StatCard = ({ icon: Icon, label, value, subLabel, color = "green" }) => (
    <div className={`bg-${color}-50 p-4 rounded-2xl border border-${color}-100 flex flex-col items-center text-center flex-1`}>
        <div className={`p-2 bg-${color}-100 text-${color}-600 rounded-full mb-2`}>
            <Icon size={20} />
        </div>
        <span className="text-xl font-bold text-gray-800">{value}</span>
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mt-1">{label}</span>
        {subLabel && <span className="text-[9px] text-gray-400 mt-1 block max-w-[120px] leading-tight">{subLabel}</span>}
    </div>
);

const ChatDetail = ({ data, onBack }) => {
  const [initiationThreshold, setInitiationThreshold] = useState(6);
  const [showAllParticipants, setShowAllParticipants] = useState(false); // NEW TOGGLE
  const chartRef = useRef(null);

  // --- CHART DATA LOGIC ---
  const chartData = useMemo(() => {
      if (!data.messageLog) return [];

      const initiations = {};
      Object.keys(data.participants).forEach(p => initiations[p] = 0);
      const THRESHOLD_MS = initiationThreshold * 60 * 60 * 1000;

      data.messageLog.forEach((msg, i) => {
          if (i > 0) {
              const prev = data.messageLog[i-1];
              if (msg.t - prev.t > THRESHOLD_MS) {
                  initiations[msg.s] = (initiations[msg.s] || 0) + 1;
              }
          } else {
              initiations[msg.s] = 1; 
          }
      });

      let fullData = data.baseChartData.map(d => ({
          ...d,
          initiations: initiations[d.name] || 0
      }));

      fullData.sort((a, b) => b.messages - a.messages);

      // --- GROUPING LOGIC (CONDITIONAL) ---
      const MAX_ITEMS = 12;
      if (!showAllParticipants && fullData.length > MAX_ITEMS) {
          const top = fullData.slice(0, MAX_ITEMS);
          const others = fullData.slice(MAX_ITEMS);
          
          const othersAgg = others.reduce((acc, curr) => ({
              name: 'Others',
              messages: acc.messages + curr.messages,
              words: acc.words + curr.words,
              media: acc.media + curr.media,
              initiations: acc.initiations + curr.initiations
          }), { name: 'Others', messages: 0, words: 0, media: 0, initiations: 0 });

          return [...top, othersAgg];
      }

      return fullData;
  }, [data, initiationThreshold, showAllParticipants]);

  const formatDateShort = (dateStr) => {
      if(!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  };

  // --- DOWNLOAD HANDLER ---
  const handleDownloadGraph = useCallback(() => {
    if (chartRef.current === null) return;

    // Use html-to-image to capture the chart container
    toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `${data.name}-activity-graph.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Download failed', err);
        alert('Failed to generate image. Please try again.');
      });
  }, [data.name]);

  // Dynamic Height: If showing all, expand the container so bars don't get squished
  const barChartHeight = Math.max(300, chartData.length * 40);

  return (
    <div className="pb-24 animate-slideUp">
      <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-green-600 rounded-full hover:bg-green-50">
            <ChevronLeft size={24} />
        </button>
        <div>
            <h1 className="text-xl font-bold text-gray-900 truncate max-w-[200px]">{data.name}</h1>
            <p className="text-xs text-gray-500">
                {new Date(data.startDate).toLocaleDateString()} — {new Date(data.endDate).toLocaleDateString()}
            </p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* STATS GRID */}
        <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Calendar} label="Total Days" value={data.totalDurationDays} color="indigo" />
            <StatCard icon={MessageSquare} label="Active Days" value={data.streaks.activeDays} color="green" />
            <StatCard icon={AlertCircle} label="Empty Days" value={data.streaks.emptyDays} color="gray" />
        </div>
        <div className="grid grid-cols-2 gap-3">
            <StatCard 
                icon={Zap} label="Longest Streak" value={`${data.streaks.max.count} Days`} 
                subLabel={data.streaks.max.start ? `${formatDateShort(data.streaks.max.start)} - ${formatDateShort(data.streaks.max.end)}` : 'N/A'} color="yellow" 
            />
            <StatCard 
                icon={User} label="Longest Gap" value={`${data.streaks.maxGap.count} Days`} 
                subLabel={data.streaks.maxGap.start ? `${formatDateShort(data.streaks.maxGap.start)} - ${formatDateShort(data.streaks.maxGap.end)}` : 'No gaps'} color="red" 
            />
        </div>

        {/* ACTIVITY GRAPH */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100" ref={chartRef}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <BarChart2 size={18} className="text-green-600" /> Activity
                </h3>
                
                {/* CONTROLS */}
                <div className="flex gap-2">
                    {/* Toggle Show All */}
                    <button 
                        onClick={() => setShowAllParticipants(!showAllParticipants)}
                        className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-[10px] font-bold uppercase ${showAllParticipants ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}
                    >
                        <Users size={14} /> {showAllParticipants ? 'All' : 'Top 12'}
                    </button>
                    {/* Download Image */}
                    <button 
                        onClick={handleDownloadGraph}
                        className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 border border-gray-200"
                        title="Download Image"
                    >
                        <Download size={14} />
                    </button>
                </div>
            </div>

            <div style={{ height: barChartHeight, width: '100%', marginLeft: '-10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        
                        <Bar dataKey="messages" name="Messages" fill="#25D366" radius={[0, 4, 4, 0]} barSize={16}>
                            <LabelList dataKey="messages" position="right" style={{fontSize: 10, fill: '#666'}} />
                        </Bar>
                        <Bar dataKey="words" name="Words" fill="#34B7F1" radius={[0, 4, 4, 0]} barSize={16}>
                            <LabelList dataKey="words" position="right" style={{fontSize: 10, fill: '#666'}} />
                        </Bar>
                        <Bar dataKey="media" name="Media" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16}>
                            <LabelList dataKey="media" position="right" style={{fontSize: 10, fill: '#666'}} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 mt-4 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-gray-500"><div className="w-2 h-2 bg-[#25D366] rounded-sm"></div> Msgs</div>
                <div className="flex items-center gap-1 text-xs text-gray-500"><div className="w-2 h-2 bg-[#34B7F1] rounded-sm"></div> Words</div>
                <div className="flex items-center gap-1 text-xs text-gray-500"><div className="w-2 h-2 bg-[#8b5cf6] rounded-sm"></div> Media</div>
            </div>
        </div>

        {/* STARTERS PIE CHART */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={18} className="text-orange-500" /> Starters
                </h3>
                <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg">
                    <Sliders size={12} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-600">{initiationThreshold}h Silence</span>
                    <input 
                        type="range" min="1" max="48" step="1" 
                        value={initiationThreshold}
                        onChange={(e) => setInitiationThreshold(parseInt(e.target.value))}
                        className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="initiations"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                        >
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.name === 'Others' ? '#9CA3AF' : COLORS[index % COLORS.length]} 
                                />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            {/* Legend for Pie Chart (Top 12 only for cleanliness) */}
            <div className="flex flex-wrap justify-center gap-3">
                {chartData.slice(0, 12).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.name === 'Others' ? '#9CA3AF' : COLORS[index % COLORS.length] }} />
                        <span className="text-xs text-gray-500">{entry.name} ({entry.initiations})</span>
                    </div>
                ))}
            </div>
        </div>

        {/* TOP WORDS & EMOJIS */}
        <div className="grid grid-cols-1 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Hash size={18} className="text-purple-500" /> Top Words
                </h3>
                <div className="flex flex-wrap gap-2">
                    {data.topWords.map((w, i) => (
                        <div key={i} className="flex items-center bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                            {w.word}
                            <span className="ml-1.5 opacity-60 text-[10px]">{w.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {data.topEmojis.length > 0 && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Smile size={18} className="text-yellow-500" /> Top Emojis
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {data.topEmojis.map((e, i) => (
                            <div key={i} className="flex flex-col items-center bg-gray-50 p-2 rounded-xl min-w-[50px]">
                                <span className="text-2xl mb-1">{e.char}</span>
                                <span className="text-[10px] text-gray-500 font-bold">{e.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export const WhatsAppPage = ({ navigate }) => {
  const chats = useLiveQuery(() => db.chat_analytics.toArray(), []) || [];
  const [selectedChat, setSelectedChat] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsedMsgs = parseWhatsAppChat(text);
    
    if (parsedMsgs.length > 0) {
        const stats = analyzeChat(parsedMsgs, file.name);
        if (stats) {
            await db.chat_analytics.put(stats);
            alert("Analysis Complete!");
        }
    } else {
        alert("Could not parse messages. Ensure date format is supported.");
    }
    e.target.value = '';
  };

  const deleteChat = async (e, id) => {
      e.stopPropagation();
      if(window.confirm("Delete this analysis?")) {
          await db.chat_analytics.delete(id);
      }
  };

  if (selectedChat) return <ChatDetail data={selectedChat} onBack={() => setSelectedChat(null)} />;

  return (
    <div className="pb-24 animate-slideUp">
      <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
             <button onClick={() => navigate('more')} className="p-2 -ml-2 text-green-600 rounded-full hover:bg-green-50">
                <ChevronLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Chat Analytics</h1>
        </div>
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-md"
        >
            <Upload size={20} />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt" />
      </div>

      <div className="p-4 space-y-4">
        {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                    <MessageCircle size={40} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Import Chat</h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">
                        Export a chat from WhatsApp (without media) and upload the .txt file here.
                    </p>
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-green-600 text-white font-medium rounded-full shadow-lg shadow-green-500/30"
                >
                    Select File
                </button>
            </div>
        ) : (
            chats.map((chat) => (
                <div 
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer relative group flex justify-between items-center"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-lg">
                            {chat.name.charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">{chat.name}</h4>
                            <p className="text-xs text-gray-500">{chat.totalMessages.toLocaleString()} messages</p>
                        </div>
                    </div>
                    <ChevronLeft size={20} className="text-gray-300 rotate-180" />
                    
                    <button 
                        onClick={(e) => deleteChat(e, chat.id)}
                        className="absolute top-4 right-4 p-2 bg-white text-red-400 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))
        )}
      </div>
    </div>
  );
};