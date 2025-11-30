import React from 'react';
import { Moon } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { formatSleepRange } from './editorUtils';

const SleepWidget = ({ session }) => {
  const chartData = session.hypnogram && session.hypnogram.length > 0 
      ? session.hypnogram 
      : session.movementData?.map((m, i) => ({ time: i, stage: 2 })) || [];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-xl p-4 flex flex-col gap-3 mt-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-500)] rounded-full">
            <Moon size={16} />
          </div>
          <div>
             <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sleep Session</h4>
             <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{formatSleepRange(session.startTime, session.duration)}</p>
          </div>
        </div>
        <div className="flex gap-4 text-right">
           <div className="flex flex-col items-end">
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{session.duration.toFixed(1)}h</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">Time</span>
           </div>
           <div className="flex flex-col items-end">
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{(session.deepSleepPerc * 100).toFixed(0)}%</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">Deep</span>
           </div>
        </div>
      </div>

      <div className="h-20 w-full rounded-lg overflow-hidden opacity-80">
        <ResponsiveContainer width="100%" height="100%">
           <AreaChart data={chartData}>
              <defs>
                  <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-500)" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="var(--accent-500)" stopOpacity={0.05}/>
                  </linearGradient>
              </defs>
              <YAxis hide domain={[0, 3]} />
              <Area 
                  type="stepAfter" 
                  dataKey="stage" 
                  stroke="var(--accent-500)" 
                  strokeWidth={2} 
                  fill="url(#sleepGradient)" 
              />
           </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SleepWidget;