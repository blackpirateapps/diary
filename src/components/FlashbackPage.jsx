import React, { useMemo } from 'react';
import { ChevronLeft, Calendar, ArrowRight, Smile, Frown, Meh, Heart, Sun, CloudRain } from 'lucide-react';
// --- IMPORT NEW HOOK ---
import { useBlobUrl } from '../db';

// Shared Moods (In a real app, this should be in a separate constants file)
const MOODS = [
  { value: 1, icon: CloudRain, color: 'text-gray-400' },
  { value: 2, icon: CloudRain, color: 'text-blue-400' },
  { value: 3, icon: Frown, color: 'text-blue-500' },
  { value: 4, icon: Meh, color: 'text-indigo-400' },
  { value: 5, icon: Meh, color: 'text-indigo-500' },
  { value: 6, icon: Sun, color: 'text-yellow-500' },
  { value: 7, icon: Sun, color: 'text-orange-500' },
  { value: 8, icon: Smile, color: 'text-orange-600' },
  { value: 9, icon: Heart, color: 'text-pink-500' },
  { value: 10, icon: Heart, color: 'text-red-500' },
];

// --- HELPER COMPONENT FOR IMAGES ---
const FlashbackImage = ({ src }) => {
  const url = useBlobUrl(src);
  if (!url) return null;
  return <img src={url} alt="Memory" className="w-full h-full object-cover" />;
};

const FlashbackCard = ({ entry, label, subLabel, onClick }) => {
  const moodMeta = MOODS.find(m => m.value === entry.mood);
  const MoodIcon = moodMeta?.icon || Sun;
  
  // Extract first image if available
  const coverImage = entry.images && entry.images.length > 0 ? entry.images[0] : null;

  return (
    <div 
      onClick={() => onClick(entry)}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-all hover:shadow-md cursor-pointer flex gap-4"
    >
      {coverImage && (
        <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
          {/* Replaced raw img with Helper */}
          <FlashbackImage src={coverImage} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{label}</span>
            <h4 className="text-gray-900 font-bold text-lg leading-tight mt-0.5">{subLabel}</h4>
          </div>
          {moodMeta && <MoodIcon size={16} className={moodMeta.color} />}
        </div>
        <p className="text-gray-500 text-sm line-clamp-2 mt-2 leading-relaxed" 
           dangerouslySetInnerHTML={{ __html: entry.content.replace(/<[^>]*>?/gm, ' ') }} />
      </div>
    </div>
  );
};

const FlashbackPage = ({ entries, onBack, onEdit }) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  // --- LOGIC: FIND ENTRIES ---
  
  // 1. On This Day (Different Years)
  const onThisDayEntries = useMemo(() => {
    return entries.filter(e => {
      const d = new Date(e.date);
      return d.getDate() === currentDate && 
             d.getMonth() === currentMonth && 
             d.getFullYear() !== currentYear;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries]);

  // 2. On This Week (Same calendar week number, different years)
  // Simplified: +/- 3 days matching current day/month in past years
  const onThisWeekEntries = useMemo(() => {
    return entries.filter(e => {
      const d = new Date(e.date);
      // Logic: Entry is not from current year, and is not "today" (to avoid dupes with above)
      if (d.getFullYear() === currentYear) return false;
      
      // Check if within the same month, and day is within +/- 3 days
      // Note: This is a loose approximation of "This Week" for simplicity
      const isSameMonth = d.getMonth() === currentMonth;
      const isCloseDate = Math.abs(d.getDate() - currentDate) <= 3 && Math.abs(d.getDate() - currentDate) > 0;
      
      return isSameMonth && isCloseDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries]);

  // 3. On This Month (Same month, different years, excluding the specific ones above)
  const onThisMonthEntries = useMemo(() => {
    const shownIds = new Set([...onThisDayEntries, ...onThisWeekEntries].map(e => e.id));
    return entries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && 
             d.getFullYear() !== currentYear &&
             !shownIds.has(e.id);
    }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5); // Limit to 5
  }, [entries, onThisDayEntries, onThisWeekEntries]);


  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 animate-slideUp">
      {/* Header */}
      <header className="px-4 py-4 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-white rounded-full text-gray-600 shadow-sm hover:bg-gray-50 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Flashback</h1>
          <p className="text-xs text-gray-500 font-medium">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}</p>
        </div>
      </header>

      <div className="px-4 space-y-8 mt-4">
        
        {/* SECTION 1: ON THIS DAY */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">On This Day</h2>
          </div>
          
          {onThisDayEntries.length > 0 ? (
            <div className="space-y-3">
              {onThisDayEntries.map(entry => {
                const yearDiff = currentYear - new Date(entry.date).getFullYear();
                return (
                  <FlashbackCard 
                    key={entry.id} 
                    entry={entry} 
                    label={`${yearDiff} Year${yearDiff > 1 ? 's' : ''} Ago`} 
                    subLabel={new Date(entry.date).getFullYear().toString()}
                    onClick={onEdit}
                  />
                );
              })}
            </div>
          ) : (
            <div className="bg-white/50 border border-dashed border-gray-300 rounded-2xl p-6 text-center">
              <p className="text-gray-400 text-sm">No memories from this specific day in the past.</p>
            </div>
          )}
        </section>

        {/* SECTION 2: THIS WEEK IN HISTORY */}
        {onThisWeekEntries.length > 0 && (
          <section>
             <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold text-gray-900">This Week in History</h2>
            </div>
            <div className="space-y-3">
              {onThisWeekEntries.map(entry => {
                 const d = new Date(entry.date);
                 return (
                  <FlashbackCard 
                    key={entry.id} 
                    entry={entry} 
                    label={d.toLocaleDateString(undefined, { weekday: 'long' })}
                    subLabel={`${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })} ${d.getFullYear()}`}
                    onClick={onEdit}
                  />
                 );
              })}
            </div>
          </section>
        )}

        {/* SECTION 3: FROM THIS MONTH */}
        {onThisMonthEntries.length > 0 && (
          <section>
             <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold text-gray-900">More from {today.toLocaleDateString(undefined, { month: 'long' })}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {onThisMonthEntries.map(entry => (
                <div 
                  key={entry.id}
                  onClick={() => onEdit(entry)}
                  className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-transform cursor-pointer"
                >
                  <span className="text-xs font-bold text-blue-500 block mb-1">
                    {new Date(entry.date).getFullYear()}
                  </span>
                  <p className="text-gray-600 text-xs line-clamp-3 leading-relaxed">
                    {entry.content.replace(/<[^>]*>?/gm, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default FlashbackPage;