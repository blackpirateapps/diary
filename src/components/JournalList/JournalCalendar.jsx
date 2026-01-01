import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Calendar as CalendarIcon, CalendarDays } from 'lucide-react';

const JournalCalendar = ({ selectedDate, setSelectedDate, entries, jumpToToday, onCreate }) => {
  return (
    <div className="animate-slideUp space-y-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider">
          <CalendarIcon size={12} />
          {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}
        </div>
        <button 
          onClick={jumpToToday} 
          className="flex items-center gap-1 text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:hover:bg-gray-800 px-2 py-1 rounded-lg text-xs font-bold transition-colors"
        >
          <CalendarDays size={14} /> Today
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 overflow-hidden">
        <Calendar 
          onChange={setSelectedDate} 
          value={selectedDate}
          className="w-full border-none font-sans"
          tileClassName={({ date, view }) => {
            if (view !== 'month') return null;
            const hasEntry = entries.some(e => new Date(e.date).toDateString() === date.toDateString());
            return hasEntry ? 'has-journal-entry' : null;
          }}
          tileContent={({ date, view }) => {
            if (view !== 'month') return null;
            const dayEntries = entries.filter(e => new Date(e.date).toDateString() === date.toDateString());
            if (dayEntries.length > 0) {
              return (
                <div className="flex justify-center mt-1 gap-0.5">
                    {dayEntries.slice(0, 3).map((e, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${e.mood && e.mood >= 7 ? 'bg-orange-400' : 'bg-[var(--accent-400)]'}`} />
                    ))}
                </div>
              );
            }
          }}
        />
      </div>

      <style>{`
        .react-calendar {
          width: 100%;
          background: transparent;
          border: none;
          font-family: inherit;
        }
        @media (min-width: 768px) {
           .react-calendar { font-size: 1.1em; }
           .react-calendar__tile { height: 80px; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 10px; }
        }
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 16px;
          font-weight: 600;
          color: inherit;
        }
        .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.65em;
          color: #9ca3af;
          margin-bottom: 8px;
        }
        .react-calendar__month-view__days__day {
          font-size: 14px;
          font-weight: 500;
          color: inherit;
          padding: 8px 0;
        }
        .react-calendar__tile {
          border-radius: 12px;
          transition: 0.2s all;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: var(--accent-50);
        }
        .dark .react-calendar__tile:enabled:hover {
          background-color: #374151;
        }
        .react-calendar__tile--now {
          background: var(--accent-50);
          color: var(--accent-600);
          font-weight: bold;
        }
        .dark .react-calendar__tile--now {
          background: #374151;
          color: var(--accent-400);
        }
        .react-calendar__tile--active {
          background: var(--accent-500) !important;
          color: white !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .react-calendar__tile--active div div {
          background-color: white !important; 
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #d1d5db;
        }
        .dark .react-calendar__month-view__days__day--neighboringMonth {
          color: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default JournalCalendar;