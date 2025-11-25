import React from 'react';
import { CloudRain, Frown, Meh, Sun, Smile, Heart } from 'lucide-react';

const MOODS = [
  { value: 1, icon: CloudRain, color: 'text-gray-400', label: 'Awful' },
  { value: 2, icon: CloudRain, color: 'text-blue-400', label: 'Bad' },
  { value: 3, icon: Frown, color: 'text-blue-500', label: 'Sad' },
  { value: 4, icon: Meh, color: 'text-indigo-400', label: 'Meh' },
  { value: 5, icon: Meh, color: 'text-indigo-500', label: 'Okay' },
  { value: 6, icon: Sun, color: 'text-yellow-500', label: 'Good' },
  { value: 7, icon: Sun, color: 'text-orange-500', label: 'Great' },
  { value: 8, icon: Smile, color: 'text-orange-600', label: 'Happy' },
  { value: 9, icon: Heart, color: 'text-pink-500', label: 'Loved' },
  { value: 10, icon: Heart, color: 'text-red-500', label: 'Amazing' }
];

const MoodPopup = ({ currentMood, onChange, onClose }) => {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-10 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 w-64 grid grid-cols-5 gap-2 animate-slideUp origin-top-left">
        {MOODS.map((m) => {
          const Icon = m.icon;
          const isSelected = currentMood === m.value;
          return (
            <button
              key={m.value}
              onClick={() => { onChange(m.value); onClose(); }}
              className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                isSelected ? 'bg-blue-50 ring-2 ring-blue-500/20' : 'hover:bg-gray-50'
              }`}
            >
              <Icon size={20} className={isSelected ? m.color : 'text-gray-400'} />
            </button>
          );
        })}
      </div>
    </>
  );
};

export default MoodPopup;
