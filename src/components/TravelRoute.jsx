import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Map as MapIcon, Clock, Calendar, Plus, X, 
  ArrowLeft, Navigation, Car, Bike, Footprints, Plane, Train, 
  CheckCircle2, Loader2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db } from './db'; // Import database
import { useLiveQuery } from 'dexie-react-hooks';

// --- LEAFLET ICONS FIX ---
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// --- UTILS ---

const parseCoordString = (coordStr) => {
  if (!coordStr) return null;
  const parts = coordStr.replace(/°/g, '').split(',');
  if (parts.length !== 2) return null;
  return [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
};

const calculateDistance = (coords) => {
  if (coords.length < 2) return 0;
  let totalDistance = 0;
  const R = 6371; // Earth radius km
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    totalDistance += R * c;
  }
  return totalDistance;
};

const getActivityIcon = (type) => {
  if (!type) return <Navigation size={14} />;
  const t = type.toUpperCase();
  if (t.includes('WALK') || t.includes('HIKE') || t.includes('RUN') || t.includes('FOOT')) return <Footprints size={14} />;
  if (t.includes('CYCL') || t.includes('BIKE')) return <Bike size={14} />;
  if (t.includes('VEHICLE') || t.includes('DRIVE') || t.includes('CAR')) return <Car size={14} />;
  if (t.includes('FLY') || t.includes('AIR')) return <Plane size={14} />;
  if (t.includes('TRAIN') || t.includes('SUBWAY') || t.includes('TRAM')) return <Train size={14} />;
  return <Navigation size={14} />;
};

const formatActivityName = (type) => {
  if (!type) return 'Travel';
  return type.replace(/IN_|_/g, ' ').toLowerCase().trim().replace(/\b\w/g, c => c.toUpperCase());
};

const generateColor = (idx) => {
  const hues = [211, 25, 45, 150, 280, 35]; 
  return `hsl(${hues[idx % hues.length]}, 90%, 55%)`;
};

// --- SUB-COMPONENTS ---

function AutoZoom({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [bounds, map]);
  return null;
}

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

// --- MAIN COMPONENT ---

const TravelRoute = ({ navigate }) => {
  const [routes, setRoutes] = useState([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [searchDate, setSearchDate] = useState('');
  const fileInputRef = useRef(null);
  
  // Import States
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [importStats, setImportStats] = useState(null);

  // Load routes from database using Dexie's live query
  const routesMeta = useLiveQuery(() => db.routes_meta.toArray(), []);
  const routesData = useLiveQuery(() => db.routes_data.toArray(), []);

  // Load routes from database
  useEffect(() => {
    if (routesMeta && routesData) {
      const loadedRoutes = routesMeta.map((meta, idx) => {
        const data = routesData.find(d => d.id === meta.id);
        const coordinates = data?.coordinates || [];
        
        return {
          id: meta.id,
          date: meta.date,
          coordinates,
          distance: meta.distance || calculateDistance(coordinates),
          durationStr: meta.durationStr || '0m',
          fileName: data?.fileName || 'Database',
          activityType: meta.mode || meta.activityType,
          locationName: meta.locationName,
          visible: true,
          color: generateColor(idx),
          type: data?.type
        };
      });
      
      setRoutes(loadedRoutes);
    }
  }, [routesMeta, routesData]);

  // --- LOGIC ---
  const { groupedRoutes, stats, allBounds } = useMemo(() => {
    const grouped = {};
    let totalDist = 0;
    const bounds = [];
    let tripCount = 0;

    const sorted = [...routes].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(route => {
      if (route.visible) {
        totalDist += route.distance;
        bounds.push(...route.coordinates);
        tripCount++;
      }

      const d = new Date(route.date);
      const year = d.getFullYear();
      const month = d.toLocaleString('default', { month: 'long' });

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      grouped[year][month].push(route);
    });

    return { 
      groupedRoutes: grouped, 
      stats: { dist: totalDist, trips: tripCount }, 
      allBounds: bounds 
    };
  }, [routes]);

  // --- PARSERS ---

  const parseGPX = (text, fileName) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const trkpts = xml.getElementsByTagName("trkpt");
    if (!trkpts.length) return [];

    const temp = {};
    for (let i = 0; i < trkpts.length; i++) {
      const lat = parseFloat(trkpts[i].getAttribute("lat"));
      const lon = parseFloat(trkpts[i].getAttribute("lon"));
      const timeTag = trkpts[i].getElementsByTagName("time")[0];
      if (lat && lon && timeTag) {
        const t = new Date(timeTag.textContent);
        const key = t.toISOString().split('T')[0];
        if (!temp[key]) temp[key] = { coords: [], start: t, end: t };
        temp[key].coords.push([lat, lon]);
        if (t > temp[key].end) temp[key].end = t;
        if (t < temp[key].start) temp[key].start = t;
      }
    }

    return Object.entries(temp).map(([d, data]) => ({
      date: d,
      coordinates: data.coords,
      startTime: data.start,
      endTime: data.end,
      fileName,
      type: 'GPX'
    }));
  };

  const parseGoogleJSON = (text, fileName) => {
    let data;
    try {
        data = JSON.parse(text);
    } catch(e) {
        throw new Error("Invalid JSON file");
    }

    const segments = data.semanticSegments || [];
    
    const rawPaths = [];
    const activities = [];

    segments.forEach(segment => {
        if (segment.timelinePath && Array.isArray(segment.timelinePath)) {
            const coords = [];
            segment.timelinePath.forEach(pt => {
                const parsed = parseCoordString(pt.point);
                if (parsed) coords.push(parsed);
            });

            if (coords.length > 1) {
                const start = new Date(segment.startTime);
                const end = new Date(segment.endTime);
                rawPaths.push({
                    date: start.toISOString().split('T')[0],
                    coordinates: coords,
                    startTime: start,
                    endTime: end,
                    activityType: null,
                    locationName: null,
                    fileName,
                    type: 'JSON_PATH'
                });
            }
        }
        else if (segment.activity) {
            const act = segment.activity;
            const startCoord = parseCoordString(act.start?.latLng);
            const endCoord = parseCoordString(act.end?.latLng);

            if (startCoord && endCoord) {
                 const start = new Date(segment.startTime);
                 const end = new Date(segment.endTime);
                 activities.push({
                    date: start.toISOString().split('T')[0],
                    coordinates: [startCoord, endCoord],
                    startTime: start,
                    endTime: end,
                    activityType: act.topCandidate?.type,
                    locationName: null,
                    fileName,
                    type: 'JSON_ACTIVITY'
                 });
            }
        }
    });

    const finalRoutes = [...rawPaths];
    const usedActivities = new Set();

    finalRoutes.forEach(path => {
        const matchingAct = activities.find(act => 
            act.startTime <= path.startTime && act.endTime >= path.endTime
        );

        if (matchingAct) {
            path.activityType = matchingAct.activityType;
            usedActivities.add(matchingAct);
        }
    });

    activities.forEach(act => {
        if (!usedActivities.has(act)) {
             const overlaps = finalRoutes.some(path => 
                 (act.startTime < path.endTime && act.endTime > path.startTime)
             );
             
             if (!overlaps) {
                 finalRoutes.push(act);
             }
        }
    });

    return finalRoutes;
  };

  // Save routes to database (NO COMPRESSION)
  const saveRoutesToDB = async (parsedRoutes) => {
    const metaEntries = [];
    const dataEntries = [];

    parsedRoutes.forEach((r) => {
      const d = new Date(r.date);
      const routeId = `${r.date}-${r.startTime.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const distance = calculateDistance(r.coordinates);
      const durMs = r.endTime - r.startTime;
      const h = Math.floor(durMs / 3600000);
      const m = Math.round((durMs % 3600000) / 60000);
      const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

      // Save metadata
      metaEntries.push({
        id: routeId,
        date: r.date,
        year: d.getFullYear(),
        month: d.toLocaleString('default', { month: 'long' }),
        distance: distance,
        durationStr: durationStr,
        mode: r.activityType,
        activityType: r.activityType,
        locationName: r.locationName
      });

      // Save raw coordinates (NO COMPRESSION)
      dataEntries.push({
        id: routeId,
        coordinates: r.coordinates, // Store raw array
        type: r.type,
        fileName: r.fileName
      });
    });

    // Bulk insert to database
    await db.routes_meta.bulkAdd(metaEntries);
    await db.routes_data.bulkAdd(dataEntries);

    return { metaEntries, dataEntries };
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsImporting(true);
    setProgress(0);
    setImportStats(null);
    setStatusText('Starting upload...');

    const newRoutes = [];
    let totalSize = files.reduce((acc, file) => acc + file.size, 0);
    let loadedSize = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatusText(`Reading ${file.name}...`);

        try {
            const content = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const fileProgress = event.loaded;
                        const totalProgress = ((loadedSize + fileProgress) / totalSize) * 100;
                        setProgress(Math.round(totalProgress));
                    }
                };
                reader.onload = (ev) => resolve(ev.target.result);
                reader.onerror = (err) => reject(err);
                reader.readAsText(file);
            });

            loadedSize += file.size;
            await new Promise(r => setTimeout(r, 50)); 
            setStatusText(`Parsing ${file.name}...`);
            
            let parsed = [];
            if (file.name.toLowerCase().endsWith('.gpx')) {
                parsed = parseGPX(content, file.name);
            } else if (file.name.toLowerCase().endsWith('.json')) {
                parsed = parseGoogleJSON(content, file.name);
            }

            if (parsed.length) newRoutes.push(...parsed);

        } catch (err) {
            console.error(`Error reading ${file.name}:`, err);
        }
    }

    setStatusText('Saving to database...');
    
    try {
      // Save to database
      await saveRoutesToDB(newRoutes);

      // Calculate import stats
      if (newRoutes.length > 0) {
        const acts = {};
        let dist = 0;
        const dates = newRoutes.map(r => new Date(r.date));
        const minDate = new Date(Math.min.apply(null, dates));
        const maxDate = new Date(Math.max.apply(null, dates));

        newRoutes.forEach(r => {
          dist += calculateDistance(r.coordinates);
          const type = r.activityType || 'Unknown';
          acts[type] = (acts[type] || 0) + 1;
        });

        setImportStats({
          added: newRoutes.length,
          totalDistance: dist,
          dateRange: `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`,
          activities: acts
        });
      } else {
        setImportStats({ added: 0, totalDistance: 0, dateRange: '-', activities: {} });
      }
    } catch (err) {
      console.error('Error saving to database:', err);
      setStatusText('Error saving to database');
    }

    setIsImporting(false);
    e.target.value = '';
  };

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
      
      {isImporting && (
        <div className="absolute inset-0 z-[2000] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scaleIn">
            <div className="flex items-center gap-3 mb-4">
               <Loader2 className="animate-spin text-blue-500" />
               <h3 className="font-semibold text-lg">Importing Routes</h3>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
               <div className="bg-blue-500 h-full transition-all duration-300" style={{width: `${progress}%`}} />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
               <span>{statusText}</span>
               <span>{progress}%</span>
            </div>
          </div>
        </div>
      )}

      {!isImporting && importStats && (
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
              <button onClick={() => setImportStats(null)} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={() => handleDateSelect({target: {value: ''}})} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-red-500">
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
            Object.keys(groupedRoutes).sort((a,b)=>b-a).map(year => (
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
                       {getActivityIcon(route.activityType)}
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
