import React from 'react';
import { getActivityIcon, formatActivityName } from './utils';

const RouteItem = ({ route, onToggle, isSelected }) => (
    <div
        onClick={() => onToggle(route.id)}
        className={`
      group flex items-center gap-3 py-3 px-3 mx-1 rounded-lg cursor-pointer transition-all
      ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50 active:scale-[0.99]'}
    `}
    >
        <div className={`
      w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-colors flex-shrink-0
      ${route.visible ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
    `}>
            {route.visible && <div className="w-2 h-2 bg-white rounded-full" />}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-0.5">
                <h4 className={`text-[15px] font-medium truncate flex items-center gap-2 ${route.visible ? 'text-gray-900' : 'text-gray-400'}`}>
                    {route.locationName ? (
                        <span className="truncate">To: {route.locationName}</span>
                    ) : (
                        <span>{new Date(route.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    )}
                </h4>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                    {route.distance.toFixed(1)} km
                </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-gray-500 flex items-center gap-1 bg-gray-100 px-1.5 rounded-sm">
                    {getActivityIcon(route.activityType)}
                    <span className="uppercase tracking-wide text-[10px] font-semibold">{route.activityType ? formatActivityName(route.activityType) : 'Route'}</span>
                </span>
                <span className="text-gray-300">•</span>
                <span>{route.durationStr}</span>
            </div>
        </div>
    </div>
);

export default RouteItem;
