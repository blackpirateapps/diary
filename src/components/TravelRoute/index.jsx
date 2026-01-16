import React, { useState, useRef } from 'react';
import {
    Calendar, Plus, X,
    ArrowLeft, Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { useRoutes, useFileUpload } from './hooks';
import { setupLeafletIcons, getActivityIcon, formatActivityName } from './utils';
import AutoZoom from './AutoZoom';
import RouteItem from './RouteItem';
import { ImportInProgressModal, ImportCompleteModal } from './ImportModals';

// Setup Leaflet icons
setupLeafletIcons();

const TravelRoute = ({ navigate }) => {
    const [panelOpen, setPanelOpen] = useState(true);
    const [searchDate, setSearchDate] = useState('');
    const fileInputRef = useRef(null);
    const { routes, setRoutes, groupedRoutes, stats, allBounds } = useRoutes();
    const { isImporting, progress, statusText, importStats, setImportStats, handleFileUpload } = useFileUpload();

    const handleDateSelect = (e) => {
        const date = e.target.value;
        setSearchDate(date);
        if (date) {
            setRoutes(prev => prev.map(r => ({ ...r, visible: r.date === date })));
            setPanelOpen(false);
        } else {
            setRoutes(prev => prev.map(r => ({ ...r, visible: true })));
        }
    };

    const toggleRoute = (id) => {
        setRoutes(prev => prev.map(r => r.id === id ? { ...r, visible: !r.visible } : r));
    };

    return (
        <div className="relative h-screen w-full bg-[#F5F5F7] text-[#1C1C1E] font-sans overflow-hidden flex flex-col md:flex-row">

            {isImporting && <ImportInProgressModal progress={progress} statusText={statusText} />}
            {!isImporting && importStats && <ImportCompleteModal importStats={importStats} onClose={() => setImportStats(null)} />}

            <div className={`
          absolute z-[1000] bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]
          border-t md:border-r border-black/5
          bottom-0 left-0 right-0 
          transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${panelOpen ? 'h-[60%] md:h-full' : 'h-[100px] md:h-full'}
          md:relative md:w-[380px] md:translate-y-0
          rounded-t-2xl md:rounded-none flex flex-col
        `}>
                <div className="md:hidden w-full h-6 flex justify-center items-center cursor-grab active:cursor-grabbing" onClick={() => setPanelOpen(!panelOpen)}>
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                <div className="px-6 pb-4 pt-2 md:pt-8 flex-shrink-0">
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={() => navigate('more')} className="flex items-center text-blue-500 font-medium hover:opacity-70">
                            <ArrowLeft size={20} className="mr-1" /> Back
                        </button>
                        <div className="text-right">
                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total</div>
                            <div className="text-sm font-bold text-gray-900">{Math.round(stats.dist)} km</div>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">Routes</h1>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                            <Calendar size={16} />
                        </div>
                        <input
                            type="date" value={searchDate} onChange={handleDateSelect}
                            className="w-full bg-[#767680]/10 border-0 rounded-lg py-2 pl-9 pr-3 text-[15px] font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
                        />
                        {searchDate && (
                            <button onClick={() => handleDateSelect({ target: { value: '' } })} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-red-500">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-24 md:pb-4 custom-scrollbar">
                    {routes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center px-8">
                            <Navigation size={48} className="mb-4 text-gray-300" strokeWidth={1} />
                            <p className="text-sm">No routes yet.</p>
                            <p className="text-xs mt-1">Tap + to add GPX or Google JSON.</p>
                        </div>
                    ) : (
                        Object.keys(groupedRoutes).sort((a, b) => b - a).map(year => (
                            <div key={year} className="mb-6 animate-fadeIn">
                                <h3 className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-2 py-1 text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    {year}
                                    <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {Object.values(groupedRoutes[year]).flat().length}
                                    </span>
                                </h3>
                                <div className="space-y-4">
                                    {Object.keys(groupedRoutes[year]).map(month => (
                                        <div key={month} className="relative pl-4 border-l-2 border-gray-100">
                                            <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-gray-200 border-2 border-white" />
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1">{month}</h4>
                                            <div className="space-y-1">
                                                {groupedRoutes[year][month].map(route => (
                                                    <RouteItem key={route.id} route={route} onToggle={toggleRoute} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="absolute bottom-6 right-6 md:right-8 z-50">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={28} strokeWidth={2.5} />
                    </button>
                    <input ref={fileInputRef} type="file" accept=".gpx,.json" multiple className="hidden" onChange={handleFileUpload} />
                </div>
            </div>

            <div className="absolute inset-0 md:relative md:flex-1 h-full z-0 bg-gray-100">
                <MapContainer center={[20, 0]} zoom={2} zoomControl={false} style={{ height: "100%", width: "100%" }}>
                    <AutoZoom bounds={allBounds} />
                    <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

                    {routes.filter(r => r.visible).map(route => (
                        <React.Fragment key={route.id}>
                            <Polyline
                                positions={route.coordinates}
                                pathOptions={{
                                    color: route.color,
                                    weight: 5,
                                    opacity: 0.85,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                    dashArray: route.type === 'JSON_ACTIVITY' ? '10, 10' : null
                                }}
                            >
                                <Popup className="custom-popup">
                                    <div className="p-2 min-w-[150px]">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                                            {(() => {
                                                const ActivityIcon = getActivityIcon(route.activityType);
                                                return <ActivityIcon size={14} />;
                                            })()}
                                            {route.activityType ? formatActivityName(route.activityType) : 'Route'}
                                        </div>
                                        {route.locationName && (
                                            <div className="font-bold text-gray-800 text-sm mb-1">{route.locationName}</div>
                                        )}
                                        <div className="text-xs text-gray-600">
                                            <div>{new Date(route.date).toLocaleDateString()}</div>
                                            <div>{route.distance.toFixed(2)} km • {route.durationStr}</div>
                                        </div>
                                    </div>
                                </Popup>
                            </Polyline>
                        </React.Fragment>
                    ))}
                </MapContainer>
                <div className="md:hidden absolute bottom-[100px] left-0 right-0 h-24 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
            </div>

        </div>
    );
};

export default TravelRoute;
