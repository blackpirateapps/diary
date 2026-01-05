import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, ChevronDown, ChevronRight, Map as MapIcon, 
  Clock, Calendar, Upload, X, Eye, EyeOff, 
  BarChart3, Layers, Settings, Globe, MoreHorizontal 
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- LEAFLET ICON FIX ---
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

// Haversine formula for distance (in km)
const calculateDistance = (coords) => {
  if (coords.length < 2) return 0;
  let totalDistance = 0;
  const R = 6371; // Earth radius in km

  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    totalDistance += R * c;
  }
  return totalDistance;
};

const generateColorPalette = (count) => {
  const baseColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];
  if (count <= baseColors.length) return baseColors.slice(0, count);
  
  const additional = [];
  for (let i = 0; i < count; i++) {
    additional.push(`hsl(${(i * 137.5) % 360}, 75%, 55%)`); // Golden angle approximation for distinctness
  }
  return additional;
};

// --- COMPONENTS ---

const StatsCard = ({ label, value, subtext, icon: Icon }) => (
  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
    <div className="p-2 bg-[var(--accent-50)] dark:bg-gray-700 rounded-lg text-[var(--accent-600)]">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
    </div>
  </div>
);

function AutoZoom({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
    }
  }, [bounds, map]);
  return null;
}

