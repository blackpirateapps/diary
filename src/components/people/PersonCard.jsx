// components/people/PersonCard.jsx
import React from 'react';
import { User, Cake } from 'lucide-react';
import { useBlobUrl } from '../../db';

const getBirthdayCountdown = (dates) => {
  const bday = dates?.find(d => d.label === 'Birthday');
  if (!bday) return null;
  const today = new Date();
  const nextBday = new Date(bday.date);
  nextBday.setFullYear(today.getFullYear());
  if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
  return Math.ceil(Math.abs(nextBday - today) / (1000 * 60 * 60 * 24));
};

const PersonCard = ({ person, onClick }) => {
  const imageUrl = useBlobUrl(person.image);
  const daysUntilBirthday = getBirthdayCountdown(person.dates);
  const isBirthdaySoon = daysUntilBirthday !== null && daysUntilBirthday <= 14;

  return (
    <div 
      onClick={() => onClick(person)} 
      className={`bg-white dark:bg-gray-900 p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all active:scale-[0.98] group relative overflow-hidden
        ${isBirthdaySoon ? 'border-[var(--accent-400)] ring-1 ring-[var(--accent-100)]' : 'border-gray-100 dark:border-gray-800 hover:border-[var(--accent-500)]'}
      `}
    >
      {isBirthdaySoon && (
        <div className="absolute top-0 right-0 bg-[var(--accent-500)] text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl z-10 flex items-center gap-1">
          <Cake size={10} /> {daysUntilBirthday === 0 ? "Today!" : `${daysUntilBirthday}d`}
        </div>
      )}
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center border-2 border-transparent group-hover:border-[var(--accent-500)] transition-colors">
        {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" alt="" /> : <User size={24} className="text-gray-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-gray-900 dark:text-white truncate text-lg">{person.name}</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {person.relationship}
        </span>
      </div>
    </div>
  );
};

export default PersonCard;