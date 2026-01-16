import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { getActivityIcon, formatActivityName } from './utils';

export const ImportInProgressModal = ({ progress, statusText }) => (
    <div className="absolute inset-0 z-[2000] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scaleIn">
            <div className="flex items-center gap-3 mb-4">
                <Loader2 className="animate-spin text-blue-500" />
                <h3 className="font-semibold text-lg">Importing Routes</h3>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
                <span>{statusText}</span>
                <span>{progress}%</span>
            </div>
        </div>
    </div>
);

export const ImportCompleteModal = ({ importStats, onClose }) => (
    <div className="absolute inset-0 z-[2000] bg-black/10 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-4 mx-auto">
                    <CheckCircle2 size={24} />
                </div>
                <h2 className="text-xl font-bold text-center text-gray-900">Import Complete</h2>
                <p className="text-sm text-gray-500 text-center mt-1">
                    Successfully added {importStats.added} new segments.
                </p>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <div className="text-xs text-blue-500 font-semibold uppercase">Total Distance</div>
                        <div className="text-lg font-bold text-gray-900">{importStats.totalDistance.toFixed(1)} km</div>
                    </div>
                    <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                        <div className="text-xs text-purple-500 font-semibold uppercase">Date Range</div>
                        <div className="text-xs font-bold text-gray-900 mt-1">{importStats.dateRange}</div>
                    </div>
                </div>
                <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Activity Breakdown</h4>
                    <div className="space-y-2">
                        {Object.entries(importStats.activities).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400">{getActivityIcon(type)}</span>
                                    <span className="text-gray-700 capitalize">{formatActivityName(type)}</span>
                                </div>
                                <span className="font-medium bg-gray-100 px-2 py-0.5 rounded-md text-xs">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button onClick={onClose} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors">Done</button>
            </div>
        </div>
    </div>
);
