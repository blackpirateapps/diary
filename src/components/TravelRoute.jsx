import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Navigation, Map as MapIcon, Clock, Calendar, Upload, X, Eye, EyeOff } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- FIX LEAFLET ICONS ---
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// --- COLOR PALETTE GENERATOR ---
const generateColorPalette = (count) => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#84CC16', // Lime
    '#06B6D4', // Cyan
    '#F43F5E', // Rose
  ];
  
  // If more colors needed, generate from HSL
  if (count > colors.length) {
    const additional = [];
    const step = 360 / count;
    for (let i = 0; i < count; i++) {
      const hue = (i * step) % 360;
      additional.push(`hsl(${hue}, 70%, 55%)`);
    }
    return additional;
  }
  
  return colors.slice(0, count);
};

// --- CUSTOM MARKER CREATOR ---
const createCustomMarker = (color) => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
        <circle cx="12.5" cy="12.5" r="6" fill="white"/>
      </svg>
    `)}`,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// --- HEADER ---
const PageHeader = ({ title, onBack }) => (
  <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 dark:bg-gray-950/95 backdrop-blur-md z-20 border-b border-gray-200/50 dark:border-gray-800/50 flex items-center gap-3 transition-colors">
    {onBack && (
      <button onClick={onBack} className="p-2 -ml-2 text-[var(--accent-500)] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
        <ChevronLeft size={24} />
      </button>
    )}
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
  </div>
);

// --- AUTO-ZOOM ---
function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [bounds, map]);
  return null;
}

// --- DUPLICATE DETECTION ---
const isDuplicateRoute = (existingRoutes, newRoute) => {
  return existingRoutes.some(route => {
    if (route.date !== newRoute.date) return false;
    if (route.coordinates.length !== newRoute.coordinates.length) return false;
    
    // Check if first, middle, and last coordinates match (sampling for performance)
    const checkPoints = [0, Math.floor(route.coordinates.length / 2), route.coordinates.length - 1];
    return checkPoints.every(idx => {
      const existing = route.coordinates[idx];
      const newCoord = newRoute.coordinates[idx];
      return Math.abs(existing[0] - newCoord[0]) < 0.0001 && 
             Math.abs(existing[1] - newCoord[1]) < 0.0001;
    });
  });
};

