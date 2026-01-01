import React from 'react';
import { Plus } from 'lucide-react';

const DailyPromptWidget = ({ onWrite, isTodayDone }) => (
  <div onClick={onWrite} className="mb-6 mx-6 md:mx-0 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-3xl p-6 shadow-lg shadow-blue-500/20 text-white cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group">
    <div className="relative z-10 flex justify-between items-start">
      <div>
        <h2 className="text-xl font-bold mb-1 tracking-tight">
          {isTodayDone ? "Continue Writing" : "Write your diary today"}
        </h2>
        <p className="text-blue-100 text-sm font-medium opacity-90">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-colors shadow-inner">
        <Plus size={24} className="text-white" strokeWidth={3} />
      </div>
    </div>
    {/* Decorative Background Elements */}
    <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
    <div className="absolute top-[-20%] right-[20%] w-24 h-24 bg-white/5 rounded-full blur-xl" />
  </div>
);

export default DailyPromptWidget;