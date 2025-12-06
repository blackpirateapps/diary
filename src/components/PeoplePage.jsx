import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, User, Trash2, Camera, Heart, Calendar, X, ChevronLeft, MapPin, 
  Cake, Star, Gift, Briefcase, Home, Music, Image as ImageIcon, ArrowRight, Quote,
  Smile, TrendingUp, Hash, Clock, AlertCircle, Sparkles
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useBlobUrl } from '../db';
import { compressImage } from './editor/editorUtils'; 

// --- ICON CONFIGURATION ---
const ICON_MAP = {
  Calendar: Calendar,
  Cake: Cake,
  Heart: Heart,
  Star: Star,
  Gift: Gift,
  Briefcase: Briefcase,
  Home: Home,
  Music: Music,
};

const DATE_TEMPLATES = [
  { label: 'Birthday', icon: 'Cake' },
  { label: 'Anniversary', icon: 'Heart' },
  { label: 'First Met', icon: 'Star' },
  { label: 'Custom', icon: 'Calendar' }
];

const FILTER_TYPES = ['All', 'Friend', 'Family', 'Partner', 'Work', 'Other'];

// --- HELPER: LOGIC & MATH ---
const extractMentionContext = (content, personId, personName) => {
  if (!content) return "Mentioned in this entry.";
  try {
    const json = JSON.parse(content);
    if (json.root && json.root.children) {
      for (const block of json.root.children) {
        if (block.type === 'paragraph' || block.type === 'list-item' || block.type === 'quote') {
          const children = block.children || [];
          const hasMention = children.some(node => 
            (node.type === 'mention' && node.id === personId) ||
            (node.text && node.text.toLowerCase().includes(personName.toLowerCase()))
          );
          if (hasMention) return children.map(n => n.text || n.mention || '').join('');
        }
      }
    }
  } catch (e) {}
  const text = typeof content === 'string' ? content : '';
  const sentences = text.split(/[.!?\n]/);
  const match = sentences.find(s => s.toLowerCase().includes(personName.toLowerCase()));
  return match ? match.trim() + '.' : "Mentioned in this entry.";
};

