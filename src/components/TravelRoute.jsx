import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronDown, ChevronRight, Map as MapIcon, 
  Clock, Calendar, Plus, X, Eye, EyeOff, 
  ArrowLeft, Search, Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

// Things 3 Palette: Blue is primary accent
const COLORS = {
  blue: '#007AFF',
  gray: '#8E8E93',
  lightGray: '#F2F2F7',
  white: '#FFFFFF',
  text: '#1C1C1E',
  border: '#E5E5EA'
};

const generateColor = (idx) => {
  const hues = [211, 25, 45, 150, 280, 35]; // Blue, Orange, Yellow, Green, Purple, Brown
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
    {/* Checkbox / Visibility Toggle */}
    <div className={`
      w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-colors
      ${route.visible ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
    `}>
      {route.visible && <div className="w-2 h-2 bg-white rounded-full" />}
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center">
        <h4 className={`text-[15px] font-medium truncate ${route.visible ? 'text-gray-900' : 'text-gray-400'}`}>
          {new Date(route.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </h4>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {route.distance.toFixed(1)} km
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
        <Clock size={10} />
        <span>{route.durationStr}</span>
        <span className="text-gray-300">•</span>
        <span className="truncate max-w-[120px]">{route.fileName}</span>
      </div>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

const TravelRoute = ({ navigate }) => {
  const [routes, setRoutes] = useState([]);
  const [panelOpen, setPanelOpen] = useState(true); // Mobile: Bottom sheet up/down
  const [searchDate, setSearchDate] = useState('');
  const fileInputRef = useRef(null);

  // --- LOGIC ---
  const { groupedRoutes, stats, allBounds } = useMemo(() => {
    const grouped = {};
    let totalDist = 0;
    const bounds = [];
    let tripCount = 0;

    // Sort: Newest first
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

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file, fileIdx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parser = new DOMParser();
          const xml = parser.parseFromString(ev.target.result, "text/xml");
          const trkpts = xml.getElementsByTagName("trkpt");
          if (!trkpts.length) return;

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

          setRoutes(prev => {
            const newR = [];
            Object.entries(temp).forEach(([d, data], i) => {
              const dur = data.end - data.start;
              const h = Math.floor(dur / 3600000);
              const m = Math.round((dur % 3600000) / 60000);
              // Avoid duplicates (simple check)
              if (!prev.some(p => p.date === d && p.fileName === file.name)) {
                newR.push({
                  id: `${d}-${file.name}-${Date.now()}`,
                  date: d,
                  coordinates: data.coords,
                  distance: calculateDistance(data.coords),
                  durationStr: `${h}h ${m}m`,
                  fileName: file.name,
                  visible: true,
                  color: generateColor(prev.length + newR.length + i)
                });
              }
            });
            return [...prev, ...newR];
          });
        } catch (err) { console.error(err); }
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const handleDateSelect = (e) => {
    const date = e.target.value;
    setSearchDate(date);
    if (date) {
      // Logic: Hide all others, show only this date
      setRoutes(prev => prev.map(r => ({
        ...r,
        visible: r.date === date
      })));
      setPanelOpen(false); // On mobile, close panel to show map
    } else {
      // If cleared, maybe show all? Or leave as is. Let's show all.
      setRoutes(prev => prev.map(r => ({ ...r, visible: true })));
    }
  };

  const toggleRoute = (id) => {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, visible: !r.visible } : r));
  };

  // --- RENDER ---
  return (
    <div className="relative h-screen w-full bg-[#F5F5F7] text-[#1C1C1E] font-sans overflow-hidden flex flex-col md:flex-row">
      
      {/* --- CONTROL PANEL (Sheet/Sidebar) --- 
        Mobile: Bottom Sheet
        Desktop: Left Sidebar
      */}
      <div 
        className={`
          absolute z-[1000] 
          bg-white/90 backdrop-blur-xl 
          shadow-[0_8px_30px_rgb(0,0,0,0.12)]
          border-t md:border-r border-black/5
          
          /* Mobile Transitions */
          bottom-0 left-0 right-0 
          transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${panelOpen ? 'h-[60%] md:h-full' : 'h-[100px] md:h-full'}
          
          /* Desktop Overrides */
          md:relative md:w-[380px] md:translate-y-0
          rounded-t-2xl md:rounded-none
          flex flex-col
        `}
      >
        {/* Drag Handle (Mobile Only) */}
        <div 
          className="md:hidden w-full h-6 flex justify-center items-center cursor-grab active:cursor-grabbing"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header Area */}
        <div className="px-6 pb-4 pt-2 md:pt-8 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => navigate('more')} 
              className="flex items-center text-blue-500 font-medium text-base hover:opacity-70 transition-opacity"
            >
              <ArrowLeft size={20} className="mr-1" />
              Back
            </button>
            
            {/* Stats Summary Small */}
            <div className="text-right">
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total</div>
              <div className="text-sm font-bold text-gray-900">{Math.round(stats.dist)} km</div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">Routes</h1>

          {/* Date Picker (Things 3 "Jump to" style) */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <Calendar size={16} />
            </div>
            <input 
              type="date"
              value={searchDate}
              onChange={handleDateSelect}
              className="
                w-full bg-[#767680]/10 border-0 rounded-lg py-2 pl-9 pr-3
                text-[15px] font-medium text-gray-900
                focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all
              "
            />
            {!searchDate && (
              <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">
                Pick a date
              </span>
            )}
            {searchDate && (
              <button 
                onClick={() => handleDateSelect({target: {value: ''}})}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-red-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable List Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 md:pb-4 custom-scrollbar">
          {routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center px-8">
              <Navigation size={48} className="mb-4 text-gray-300" strokeWidth={1} />
              <p className="text-sm">No routes yet.</p>
              <p className="text-xs mt-1">Tap the + button to add GPX files.</p>
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
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1">
                        {month}
                      </h4>
                      <div className="space-y-1">
                        {groupedRoutes[year][month].map(route => (
                          <RouteItem 
                            key={route.id} 
                            route={route} 
                            onToggle={toggleRoute}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Floating Action Button (Things 3 Style) */}
        <div className="absolute bottom-6 right-6 md:right-8 z-50">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="
              w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 
              flex items-center justify-center hover:scale-105 active:scale-95 transition-all
            "
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept=".gpx" 
            multiple 
            className="hidden" 
            onChange={handleFileUpload} 
          />
        </div>
      </div>

      {/* --- MAP BACKGROUND --- 
      */}
      <div className="absolute inset-0 md:relative md:flex-1 h-full z-0 bg-gray-100">
        <MapContainer 
          center={[20, 0]} 
          zoom={2} 
          zoomControl={false} // We can add custom zoom buttons if needed
          style={{ height: "100%", width: "100%" }}
        >
          <AutoZoom bounds={allBounds} />
          {/* CartoDB Voyager Tile - Clean, minimalistic, Apple Maps-ish look */}
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          {routes.filter(r => r.visible).map(route => (
            <React.Fragment key={route.id}>
              {/* Route Path */}
              <Polyline 
                positions={route.coordinates} 
                pathOptions={{ 
                  color: route.color, 
                  weight: 5, 
                  opacity: 0.85,
                  lineCap: 'round', 
                  lineJoin: 'round' 
                }} 
              />
              
              {/* Start Marker (Minimal) */}
              <Marker 
                position={route.coordinates[0]} 
                icon={L.divIcon({
                  className: 'bg-transparent',
                  html: `<div style="background-color: ${route.color};" class="w-3 h-3 rounded-full ring-2 ring-white shadow-md"></div>`
                })}
              />

              {/* End Marker (Flag) */}
              <Marker 
                position={route.coordinates[route.coordinates.length-1]} 
                icon={L.divIcon({
                  className: 'bg-transparent',
                  html: `
                    <div class="relative">
                      <div style="background-color: ${route.color};" class="w-4 h-4 rounded-full ring-2 ring-white shadow-lg flex items-center justify-center">
                        <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    </div>
                  `
                })}
              >
                <Popup className="custom-popup font-sans">
                  <div className="p-1 min-w-[120px]">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      {new Date(route.date).toLocaleDateString()}
                    </div>
                    <div className="text-sm font-semibold text-gray-800">
                      {route.distance.toFixed(2)} km
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {route.durationStr}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}
        </MapContainer>
        
        {/* Mobile: Map Cover/Gradient at bottom when panel is partially open */}
        <div className="md:hidden absolute bottom-[100px] left-0 right-0 h-24 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
      </div>

    </div>
  );
};

export default TravelRoute;