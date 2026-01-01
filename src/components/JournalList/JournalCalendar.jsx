import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Calendar as CalendarIcon, CalendarDays } from 'lucide-react';

const JournalCalendar = ({ selectedDate, setSelectedDate, entries, jumpToToday, onCreate }) => {
  return (
    <div className="animate-slideUp space-y-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
          <CalendarIcon size={12} strokeWidth={2.5} />
          {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}
        </div>
        <button 
          onClick={jumpToToday} 
          className="flex items-center gap-1.5 text-[var(--accent-600)] hover:bg-[var(--accent-50)] dark:hover:bg-gray-800 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border border-[var(--accent-100)] dark:border-gray-800 shadow-sm"
        >
          <CalendarDays size={14} /> Today
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 overflow-hidden">
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
                <div className="flex justify-center mt-1.5 gap-1">
                    {dayEntries.slice(0, 3).map((e, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm ${e.mood && e.mood >= 7 ? 'bg-orange-400' : 'bg-[var(--accent-400)]'}`} />
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
           .react-calendar__tile { height: 90px; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 15px !important; }
        }
        .react-calendar__navigation {
          margin-bottom: 20px;
          height: 44px;
        }
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 18px;
          font-weight: 800;
          color: inherit;
          border-radius: 12px;
          transition: 0.2s all;
        }
        .react-calendar__navigation button:hover {
          background-color: var(--accent-50) !important;
        }
        .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: 900;
          font-size: 0.65em;
          color: #9ca3af;
          margin-bottom: 12px;
          letter-spacing: 0.1em;
        }
        .react-calendar__month-view__days__day {
          font-size: 14px;
          font-weight: 700;
          color: inherit;
        }
        .react-calendar__tile {
          border-radius: 16px;
          transition: 0.2s all;
          border: 2px solid transparent !important;
        }
        .react-calendar__tile--now {
          background: var(--accent-50) !important;
          color: var(--accent-600) !important;
          font-weight: 900;
        }
        .react-calendar__tile--active {
          background: var(--accent-500) !important;
          color: white !important;
          box-shadow: 0 10px 15px -3px rgba(var(--accent-rgb), 0.4);
        }
        .react-calendar__tile--active div div {
          background-color: white !important; 
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #d1d5db;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default JournalCalendar;