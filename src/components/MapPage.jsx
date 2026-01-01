import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Calendar, ArrowRight, Play, Pause, RotateCcw } from 'lucide-react';
import { useBlobUrl } from '../db';

// --- CUSTOM MARKER ICONS ---
// Creates a numbered icon to show the sequence of check-ins
const createNumberedIcon = (number, isLast = false) => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 ${isLast ? 'border-orange-500' : 'border-[var(--accent-500)]'} shadow-lg flex items-center justify-center text-xs font-bold text-gray-800 dark:text-gray-100">
          ${number}
        </div>
        ${isLast ? '<div class="absolute inset-0 w-8 h-8 rounded-full bg-orange-500 animate-ping opacity-20"></div>' : ''}
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const LeafletStyles = () => (
  <>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
    <style>{`
      .leaflet-container { width: 100%; height: 100%; border-radius: 24px; z-index: 1; background: #f9fafb !important; }
      .dark .leaflet-container { background: #030712 !important; }
      .custom-popup .leaflet-popup-content-wrapper { border-radius: 16px; padding: 0; overflow: hidden; background-color: white; shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
      .dark .custom-popup .leaflet-popup-content-wrapper { background-color: #111827; color: #f3f4f6; border: 1px solid #374151; }
      .dark .custom-popup .leaflet-popup-tip { background-color: #111827; }
      .custom-popup .leaflet-popup-content { margin: 0; }
      .dark .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
    `}</style>
  </>
);

const MapPopupImage = ({ src }) => {
  const url = useBlobUrl(src);
  return url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null;
};

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center, map]);
  return null;
};

const MapPage = ({ entries, onEdit }) => {
  // 1. DATA FLATTENING: Extract every check-in from locationHistory
  const allPoints = useMemo(() => {
    let points = [];
    entries.forEach(entry => {
      if (entry.locationHistory && entry.locationHistory.length > 0) {
        entry.locationHistory.forEach((loc, index) => {
          points.push({
            ...loc,
            entryId: entry.id,
            originalEntry: entry,
            sequence: index + 1,
            time: new Date(loc.timestamp || entry.date).getTime()
          });
        });
      } else if (entry.locationLat && entry.locationLng) {
        points.push({
          lat: entry.locationLat,
          lng: entry.locationLng,
          address: entry.location,
          weather: entry.weather,
          entryId: entry.id,
          originalEntry: entry,
          sequence: 1,
          time: new Date(entry.date).getTime()
        });
      }
    });
    return points.sort((a, b) => a.time - b.time);
  }, [entries]);

  // 2. PLAYBACK STATE
  const [visibleCount, setVisibleCount] = useState(allPoints.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const displayedPoints = allPoints.slice(0, visibleCount);

  useEffect(() => {
    let timer;
    if (isPlaying && visibleCount < allPoints.length) {
      timer = setTimeout(() => setVisibleCount(prev => prev + 1), 800);
    } else {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, visibleCount, allPoints.length]);

  // 3. GROUPING FOR POLYLINE (Paths)
  const paths = useMemo(() => {
    const groups = {};
    displayedPoints.forEach(p => {
      const dateKey = new Date(p.time).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push([p.lat, p.lng]);
    });
    return Object.values(groups);
  }, [displayedPoints]);

  const mapCenter = displayedPoints.length > 0 
    ? [displayedPoints[displayedPoints.length - 1].lat, displayedPoints[displayedPoints.length - 1].lng]
    : [22.4833, 87.5833]; // Fallback to Egra context

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 pb-24 flex flex-col transition-colors">
      <LeafletStyles />
      
      <header className="px-6 py-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Atlas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {allPoints.length} check-ins across {entries.length} entries
          </p>
        </div>
        
        {/* PLAYBACK CONTROLS */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <button 
            onClick={() => { setVisibleCount(0); setIsPlaying(true); }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-400"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-[var(--accent-500)] text-white rounded-xl shadow-md"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 pb-4 flex flex-col gap-4">
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-[32px] shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden relative">
          {allPoints.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center flex-col text-center p-6">
              <MapPin size={48} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Journey Data</h3>
            </div>
          ) : (
            <MapContainer center={mapCenter} zoom={13}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <RecenterMap center={mapCenter} />
              
              {/* 5. PATHS (Polylines) */}
              {paths.map((positions, idx) => (
                <Polyline 
                  key={idx} 
                  positions={positions} 
                  pathOptions={{ color: '#6366f1', weight: 3, opacity: 0.4, dashArray: '10, 10' }} 
                />
              ))}

              {/* 2 & 5. NUMBERED & PULSING MARKERS */}
              {displayedPoints.map((pt, idx) => {
                const isLatest = idx === displayedPoints.length - 1;
                return (
                  <Marker 
                    key={`${pt.entryId}-${idx}`} 
                    position={[pt.lat, pt.lng]}
                    icon={createNumberedIcon(pt.sequence, isLatest)}
                  >
                    <Popup className="custom-popup">
                      <div className="min-w-[220px]" onClick={() => onEdit(pt.originalEntry)}>
                        <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
                           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                              <Calendar size={12} />
                              {new Date(pt.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                           </div>
                        </div>

                        {pt.originalEntry.images?.length > 0 && (
                          <div className="w-full h-28 overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <MapPopupImage src={pt.originalEntry.images[0]} />
                          </div>
                        )}

                        <div className="p-4">
                          <p className="text-xs font-bold text-orange-500 mb-1">{pt.weather}</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-2">
                            {pt.address}
                          </p>
                          <div className="mt-3 flex items-center justify-between">
                             <span className="text-[10px] text-gray-400">Stop #{pt.sequence}</span>
                             <span className="text-[var(--accent-500)] text-xs font-bold flex items-center gap-1">
                               View <ArrowRight size={12} />
                             </span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>

        {/* 4. PLAYBACK SLIDER */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
           <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              <span>Start of Journey</span>
              <span>{visibleCount} / {allPoints.length} Points</span>
           </div>
           <input 
              type="range"
              min="0"
              max={allPoints.length}
              value={visibleCount}
              onChange={(e) => { setIsPlaying(false); setVisibleCount(parseInt(e.target.value)); }}
              className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[var(--accent-500)]"
           />
        </div>
      </div>
    </div>
  );
};

export default MapPage;