const getBirthdayCountdown = (dates) => {
  const bday = dates?.find(d => d.label === 'Birthday');
  if (!bday) return null;

  const today = new Date();
  const nextBday = new Date(bday.date);
  nextBday.setFullYear(today.getFullYear());
  
  if (nextBday < today) {
    nextBday.setFullYear(today.getFullYear() + 1);
  }
  
  const diffTime = Math.abs(nextBday - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
};

// --- COMPONENT: GALLERY IMAGE ---
const GalleryThumb = ({ src, onClick, onDelete }) => {
  const url = useBlobUrl(src);
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group">
      {url ? (
        <img 
          src={url} 
          onClick={onClick}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer" 
          alt="Memory" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
           <ImageIcon size={20} />
        </div>
      )}
      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1 right-1 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};

// --- COMPONENT: TIMELINE SNIPPET CARD ---
const TimelineEntryCard = ({ entry, person, onClick }) => {
  const snippet = useMemo(() => 
    extractMentionContext(entry.content, person.id, person.name), 
  [entry.content, person]);

  const dateObj = new Date(entry.date);

  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      <div className="absolute left-[11px] top-8 bottom-0 w-[2px] bg-gray-200 dark:bg-gray-800 last:hidden" />
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
               {entry.mood && <>• <span className="text-[var(--accent-500)]">Mood: {entry.mood}/10</span></>}
             </p>
           </div>
           <button 
             onClick={() => onClick(entry)}
             className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-[var(--accent-50)] text-xs font-bold text-gray-600 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-1"
           >
             Read <ArrowRight size={12} />
           </button>
        </div>

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

// --- COMPONENT: PERSON CARD (LIST VIEW) ---
const PersonCard = ({ person, onClick }) => {
  const imageUrl = useBlobUrl(person.image);
  const daysUntilBirthday = getBirthdayCountdown(person.dates);
  const isBirthdaySoon = daysUntilBirthday !== null && daysUntilBirthday <= 14;

  return (
    <div 
      onClick={() => onClick(person)} 
      className={`bg-white dark:bg-gray-900 p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all shadow-sm active:scale-[0.98] group relative overflow-hidden
        ${isBirthdaySoon ? 'border-[var(--accent-400)] ring-1 ring-[var(--accent-100)]' : 'border-gray-100 dark:border-gray-800 hover:border-[var(--accent-500)]'}
      `}
    >
      {/* Birthday Indicator */}
      {isBirthdaySoon && (
        <div className="absolute top-0 right-0 bg-[var(--accent-500)] text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl z-10 flex items-center gap-1">
          <Cake size={10} />
          {daysUntilBirthday === 0 ? "Today!" : `In ${daysUntilBirthday}d`}
        </div>
      )}

      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center border-2 border-transparent group-hover:border-[var(--accent-500)] transition-colors">
        {imageUrl ? (
           <img src={imageUrl} className="w-full h-full object-cover" alt={person.name} />
        ) : (
           <User size={24} className="text-gray-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-gray-900 dark:text-white truncate text-lg group-hover:text-[var(--accent-600)] transition-colors">{person.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {person.relationship}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: PROFILE DETAIL VIEW ---
const PersonProfile = ({ person, onBack, onEditEntry, onEditProfile }) => {
  const imageUrl = useBlobUrl(person.image);
  
  // Find entries where this person is tagged
  const entries = useLiveQuery(() => 
    db.entries
      .where('people').equals(person.id)
      .reverse()
      .sortBy('date'), 
  [person.id]) || [];

  // --- DERIVED STATS ---
  const stats = useMemo(() => {
    if (!entries.length) return null;

    // 1. Vibe Check (Avg Mood)
    const moodSum = entries.reduce((acc, e) => acc + (e.mood || 5), 0);
    const avgMood = (moodSum / entries.length).toFixed(1);

    // 2. Last Spoken
    const lastDate = new Date(entries[0].date);
    const daysSince = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));

    // 3. Tag Cloud
    const tagCounts = {};
    entries.forEach(e => {
      if(e.tags) e.tags.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1);
    });
    const topTags = Object.entries(tagCounts)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => tag);

    // 4. Activity Heatmap (Last 12 months)
    const monthCounts = new Array(12).fill(0);
    const now = new Date();
    entries.forEach(e => {
        const d = new Date(e.date);
        const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (monthsAgo >= 0 && monthsAgo < 12) {
            monthCounts[11 - monthsAgo]++; 
        }
    });

    return { avgMood, daysSince, topTags, monthCounts };
  }, [entries]);

  const formatDate = (dateStr, hasYear) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'long', 
      day: 'numeric', 
      year: hasYear ? 'numeric' : undefined 
    });
  };

  const daysUntilBirthday = getBirthdayCountdown(person.dates);

  return (
    <div className="bg-[#F3F4F6] dark:bg-gray-950 min-h-screen animate-slideUp absolute inset-0 z-30 flex flex-col">
        {/* Banner */}
        <div className="relative h-64 bg-gradient-to-b from-gray-200 to-[#F3F4F6] dark:from-gray-900 dark:to-gray-950">
            {imageUrl && (
                <>
                    <img src={imageUrl} className="w-full h-full object-cover opacity-30 blur-xl scale-110" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#F3F4F6] dark:from-gray-950 via-transparent to-transparent" />
                </>
            )}
            
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
               <button onClick={onBack} className="p-2.5 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-gray-900 dark:text-white hover:scale-105 transition-all shadow-sm">
                  <ChevronLeft size={24} />
               </button>
               <button 
                  onClick={() => onEditProfile(person)} 
                  className="px-4 py-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-xs font-bold text-gray-900 dark:text-white hover:scale-105 transition-all shadow-sm"
               >
                  Edit Profile
               </button>
            </div>
        </div>

        {/* Profile Content */}
        <div className="px-6 -mt-24 relative flex-1 overflow-y-auto no-scrollbar pb-24">
            <div className="flex flex-col items-center text-center mb-8">
                {/* Avatar */}
                <div className="relative">
                    <div className="w-32 h-32 rounded-full p-1.5 bg-white dark:bg-gray-950 shadow-xl mb-4">
                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center border border-gray-200 dark:border-gray-800">
                            {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" alt={person.name} /> : <User size={48} className="text-gray-300" />}
                        </div>
                    </div>
                    {daysUntilBirthday !== null && daysUntilBirthday <= 30 && (
                        <div className="absolute -right-2 top-0 bg-white dark:bg-gray-800 text-pink-500 p-2 rounded-full shadow-lg animate-bounce border border-gray-100 dark:border-gray-700">
                            <Cake size={20} />
                        </div>
                    )}
                </div>

                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{person.name}</h1>
                <span className="text-xs font-bold tracking-widest uppercase text-[var(--accent-600)] dark:text-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-gray-900 px-3 py-1 rounded-full mb-6 ring-1 ring-[var(--accent-100)] dark:ring-gray-800">
                   {person.relationship}
                </span>
                
                {person.description && (
                    <div className="prose dark:prose-invert prose-sm text-gray-600 dark:text-gray-400 max-w-sm text-center leading-relaxed">
                       {person.description}
                    </div>
                )}
            </div>

            <div className="max-w-2xl mx-auto space-y-8">
                
                {/* --- ANALYTICS DASHBOARD --- */}
                {stats && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={14} /> Insights
                            </h3>
                            {/* Heatmap */}
                            <div className="flex items-end gap-[3px] h-6">
                                {stats.monthCounts.map((count, i) => (
                                    <div 
                                        key={i} 
                                        className={`w-1.5 rounded-sm ${count > 0 ? 'bg-[var(--accent-500)]' : 'bg-gray-100 dark:bg-gray-800'}`}
                                        style={{ height: count > 0 ? `${Math.min(100, Math.max(20, count * 20))}%` : '20%' }}
                                        title={`${count} entries`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Last Spoken */}
                            <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                <Clock size={20} className="mx-auto text-blue-400 mb-1" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {stats.daysSince === 0 ? 'Today' : `${stats.daysSince}d`}
                                </div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Last Seen</div>
                            </div>

                            {/* Vibe Check */}
                            <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                <Smile size={20} className="mx-auto text-yellow-500 mb-1" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.avgMood}</div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Avg Mood</div>
                            </div>

                             {/* Entry Count */}
                             <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                <TrendingUp size={20} className="mx-auto text-green-500 mb-1" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{entries.length}</div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Entries</div>
                            </div>
                        </div>

                        {/* Top Tags */}
                        {stats.topTags.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex flex-wrap justify-center gap-2">
                                    {stats.topTags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400">
                                            <Hash size={10} /> {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Nudge if inactive */}
                        {stats.daysSince > 30 && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-orange-500 font-medium bg-orange-50 dark:bg-orange-900/20 py-2 rounded-lg">
                                <AlertCircle size={14} /> It's been a while since you wrote about them.
                            </div>
                        )}
                    </div>
                )}

                {/* --- GIFT IDEAS --- */}
                {person.giftIdeas && person.giftIdeas.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-lg">
                                <Gift size={16} />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Gift Ideas</h3>
                        </div>
                        <ul className="space-y-2">
                            {person.giftIdeas.map((gift, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                                    {gift}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* --- IMPORTANT DATES --- */}
                {person.dates && person.dates.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {person.dates.map((d, i) => {
                      const Icon = ICON_MAP[d.icon] || Calendar;
                      const isBday = d.label === 'Birthday';
                      return (
                        <div key={i} className={`bg-white dark:bg-gray-900 p-3.5 rounded-2xl border flex items-center gap-3 shadow-sm ${isBday && daysUntilBirthday <= 14 ? 'border-[var(--accent-300)] ring-1 ring-[var(--accent-100)]' : 'border-gray-100 dark:border-gray-800'}`}>
                           <div className="p-2.5 bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-600)] dark:text-[var(--accent-400)] rounded-xl">
                             <Icon size={18} />
                           </div>
                           <div className="text-left">
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{d.label}</p>
                             <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(d.date, d.hasYear)}</p>
                             {isBday && daysUntilBirthday !== null && (
                                 <span className="text-[10px] text-[var(--accent-500)] font-bold block -mt-0.5">
                                     {daysUntilBirthday === 0 ? "Today!" : `In ${daysUntilBirthday} days`}
                                 </span>
                             )}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* --- GALLERY --- */}
                {person.gallery && person.gallery.length > 0 && (
                  <div>
                     <div className="flex items-center gap-2 mb-4">
                        <ImageIcon size={16} className="text-[var(--accent-500)]" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Shared Moments</h3>
                     </div>
                     <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                       {person.gallery.map((img, i) => (
                         <GalleryThumb key={i} src={img} />
                       ))}
                     </div>
                  </div>
                )}

                {/* --- TIMELINE --- */}
                <div>
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-lg"><Calendar size={16} /></div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Interactions</h3>
                      </div>
                   </div>

                   {entries.length === 0 ? (
                       <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-dashed border-gray-200 dark:border-gray-800">
                           <p className="text-gray-400 font-medium">No journal entries yet.</p>
                           <p className="text-xs text-gray-500 mt-1">Mention <span className="font-bold text-[var(--accent-500)]">@{person.name}</span> in your entries to build this timeline.</p>
                       </div>
                   ) : (
                       <div className="space-y-0">
                           {entries.map(entry => (
                               <TimelineEntryCard 
                                 key={entry.id} 
                                 entry={entry} 
                                 person={person}
                                 onClick={onEditEntry} 
                               />
                           ))}
                       </div>
                   )}
                </div>
            </div>
        </div>
    </div>
  );
};

// --- COMPONENT: ADD/EDIT MODAL ---
const PersonModal = ({ person, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState(person || { 
    name: '', 
    relationship: 'Friend', 
    description: '', 
    image: null,
    dates: [],
    gallery: [],
    giftIdeas: []
  });
  
  const [giftInput, setGiftInput] = useState('');
  const fileRef = useRef(null);
  const galleryInputRef = useRef(null);
  const avatarUrl = useBlobUrl(formData.image);

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setFormData(p => ({ ...p, image: compressed }));
      } catch (err) { alert('Image too large or invalid'); }
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newImages = [];
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        newImages.push(compressed);
      } catch (err) { console.error(err); }
    }
    setFormData(p => ({ ...p, gallery: [...(p.gallery || []), ...newImages] }));
  };

  const addGift = () => {
    if(!giftInput.trim()) return;
    setFormData(p => ({ ...p, giftIdeas: [...(p.giftIdeas || []), giftInput.trim()] }));
    setGiftInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-950 w-full max-w-lg md:rounded-3xl rounded-t-3xl p-6 animate-slideUp border border-gray-100 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        
        <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold text-gray-900 dark:text-white">{person ? 'Edit Contact' : 'New Contact'}</h2>
             {person && (
                 <button onClick={() => onDelete(person.id)} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors" title="Delete Contact">
                     <Trash2 size={18} />
                 </button>
             )}
        </div>
        
        <div className="flex justify-center mb-8">
          <div onClick={() => fileRef.current.click()} className="relative w-32 h-32 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[var(--accent-500)] group transition-all">
            {avatarUrl ? (
                <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
            ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[var(--accent-500)]">
                    <Camera size={28} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Photo</span>
                </div>
            )}
            <input type="file" ref={fileRef} className="hidden" onChange={handleAvatar} accept="image/*" />
          </div>
        </div>

        <div className="space-y-5 mb-8">
          <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">Full Name</label>
              <input 
                placeholder="e.g. Sarah Connor" 
                className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3.5 rounded-xl border border-transparent focus:border-[var(--accent-500)] focus:outline-none transition-all font-bold text-lg"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                autoFocus
              />
          </div>
          
          <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">Relationship</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3.5 rounded-xl border-r-8 border-transparent focus:border-[var(--accent-500)] focus:outline-none transition-all font-medium appearance-none"
                value={formData.relationship}
                onChange={e => setFormData({...formData, relationship: e.target.value})}
              >
                {FILTER_TYPES.filter(t => t !== 'All').map(r => <option key={r}>{r}</option>)}
              </select>
          </div>

          <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">Description</label>
              <textarea 
                placeholder="How we met, favorite things..." 
                className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3.5 rounded-xl border border-transparent focus:border-[var(--accent-500)] focus:outline-none transition-all font-medium min-h-[80px] resize-none"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
          </div>
        </div>

        {/* Dates Section */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
           <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                 <Calendar size={14} /> Important Dates
              </label>
              <div className="flex gap-1">
                 {DATE_TEMPLATES.map(t => (
                   <button 
                     key={t.label} 
                     onClick={() => setFormData(p => ({
                        ...p,
                        dates: [...(p.dates || []), { label: t.label, icon: t.icon, date: new Date().toISOString().split('T')[0], hasYear: true }]
                      }))}
                     className="p-1.5 bg-white dark:bg-gray-800 hover:bg-[var(--accent-50)] text-gray-400 hover:text-[var(--accent-600)] rounded-lg transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
                   >
                     {React.createElement(ICON_MAP[t.icon] || Calendar, { size: 14 })}
                   </button>
                 ))}
              </div>
           </div>
           
           <div className="space-y-3">
              {(formData.dates || []).map((dateItem, idx) => {
                 const SelectedIcon = ICON_MAP[dateItem.icon] || Calendar;
                 return (
                   <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col gap-2 shadow-sm">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-500">
                            <SelectedIcon size={16} />
                         </div>
                         <input 
                           className="flex-1 bg-transparent text-sm font-bold text-gray-900 dark:text-white border-b border-transparent focus:border-[var(--accent-500)] outline-none"
                           value={dateItem.label}
                           onChange={e => {
                             const newDates = [...formData.dates];
                             newDates[idx].label = e.target.value;
                             setFormData({...formData, dates: newDates});
                           }}
                         />
                         <button onClick={() => setFormData(p => ({ ...p, dates: p.dates.filter((_, i) => i !== idx) }))} className="text-gray-400 hover:text-red-500 p-1"><X size={16} /></button>
                      </div>
                      <div className="pl-10">
                         <input 
                           type="date" 
                           className="bg-transparent text-xs text-gray-600 dark:text-gray-400 outline-none"
                           value={dateItem.date}
                           onChange={e => {
                             const newDates = [...formData.dates];
                             newDates[idx].date = e.target.value;
                             setFormData({...formData, dates: newDates});
                           }}
                         />
                      </div>
                   </div>
                 );
              })}
           </div>
        </div>

        {/* Gift Tracker */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Gift size={14} /> Gift Ideas
           </label>
           <div className="flex gap-2 mb-3">
              <input 
                 className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-500)]"
                 placeholder="Add an idea..."
                 value={giftInput}
                 onChange={e => setGiftInput(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && addGift()}
              />
              <button onClick={addGift} className="px-3 bg-[var(--accent-500)] text-white rounded-lg"><Plus size={16}/></button>
           </div>
           <div className="flex flex-wrap gap-2">
              {(formData.giftIdeas || []).map((idea, idx) => (
                  <span key={idx} className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
                     {idea}
                     <button onClick={() => setFormData(p => ({ ...p, giftIdeas: p.giftIdeas.filter((_, i) => i !== idx) }))} className="p-1 hover:text-red-500"><X size={12} /></button>
                  </span>
              ))}
           </div>
        </div>

        {/* Gallery */}
        <div className="mb-8">
           <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={14} /> Photos
              </label>
              <button 
                onClick={() => galleryInputRef.current.click()}
                className="flex items-center gap-1 px-3 py-1.5 bg-[var(--accent-50)] text-[var(--accent-600)] rounded-lg text-xs font-bold hover:bg-[var(--accent-100)] transition-colors"
              >
                <Plus size={12} /> Add
              </button>
              <input type="file" multiple ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleGalleryUpload} />
           </div>
           
           <div className="grid grid-cols-4 gap-2">
              {(formData.gallery || []).map((img, idx) => (
                 <GalleryThumb 
                   key={idx} 
                   src={img} 
                   onDelete={() => setFormData(p => ({ ...p, gallery: p.gallery.filter((_, i) => i !== idx) }))} 
                 />
              ))}
           </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-1 py-3.5 rounded-xl bg-[var(--accent-500)] text-white font-bold shadow-lg shadow-[var(--accent-500)]/30 hover:brightness-110 transition-all transform active:scale-95">Save</button>
        </div>
      </div>
    </div>
  );
};

// --- PAGE: PEOPLE LIST ---
export const PeoplePage = ({ navigate, onEdit }) => {
  const people = useLiveQuery(() => db.people.toArray(), []) || [];
  
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState('All');

  // Auto-Navigation Handler
  useEffect(() => {
    const jumpId = localStorage.getItem('open_person_id');
    if (jumpId) {
      setTimeout(() => {
        const target = people.find(p => p.id === jumpId);
        if (target) {
          setSelectedPerson(target);
          localStorage.removeItem('open_person_id');
        }
      }, 100);
    }
  }, [people]);

  const handleSave = async (data) => {
    if (!data.name.trim()) return alert("Name is required");
    const personData = { ...data };
    
    if (personData.id) {
        await db.people.put(personData);
        if(selectedPerson && selectedPerson.id === personData.id) setSelectedPerson(personData);
    } else {
        await db.people.add(personData);
    }
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleDelete = async (id) => {
     if(window.confirm('Delete this person?')) {
        await db.people.delete(id);
        setIsEditing(false);
        setSelectedPerson(null);
     }
  };

  const filteredPeople = people.filter(p => filter === 'All' || p.relationship === filter);

  return (
    <div className="pb-24 animate-slideUp relative">
       {/* List View Header */}
       <div className="sticky top-0 bg-[#F3F4F6]/95 dark:bg-gray-950/95 backdrop-blur-md z-20 border-b border-gray-200/50 dark:border-gray-800/50 pt-6 pb-4 px-6 space-y-4">
         <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <button onClick={() => navigate('more')} className="p-2 -ml-2 text-[var(--accent-500)] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">People</h1>
             </div>
             <button 
               onClick={() => setIsCreating(true)} 
               className="p-2.5 bg-[var(--accent-500)] text-white rounded-full shadow-lg shadow-[var(--accent-500)]/30 hover:brightness-110 transition-all active:scale-90"
             >
               <Plus size={22} />
             </button>
         </div>

         {/* Filter Pills */}
         <div className="flex gap-2 overflow-x-auto no-scrollbar">
             {FILTER_TYPES.map(f => (
                 <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        filter === f 
                        ? 'bg-[var(--accent-500)] text-white shadow-md shadow-[var(--accent-500)]/20' 
                        : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                 >
                     {f}
                 </button>
             ))}
         </div>
       </div>

       {/* People Grid */}
       <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
         {filteredPeople.length === 0 ? (
           <div className="col-span-full py-24 text-center flex flex-col items-center">
               <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 border-4 border-white dark:border-gray-900 shadow-sm">
                    <User size={40} className="text-gray-300 dark:text-gray-600" />
               </div>
               <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">No one found in "{filter}".</p>
           </div>
         ) : (
           filteredPeople.map(p => <PersonCard key={p.id} person={p} onClick={setSelectedPerson} />)
         )}
       </div>

       {/* Profile Detail View (Overlay) */}
       {selectedPerson && !isEditing && (
           <PersonProfile 
             person={selectedPerson} 
             onBack={() => setSelectedPerson(null)} 
             onEditEntry={onEdit}
             onEditProfile={() => setIsEditing(true)}
           />
       )}

       {/* Add/Edit Modal */}
       {(isCreating || isEditing) && (
         <PersonModal 
           person={isEditing ? selectedPerson : null} 
           onClose={() => { setIsCreating(false); setIsEditing(false); }}
           onSave={handleSave} 
           onDelete={handleDelete}
         />
       )}
    </div>
  );
};