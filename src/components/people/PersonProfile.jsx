// components/people/PersonProfile.jsx
import React, { useMemo } from 'react';
import { ChevronLeft, User, Cake } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useBlobUrl } from '../../db';

import ProfileAnalytics from './ProfileAnalytics';
import GallerySection from './GallerySection';
import TimelineEntryCard from './TimelineEntryCard';

const PersonProfile = ({ person, onBack, onEditEntry, onEditProfile }) => {
  const imageUrl = useBlobUrl(person.image);
  
  const entries = useLiveQuery(() => 
    db.entries.where('people').equals(person.id).reverse().sortBy('date'), 
  [person.id]) || [];

  const stats = useMemo(() => {
    if (!entries.length) return null;
    const moodSum = entries.reduce((acc, e) => acc + (e.mood || 5), 0);
    const lastDate = new Date(entries[0].date);
    
    const monthCounts = new Array(12).fill(0);
    const now = new Date();
    entries.forEach(e => {
        const d = new Date(e.date);
        const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (monthsAgo >= 0 && monthsAgo < 12) monthCounts[11 - monthsAgo]++; 
    });

    return { 
      avgMood: (moodSum / entries.length).toFixed(1), 
      daysSince: Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24)),
      monthCounts 
    };
  }, [entries]);

  return (
    <div className="bg-[#F3F4F6] dark:bg-gray-950 min-h-screen absolute inset-0 z-30 flex flex-col animate-slideUp">
      {/* Banner */}
      <div className="relative h-64 bg-gradient-to-b from-gray-200 to-[#F3F4F6] dark:from-gray-900 dark:to-gray-950">
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between z-10">
          <button onClick={onBack} className="p-2.5 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full shadow-sm">
            <ChevronLeft size={24} />
          </button>
          <button onClick={() => onEditProfile(person)} className="px-4 py-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-xs font-bold">
            Edit Profile
          </button>
        </div>
      </div>

      <div className="px-6 -mt-24 relative flex-1 overflow-y-auto pb-24 no-scrollbar">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-32 h-32 rounded-full p-1.5 bg-white dark:bg-gray-950 shadow-xl mb-4">
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center">
              {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" alt="" /> : <User size={48} className="text-gray-300" />}
            </div>
          </div>
          <h1 className="text-3xl font-extrabold dark:text-white mb-2">{person.name}</h1>
          <span className="text-xs font-bold uppercase text-[var(--accent-600)] bg-[var(--accent-50)] dark:bg-gray-900 px-3 py-1 rounded-full">{person.relationship}</span>
        </div>

        <div className="max-w-2xl mx-auto space-y-8">
          <ProfileAnalytics stats={stats} entryCount={entries.length} />
          <GallerySection images={person.gallery} />
          
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Interactions</h3>
            {entries.map(entry => (
              <TimelineEntryCard key={entry.id} entry={entry} person={person} onClick={onEditEntry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonProfile;