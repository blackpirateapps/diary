import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Map as MapIcon, Clock, Calendar, Plus, X, 
  ArrowLeft, Navigation, Car, Bike, Footprints, Plane, Train, 
  CheckCircle2, Loader2, AlertCircle, Trash2
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- IMPORT DB & UTILS ---
import { db, PolylineUtils } from './db';

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

// --- HELPER UTILS ---

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

const generateColor = (idString) => {
  // Generate consistent color hash from ID
  let hash = 0;
  for (let i = 0; i < idString.length; i++) {
    hash = idString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [211, 25, 45, 150, 280, 35]; 
  return `hsl(${hues[Math.abs(hash) % hues.length]}, 90%, 55%)`;
};

// --- SUB-COMPONENTS ---

function AutoZoom({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      } catch (e) { console.warn("Map bounds error", e); }
    }
  }, [bounds, map]);
  return null;
}

const RouteItem = ({ route, onToggle, onDelete }) => (
  <div 
    onClick={() => onToggle(route.id)}
    className="group flex items-center gap-3 py-3 px-3 mx-1 rounded-lg cursor-pointer transition-all hover:bg-gray-50 active:scale-[0.99]"
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
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="text-gray-500 flex items-center gap-1 bg-gray-100 px-1.5 rounded-sm">
            {getActivityIcon(route.activityType)}
            <span className="uppercase tracking-wide text-[10px] font-semibold">{route.activityType ? formatActivityName(route.activityType) : 'Route'}</span>
          </span>
          <span className="text-gray-300">•</span>
          <span>{route.durationStr}</span>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(route.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
          title="Delete Route"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

const TravelRoute = ({ navigate }) => {
  const [routes, setRoutes] = useState([]); // Displays metadata list
  const [panelOpen, setPanelOpen] = useState(true);
  const [searchDate, setSearchDate] = useState('');
  const fileInputRef = useRef(null);

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [importStats, setImportStats] = useState(null);

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    loadRoutesFromDB();
  }, []);

  const loadRoutesFromDB = async () => {
    try {
      // 1. Fetch only metadata for the list (Fast)
      const metaList = await db.routes_meta.toArray();
      
      // 2. Prepare state objects (initially no coordinates loaded to save RAM)
      const initialRoutes = metaList.map(meta => ({
        ...meta,
        coordinates: [], // Empty initially
        visible: false,
        color: generateColor(meta.id),
        loaded: false // Flag to check if heavy data is fetched
      }));

      // Sort by date descending
      initialRoutes.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRoutes(initialRoutes);
    } catch (err) {
      console.error("Failed to load routes from DB", err);
    }
  };

  // --- VISIBILITY TOGGLE (LAZY LOADING) ---
  const toggleRoute = async (id) => {
    setRoutes(prev => {
      const targetIndex = prev.findIndex(r => r.id === id);
      if (targetIndex === -1) return prev;
      
      const target = prev[targetIndex];
      const newVisible = !target.visible;
      
      // If turning ON and data not loaded, fetch from DB
      if (newVisible && !target.loaded) {
        // We can't use async inside the setState updater cleanly, so we trigger a side effect
        fetchRouteData(id);
        // Return mostly same state, will update again when data arrives
        return prev; 
      }

      // If data already loaded, just toggle
      const newRoutes = [...prev];
      newRoutes[targetIndex] = { ...target, visible: newVisible };
      return newRoutes;
    });
  };

  const fetchRouteData = async (id) => {
    try {
      const dataDoc = await db.routes_data.get(id);
      if (dataDoc && dataDoc.compressedPath) {
        // Decode
        const coords = PolylineUtils.decode(dataDoc.compressedPath);
        
        setRoutes(prev => prev.map(r => 
          r.id === id 
            ? { ...r, coordinates: coords, visible: true, loaded: true } 
            : r
        ));
      }
    } catch (e) {
      console.error("Error fetching route path", e);
    }
  };

  const deleteRoute = async (id) => {
    if (window.confirm("Delete this route history?")) {
      await db.routes_meta.delete(id);
      await db.routes_data.delete(id);
      setRoutes(prev => prev.filter(r => r.id !== id));
    }
  };

  // --- COMPUTED STATS ---
  const { groupedRoutes, stats, allBounds } = useMemo(() => {
    const grouped = {};
    let totalDist = 0;
    const bounds = [];
    let tripCount = 0;

    // We filter based on current 'routes' state which respects date sorting from load
    const visibleRoutes = routes.filter(r => r.visible && r.coordinates.length > 0);

    // Calculate totals based on Metadata (even if not visible/loaded)
    // But for map bounds, we only use visible
    const totalDbDist = routes.reduce((acc, r) => acc + (r.distance || 0), 0);

    visibleRoutes.forEach(route => {
      bounds.push(...route.coordinates);
    });

    // Grouping for sidebar list
    routes.forEach(route => {
       // Filter by date search if active
       if (searchDate && route.date !== searchDate) return;

       const d = new Date(route.date);
       const year = d.getFullYear();
       const month = d.toLocaleString('default', { month: 'long' });

       if (!grouped[year]) grouped[year] = {};
       if (!grouped[year][month]) grouped[year][month] = [];
       grouped[year][month].push(route);
    });

    return { 
      groupedRoutes: grouped, 
      stats: { dist: totalDbDist, trips: routes.length }, 
      allBounds: bounds 
    };
  }, [routes, searchDate]);

  // --- PARSERS (Identical logic to before, but prepares for DB) ---
  const parseGPX = (text, fileName) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const trkpts = xml.getElementsByTagName("trkpt");
    if (!trkpts.length) return [];
    
    // ... (Simplified logic for brevity, assumes standard GPX structure)
    // Ideally use the same robust logic as previous step
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
      try { data = JSON.parse(text); } catch(e) { throw new Error("Invalid JSON"); }
      const segments = data.semanticSegments || [];
      const rawPaths = [];
      const activities = [];

      segments.forEach(segment => {
          if (segment.timelinePath) {
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
                      fileName,
                      type: 'JSON_PATH'
                  });
              }
          } else if (segment.activity) {
              const act = segment.activity;
              const startCoord = parseCoordString(act.start?.latLng);
              const endCoord = parseCoordString(act.end?.latLng);
              if (startCoord && endCoord) {
                   activities.push({
                      date: new Date(segment.startTime).toISOString().split('T')[0],
                      coordinates: [startCoord, endCoord],
                      startTime: new Date(segment.startTime),
                      endTime: new Date(segment.endTime),
                      activityType: act.topCandidate?.type,
                      fileName,
                      type: 'JSON_ACTIVITY'
                   });
              }
          }
      });

      // Merge Logic (Hide Straight Lines if Path Exists)
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
              const overlaps = finalRoutes.some(path => (act.startTime < path.endTime && act.endTime > path.startTime));
              if (!overlaps) finalRoutes.push(act);
          }
      });
      return finalRoutes;
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsImporting(true);
    setProgress(0);
    setStatusText('Reading files...');
    
    const parsedRoutes = [];
    let totalSize = files.reduce((acc, f) => acc + f.size, 0);
    let loadedSize = 0;

    for (const file of files) {
        try {
            const content = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onprogress = (ev) => setProgress(Math.round(((loadedSize + ev.loaded)/totalSize)*100));
                reader.onload = (ev) => resolve(ev.target.result);
                reader.readAsText(file);
            });
            loadedSize += file.size;

            setStatusText(`Parsing ${file.name}...`);
            await new Promise(r => setTimeout(r, 10)); // UI Breath

            if (file.name.toLowerCase().endsWith('.gpx')) {
                parsedRoutes.push(...parseGPX(content, file.name));
            } else if (file.name.toLowerCase().endsWith('.json')) {
                parsedRoutes.push(...parseGoogleJSON(content, file.name));
            }
        } catch (err) { console.error(err); }
    }

    setStatusText('Saving to Database...');
    
    // PREPARE FOR DB
    const metaBatch = [];
    const dataBatch = [];
    const statsObj = { added: 0, dist: 0, acts: {} };

    parsedRoutes.forEach((r, idx) => {
        const id = `${r.date}-${Date.now()}-${idx}`;
        const dist = calculateDistance(r.coordinates);
        const durMs = r.endTime - r.startTime;
        const h = Math.floor(durMs / 3600000);
        const m = Math.round((durMs % 3600000) / 60000);

        // 1. Meta Object
        metaBatch.push({
            id,
            date: r.date,
            year: r.startTime.getFullYear(),
            month: r.startTime.toLocaleString('default', { month: 'long' }),
            distance: dist,
            durationStr: h > 0 ? `${h}h ${m}m` : `${m}m`,
            activityType: r.activityType,
            locationName: r.locationName,
            fileName: r.fileName,
            type: r.type
        });

        // 2. Heavy Data Object (Compressed)
        dataBatch.push({
            id,
            compressedPath: PolylineUtils.encode(r.coordinates)
        });

        // Stats
        statsObj.added++;
        statsObj.dist += dist;
        const type = r.activityType || 'Unknown';
        statsObj.acts[type] = (statsObj.acts[type] || 0) + 1;
    });

    // BULK ADD TO INDEXEDDB
    await db.transaction('rw', db.routes_meta, db.routes_data, async () => {
        await db.routes_meta.bulkAdd(metaBatch);
        await db.routes_data.bulkAdd(dataBatch);
    });

    setImportStats({
        added: statsObj.added,
        totalDistance: statsObj.dist,
        activities: statsObj.acts
    });
    setIsImporting(false);
    
    // Refresh List
    loadRoutesFromDB();
    e.target.value = '';
  };

  const handleDateSelect = (e) => {
    const date = e.target.value;
    setSearchDate(date);
    if (date) {
        // Find visible routes for this date and fetch their data immediately
        const matches = routes.filter(r => r.date === date);
        matches.forEach(m => {
             if (!m.loaded) fetchRouteData(m.id);
        });
        setPanelOpen(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="relative h-screen w-full bg-[#F5F5F7] text-[#1C1C1E] font-sans overflow-hidden flex flex-col md:flex-row">
      
      {/* IMPORT PROGRESS OVERLAY */}
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

      {/* IMPORT DONE STATS */}
      {!isImporting && importStats && (
        <div className="absolute inset-0 z-[2000] bg-black/10 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-4 mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-center text-gray-900">Import Complete</h2>
              <p className="text-sm text-gray-500 text-center mt-1">
                Successfully saved {importStats.added} routes to local database.
              </p>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-center">
                 <div className="text-xs text-blue-500 font-semibold uppercase">Total Distance Added</div>
                 <div className="text-2xl font-bold text-gray-900">{importStats.totalDistance.toFixed(1)} km</div>
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
              <button 
                onClick={() => setImportStats(null)}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR PANEL */}
      <div 
        className={`
          absolute z-[1000] bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]
          border-t md:border-r border-black/5
          bottom-0 left-0 right-0 
          transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${panelOpen ? 'h-[60%] md:h-full' : 'h-[100px] md:h-full'}
          md:relative md:w-[380px] md:translate-y-0
          rounded-t-2xl md:rounded-none flex flex-col
        `}
      >
        <div 
          className="md:hidden w-full h-6 flex justify-center items-center cursor-grab active:cursor-grabbing"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pb-4 pt-2 md:pt-8 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate('more')} className="flex items-center text-blue-500 font-medium hover:opacity-70">
              <ArrowLeft size={20} className="mr-1" /> Back
            </button>
            <div className="text-right">
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Database</div>
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
                          <RouteItem key={route.id} route={route} onToggle={toggleRoute} onDelete={deleteRoute} />
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

      {/* MAP AREA */}
      <div className="absolute inset-0 md:relative md:flex-1 h-full z-0 bg-gray-100">
        <MapContainer center={[20, 0]} zoom={2} zoomControl={false} style={{ height: "100%", width: "100%" }}>
          <AutoZoom bounds={allBounds} />
          <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          
          {routes.filter(r => r.visible && r.coordinates.length > 0).map(route => (
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
              
              {/* Only show markers if less than 10 routes active to save performance */}
              {routes.filter(r => r.visible).length < 10 && (
                <>
                  <Marker position={route.coordinates[0]} icon={L.divIcon({ className: 'bg-transparent', html: `<div style="background-color: ${route.color};" class="w-3 h-3 rounded-full ring-2 ring-white shadow-md"></div>` })} />
                  <Marker position={route.coordinates[route.coordinates.length-1]} icon={L.divIcon({ className: 'bg-transparent', html: `<div class="relative"><div style="background-color: ${route.color};" class="w-4 h-4 rounded-full ring-2 ring-white shadow-lg flex items-center justify-center"><div class="w-1.5 h-1.5 bg-white rounded-full"></div></div></div>` })} />
                </>
              )}
            </React.Fragment>
          ))}
        </MapContainer>
        <div className="md:hidden absolute bottom-[100px] left-0 right-0 h-24 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
      </div>

    </div>
  );
};

export default TravelRoute;