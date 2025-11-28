import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, ChevronLeft, MessageCircle, BarChart2, Calendar, 
  User, MessageSquare, Zap, Trash2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

// --- CONFIG ---
const COLORS = ['#25D366', '#34B7F1', '#ECE5DD', '#128C7E']; // WhatsApp Brand Colors

// --- PARSER ---
const parseWhatsAppChat = (text) => {
  const lines = text.split(/\r?\n/);
  const messages = [];
  // Regex for "Date, Time - Sender: Message"
  // Supports: "11/19/25, 13:25 - Name: Msg" AND "19/11/2025, 1:25 pm - Name: Msg"
  const msgRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?:\s?[ap]m)?)\s-\s(.*?):\s(.*)$/i;
  
  let currentMsg = null;

  lines.forEach(line => {
    // Filter system messages (e.g., encryption warnings)
    if (line.includes('Messages and calls are end-to-end encrypted')) return;

    const match = line.match(msgRegex);
    if (match) {
      // New Message Found
      if (currentMsg) messages.push(currentMsg);
      
      const [_, dateStr, timeStr, sender, content] = match;
      const date = new Date(`${dateStr} ${timeStr}`); // Note: Might need better date parsing for DD/MM vs MM/DD based on locale, assuming MM/DD for now based on file
      
      currentMsg = {
        date,
        sender,
        content,
        timestamp: date.getTime()
      };
    } else if (currentMsg) {
      // Multiline message continuation
      currentMsg.content += `\n${line}`;
    }
  });
  if (currentMsg) messages.push(currentMsg);
  
  return messages;
};

// --- ANALYTICS ENGINE ---
const analyzeChat = (messages, chatName) => {
  if (!messages.length) return null;

  const stats = {
    id: Date.now().toString(),
    name: chatName.replace('.txt', '').replace('WhatsApp Chat with ', ''),
    totalMessages: messages.length,
    startDate: messages[0].timestamp,
    endDate: messages[messages.length - 1].timestamp,
    participants: {},
    timeline: {}, // For graphs
    streaks: { current: 0, max: 0, gapMax: 0, totalActiveDays: 0 },
    initiations: {} // Who starts convos
  };

  const dates = new Set();
  let lastDate = null;
  let currentStreak = 0;
  let maxGap = 0;
  
  // Gap threshold for "Starting a conversation" (e.g., 6 hours silence)
  const INITIATION_THRESHOLD = 6 * 60 * 60 * 1000; 

  messages.forEach((msg, index) => {
    // 1. Participant Stats
    if (!stats.participants[msg.sender]) {
      stats.participants[msg.sender] = { count: 0, words: 0 };
      stats.initiations[msg.sender] = 0;
    }
    stats.participants[msg.sender].count++;
    stats.participants[msg.sender].words += msg.content.trim().split(/\s+/).length;

    // 2. Dates & Streaks
    const dateStr = msg.date.toDateString();
    if (!dates.has(dateStr)) {
      dates.add(dateStr);
      stats.timeline[dateStr] = 0; // Initialize for graph
      
      if (lastDate) {
        const diffDays = Math.round((msg.date - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          stats.streaks.max = Math.max(stats.streaks.max, currentStreak);
          currentStreak = 1;
          // Calculate Gap
          if (diffDays > 1) maxGap = Math.max(maxGap, diffDays - 1);
        }
      } else {
        currentStreak = 1;
      }
      lastDate = msg.date;
    }
    stats.timeline[dateStr]++;

    // 3. Initiation
    if (index > 0) {
      const prev = messages[index-1];
      if (msg.timestamp - prev.timestamp > INITIATION_THRESHOLD) {
        stats.initiations[msg.sender]++;
      }
    }
  });

  // Finalize stats
  stats.streaks.max = Math.max(stats.streaks.max, currentStreak);
  stats.streaks.gapMax = maxGap;
  stats.streaks.totalActiveDays = dates.size;
  
  // Normalize participant data for charts
  stats.chartData = Object.keys(stats.participants).map(p => ({
    name: p,
    messages: stats.participants[p].count,
    words: stats.participants[p].words,
    initiations: stats.initiations[p]
  }));

  return stats;
};

// --- COMPONENTS ---

const StatCard = ({ icon: Icon, label, value, color = "green" }) => (
    <div className={`bg-${color}-50 p-4 rounded-2xl border border-${color}-100 flex flex-col items-center text-center flex-1`}>
        <div className={`p-2 bg-${color}-100 text-${color}-600 rounded-full mb-2`}>
            <Icon size={20} />
        </div>
        <span className="text-xl font-bold text-gray-800">{value}</span>
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mt-1">{label}</span>
    </div>
);

const ChatDetail = ({ data, onBack }) => {
  const durationDays = Math.ceil((data.endDate - data.startDate) / (1000 * 60 * 60 * 24));
  
  return (
    <div className="pb-24 animate-slideUp">
      <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-green-600 rounded-full hover:bg-green-50">
            <ChevronLeft size={24} />
        </button>
        <div>
            <h1 className="text-xl font-bold text-gray-900 truncate max-w-[200px]">{data.name}</h1>
            <p className="text-xs text-gray-500">{new Date(data.startDate).toLocaleDateString()} — {new Date(data.endDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* 1. KEY STATS */}
        <div className="grid grid-cols-2 gap-3">
            <StatCard icon={MessageSquare} label="Total Msgs" value={data.totalMessages.toLocaleString()} color="green" />
            <StatCard icon={Calendar} label="Days Talked" value={data.streaks.totalActiveDays} color="blue" />
        </div>
        <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Zap} label="Longest Streak" value={`${data.streaks.max} Days`} color="yellow" />
            <StatCard icon={User} label="Longest Gap" value={`${data.streaks.gapMax} Days`} color="red" />
        </div>

        {/* 2. ACTIVITY COMPARISON (BAR CHART) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 size={18} className="text-green-600" /> Activity Comparison
            </h3>
            <div className="h-64 w-full -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="messages" name="Messages" fill="#25D366" radius={[0, 4, 4, 0]} barSize={20} />
                        <Bar dataKey="words" name="Words" fill="#34B7F1" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500"><div className="w-3 h-3 bg-[#25D366] rounded-sm"></div> Messages</div>
                <div className="flex items-center gap-1 text-xs text-gray-500"><div className="w-3 h-3 bg-[#34B7F1] rounded-sm"></div> Words</div>
            </div>
        </div>

        {/* 3. WHO STARTS? (PIE CHART) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap size={18} className="text-orange-500" /> Conversation Starters
            </h3>
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data.chartData}
                            dataKey="initiations"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                        >
                            {data.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
                {data.chartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-xs text-gray-500">{entry.name} ({entry.initiations})</span>
                    </div>
                ))}
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-4">
                *Starts a chat after {'>'}6 hours of silence.
            </p>
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