// --- MAIN COMPONENT ---
const TravelRoute = ({ navigate }) => {
  const [routes, setRoutes] = useState([]); // Array of {date, coordinates, startTime, endTime, duration, color, visible}
  const [selectedDate, setSelectedDate] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setError(null);
    let newRoutes = [...routes];

    files.forEach(file => {
      const reader = new FileReader();

      reader.onerror = () => {
        setError(`Failed to read ${file.name}`);
      };

      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "text/xml");
          
          const parserError = xmlDoc.querySelector('parsererror');
          if (parserError) throw new Error(`Invalid GPX: ${file.name}`);

          const trkpts = xmlDoc.getElementsByTagName("trkpt");
          if (trkpts.length === 0) throw new Error(`No track points in ${file.name}`);

          // Group coordinates by date
          const routesByDate = {};

          for (let i = 0; i < trkpts.length; i++) {
            const lat = parseFloat(trkpts[i].getAttribute("lat"));
            const lon = parseFloat(trkpts[i].getAttribute("lon"));
            
            if (isNaN(lat) || isNaN(lon)) continue;

            const timeTag = trkpts[i].getElementsByTagName("time")[0];
            const timestamp = timeTag ? new Date(timeTag.textContent) : new Date();
            const dateKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD

            if (!routesByDate[dateKey]) {
              routesByDate[dateKey] = {
                coordinates: [],
                startTime: timestamp,
                endTime: timestamp
              };
            }

            routesByDate[dateKey].coordinates.push([lat, lon]);
            routesByDate[dateKey].endTime = timestamp;
          }

          // Convert to route objects
          Object.entries(routesByDate).forEach(([date, data]) => {
            if (data.coordinates.length === 0) return;

            const duration = data.endTime - data.startTime;
            const hours = Math.floor(duration / 3600000);
            const mins = Math.round((duration % 3600000) / 60000);

            const routeObj = {
              date,
              coordinates: data.coordinates,
              startTime: data.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              endTime: data.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              duration: `${hours}h ${mins}m`,
              fileName: file.name,
              visible: true,
              id: `${date}-${Date.now()}`
            };

            // Check for duplicates
            if (!isDuplicateRoute(newRoutes, routeObj)) {
              newRoutes.push(routeObj);
            }
          });

          // Assign colors after all routes are added
          const colors = generateColorPalette(newRoutes.length);
          newRoutes = newRoutes.map((route, idx) => ({
            ...route,
            color: colors[idx % colors.length]
          }));

          setRoutes(newRoutes);
        } catch (err) {
          console.error('Error parsing GPX:', err);
          setError(err.message || `Failed to parse ${file.name}`);
        }
      };

      reader.readAsText(file);
    });

    // Reset file input
    event.target.value = '';
  };

  const toggleRouteVisibility = (routeId) => {
    setRoutes(routes.map(route => 
      route.id === routeId ? { ...route, visible: !route.visible } : route
    ));
  };

  const removeRoute = (routeId) => {
    setRoutes(routes.filter(route => route.id !== routeId));
  };

  const filteredRoutes = selectedDate 
    ? routes.filter(route => route.date === selectedDate)
    : routes;

  const visibleRoutes = filteredRoutes.filter(route => route.visible);

  // Calculate bounds for all visible routes
  const allBounds = visibleRoutes.flatMap(route => route.coordinates);

  // Get unique dates for stats
  const uniqueDates = [...new Set(routes.map(r => r.date))].sort();

  return (
    <div className="pb-24 animate-slideUp h-screen flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
      <PageHeader title="Travel Routes" onBack={() => navigate('more')} />
      
      {/* UPLOAD & FILTER SECTION */}
      <div className="p-4 z-10 flex-shrink-0 space-y-3 overflow-y-auto max-h-[40vh]">
        
        {/* Upload Button */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--accent-50)] dark:bg-gray-800 rounded-lg text-[var(--accent-600)]">
                <Upload size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Upload GPX Files</h3>
                <p className="text-xs text-gray-500">{routes.length} route{routes.length !== 1 ? 's' : ''} loaded</p>
              </div>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Choose Files
            </button>
          </div>
          <input 
            type="file" 
            accept=".gpx" 
            multiple
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          {error && (
            <p className="text-xs text-red-500 mt-2">{error}</p>
          )}
        </div>

        {/* Date Filter */}
        {routes.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-gray-400" />
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]"
                placeholder="Filter by date"
              />
              {selectedDate && (
                <button 
                  onClick={() => setSelectedDate('')}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Route List */}
        {filteredRoutes.length > 0 && (
          <div className="space-y-2">
            {filteredRoutes.map(route => (
              <div 
                key={route.id}
                className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {/* Color Indicator */}
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: route.color }}
                  />
                  
                  {/* Route Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {new Date(route.date).toLocaleDateString(undefined, { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <span className="text-xs text-gray-500">•</span>
                      <p className="text-xs text-gray-500">{route.duration}</p>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{route.fileName}</p>
                  </div>

                  {/* Actions */}
                  <button 
                    onClick={() => toggleRouteVisibility(route.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {route.visible ? (
                      <Eye size={16} className="text-gray-600 dark:text-gray-400" />
                    ) : (
                      <EyeOff size={16} className="text-gray-400" />
                    )}
                  </button>
                  
                  <button 
                    onClick={() => removeRoute(route.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <X size={16} className="text-red-500" />
                  </button>
                </div>

                {/* Time Range */}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Clock size={12} />
                  <span>{route.startTime} - {route.endTime}</span>
                  <span>•</span>
                  <span>{route.coordinates.length} points</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAP AREA */}
      <div className="flex-1 relative w-full bg-gray-100 dark:bg-gray-900 overflow-hidden min-h-0">
        {visibleRoutes.length > 0 ? (
          <MapContainer 
            key={visibleRoutes.map(r => r.id).join('-')}
            center={visibleRoutes[0].coordinates[0]} 
            zoom={13} 
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", minHeight: "300px" }}
            className="z-0"
          >
            <ChangeView bounds={allBounds} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Render all visible routes */}
            {visibleRoutes.map(route => (
              <React.Fragment key={route.id}>
                {/* Route Line */}
                <Polyline 
                  positions={route.coordinates} 
                  pathOptions={{ 
                    color: route.color, 
                    weight: 4, 
                    opacity: 0.8,
                    lineJoin: 'round',
                    lineCap: 'round'
                  }} 
                />
                
                {/* Start Marker */}
                <Marker 
                  position={route.coordinates[0]} 
                  icon={createCustomMarker(route.color)}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{new Date(route.date).toLocaleDateString()}</strong>
                      <div>Start: {route.startTime}</div>
                    </div>
                  </Popup>
                </Marker>

                {/* End Marker */}
                <Marker 
                  position={route.coordinates[route.coordinates.length - 1]} 
                  icon={createCustomMarker(route.color)}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{new Date(route.date).toLocaleDateString()}</strong>
                      <div>End: {route.endTime}</div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700">
            <MapIcon size={64} strokeWidth={1} />
            <p className="mt-4 text-sm font-medium">
              {routes.length === 0 ? 'Upload GPX files to view routes' : 'No visible routes'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelRoute;