const RouteListItem = ({ route, onToggle, onDelete, color }) => (
  <div className="group flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors text-sm">
    <button 
      onClick={() => onToggle(route.id)}
      className="flex-shrink-0"
    >
      <div className={`w-3 h-3 rounded-full border-2 transition-colors ${route.visible ? 'bg-transparent' : 'bg-transparent border-gray-300'}`}
           style={{ borderColor: route.visible ? color : undefined, backgroundColor: route.visible ? color : undefined }} />
    </button>
    
    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onToggle(route.id)}>
      <div className="flex justify-between items-baseline">
        <span className="font-medium text-gray-700 dark:text-gray-200 truncate">
          {new Date(route.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
        </span>
        <span className="text-xs text-gray-400 font-mono ml-2">{route.distance.toFixed(1)}km</span>
      </div>
      <div className="text-xs text-gray-400 truncate">{route.fileName}</div>
    </div>

    <button onClick={() => onDelete(route.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
      <X size={14} />
    </button>
  </div>
);

// --- MAIN COMPONENT ---
const TravelRoute = ({ navigate }) => {
  const [routes, setRoutes] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [expandedYears, setExpandedYears] = useState({});
  const fileInputRef = useRef(null);

  // --- PROCESSING & STATS ---
  const { groupedRoutes, stats, allBounds } = useMemo(() => {
    const grouped = {};
    let totalDist = 0;
    let totalDuration = 0; // in milliseconds
    const bounds = [];

    // Sort routes by date descending
    const sortedRoutes = [...routes].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedRoutes.forEach(route => {
      if (route.visible) {
        totalDist += route.distance;
        totalDuration += route.rawDuration;
        bounds.push(...route.coordinates);
      }

      const date = new Date(route.date);
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'long' });

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      grouped[year][month].push(route);
    });

    return {
      groupedRoutes: grouped,
      stats: {
        distance: totalDist,
        trips: routes.filter(r => r.visible).length,
        hours: Math.floor(totalDuration / 3600000)
      },
      allBounds: bounds
    };
  }, [routes]);

  // --- HANDLERS ---
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
          const trkpts = xmlDoc.getElementsByTagName("trkpt");
          
          if (!trkpts.length) return;

          // Group points by date for this file
          const tempRoutes = {}; // Key: YYYY-MM-DD

          for (let i = 0; i < trkpts.length; i++) {
            const lat = parseFloat(trkpts[i].getAttribute("lat"));
            const lon = parseFloat(trkpts[i].getAttribute("lon"));
            const timeTag = trkpts[i].getElementsByTagName("time")[0];
            
            if (!isNaN(lat) && !isNaN(lon) && timeTag) {
              const time = new Date(timeTag.textContent);
              const dateKey = time.toISOString().split('T')[0];
              
              if (!tempRoutes[dateKey]) {
                tempRoutes[dateKey] = { coords: [], start: time, end: time };
              }
              
              tempRoutes[dateKey].coords.push([lat, lon]);
              // Update end time
              if (time > tempRoutes[dateKey].end) tempRoutes[dateKey].end = time;
              // Update start time if earlier (though typically GPX is ordered)
              if (time < tempRoutes[dateKey].start) tempRoutes[dateKey].start = time;
            }
          }

          setRoutes(prev => {
            const newRoutes = [...prev];
            const palette = generateColorPalette(prev.length + Object.keys(tempRoutes).length);
            
            Object.entries(tempRoutes).forEach(([date, data], idx) => {
              const durationMs = data.end - data.start;
              const hours = Math.floor(durationMs / 3600000);
              const mins = Math.round((durationMs % 3600000) / 60000);
              
              newRoutes.push({
                id: `${date}-${file.name}-${Date.now()}`,
                date,
                coordinates: data.coords,
                distance: calculateDistance(data.coords),
                rawDuration: durationMs,
                durationStr: `${hours}h ${mins}m`,
                startTime: data.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                endTime: data.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                fileName: file.name,
                visible: true,
                color: palette[(prev.length + idx) % palette.length]
              });
            });
            return newRoutes;
          });

        } catch (err) {
          console.error("GPX Parse Error", err);
        }
      };
      reader.readAsText(file);
    });
    event.target.value = '';
  };

  const toggleVisibility = (id) => {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, visible: !r.visible } : r));
  };

  const toggleYearGroup = (year, visible) => {
    setRoutes(prev => prev.map(r => r.date.startsWith(year) ? { ...r, visible } : r));
  };

  const deleteRoute = (id) => {
    setRoutes(prev => prev.filter(r => r.id !== id));
  };

  const toggleYearExpanded = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  return (
    <div className="relative h-screen w-full bg-gray-100 dark:bg-gray-950 overflow-hidden flex">
      
      {/* --- SIDEBAR PANEL --- */}
      <div 
        className={`
          absolute z-[500] top-4 bottom-4 left-4 flex flex-col
          bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl
          border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-2xl
          transition-all duration-300 ease-[bezier(0.25,0.1,0.25,1)]
          ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-800 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Travel Logs
          </h1>
          <button onClick={() => navigate('more')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
             <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          {/* Actions */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            <span>Import GPX</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".gpx" multiple className="hidden" onChange={handleFileUpload} />

          {/* Stats Grid */}
          {routes.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <StatsCard icon={Globe} label="Distance" value={`${Math.round(stats.distance).toLocaleString()} km`} />
              <StatsCard icon={Clock} label="Time" value={`${stats.hours} hrs`} />
              <div className="col-span-2">
                 <StatsCard icon={MapIcon} label="Total Trips" value={stats.trips} subtext="Visible on map" />
              </div>
            </div>
          )}

          {/* Timeline Tree */}
          <div className="space-y-4">
            {Object.keys(groupedRoutes).sort((a,b) => b - a).map(year => (
              <div key={year} className="bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Year Header */}
                <div className="p-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                  <button 
                    onClick={() => toggleYearExpanded(year)}
                    className="flex items-center gap-2 flex-1 text-left font-bold text-gray-700 dark:text-gray-200"
                  >
                    {expandedYears[year] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {year}
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleYearGroup(year, true)} title="Show All" className="p-1 hover:text-blue-500 text-gray-400"><Eye size={14}/></button>
                    <button onClick={() => toggleYearGroup(year, false)} title="Hide All" className="p-1 hover:text-gray-500 text-gray-400"><EyeOff size={14}/></button>
                  </div>
                </div>

                {/* Months & Routes */}
                {expandedYears[year] && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {Object.keys(groupedRoutes[year]).map(month => (
                      <div key={month} className="pl-4 pr-2 py-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                          {month}
                        </h4>
                        <div className="space-y-1">
                          {groupedRoutes[year][month].map(route => (
                            <RouteListItem 
                              key={route.id} 
                              route={route} 
                              onToggle={toggleVisibility}
                              onDelete={deleteRoute}
                              color={route.color}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {routes.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <MapIcon size={48} className="mx-auto mb-3 opacity-20" />
                <p>No routes loaded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- TOGGLE BUTTON (When sidebar closed) --- */}
      <button 
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className={`absolute top-4 left-4 z-[400] p-3 bg-white dark:bg-gray-800 shadow-lg rounded-xl transition-all ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <Layers size={20} className="text-gray-700 dark:text-gray-200" />
      </button>

      {/* --- MAP --- */}
      <div className="flex-1 h-full z-0">
        <MapContainer 
          center={[20, 0]} 
          zoom={2} 
          zoomControl={false}
          style={{ height: "100%", width: "100%", background: '#f3f4f6' }}
        >
          <AutoZoom bounds={allBounds} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          {routes.filter(r => r.visible).map(route => (
            <React.Fragment key={route.id}>
              <Polyline 
                positions={route.coordinates} 
                pathOptions={{ 
                  color: route.color, 
                  weight: 4, 
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round'
                }} 
              >
                <Popup className="custom-popup">
                  <div className="p-1">
                    <div className="font-bold text-sm mb-1">{new Date(route.date).toDateString()}</div>
                    <div className="text-xs text-gray-500">
                      <div>Distance: {route.distance.toFixed(2)} km</div>
                      <div>Duration: {route.durationStr}</div>
                    </div>
                  </div>
                </Popup>
              </Polyline>
              {/* Only show markers for start/end if visible routes are few to avoid clutter */}
              {routes.filter(r => r.visible).length < 5 && (
                 <>
                   <Marker position={route.coordinates[0]} icon={L.divIcon({className: 'bg-transparent', html: `<div style="background:${route.color}" class="w-3 h-3 rounded-full border-2 border-white shadow-sm"></div>`})} />
                   <Marker position={route.coordinates[route.coordinates.length-1]} icon={L.divIcon({className: 'bg-transparent', html: `<div style="background:${route.color}" class="w-3 h-3 rounded-full border-2 border-white shadow-sm"></div>`})} />
                 </>
              )}
            </React.Fragment>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default TravelRoute;