import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Navigation, Map as MapIcon, Clock, Calendar } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- FIX LEAFLET ICONS IN REACT/VITE ---
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom Icons for Start (Green) and End (Red)
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// --- HELPER: HEADER ---
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

// --- HELPER: AUTO-ZOOM ---
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

// --- MAIN COMPONENT ---
const TravelRoute = ({ navigate }) => {
  const [routeData, setRouteData] = useState([]);
  const [meta, setMeta] = useState({ 
    startTime: null, 
    endTime: null, 
    duration: null, 
    date: null 
  });
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset error state
    setError(null);
    setFileName(file.name);
    
    const reader = new FileReader();

    reader.onerror = () => {
      setError('Failed to read file');
      setRouteData([]);
    };

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error('Invalid GPX file format');
        }

        const trkpts = xmlDoc.getElementsByTagName("trkpt");
        
        if (trkpts.length === 0) {
          throw new Error('No track points found in GPX file');
        }

        const coordinates = [];
        let startTime = null;
        let endTime = null;

        for (let i = 0; i < trkpts.length; i++) {
          const lat = parseFloat(trkpts[i].getAttribute("lat"));
          const lon = parseFloat(trkpts[i].getAttribute("lon"));
          
          if (isNaN(lat) || isNaN(lon)) {
            console.warn(`Invalid coordinates at point ${i}`);
            continue;
          }
          
          coordinates.push([lat, lon]);

          // Parse Time
          const timeTag = trkpts[i].getElementsByTagName("time")[0];
          if (timeTag) {
            const t = new Date(timeTag.textContent);
            if (i === 0) startTime = t;
            endTime = t;
          }
        }

        if (coordinates.length === 0) {
          throw new Error('No valid coordinates found');
        }

        // Calculate Stats
        let durationStr = "N/A";
        let dateStr = "N/A";

        if (startTime && endTime) {
          const diffMs = endTime - startTime;
          const hours = Math.floor(diffMs / 3600000);
          const mins = Math.round((diffMs % 3600000) / 60000);
          durationStr = `${hours}h ${mins}m`;
          
          dateStr = startTime.toLocaleDateString(undefined, { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          });
        }

        setRouteData(coordinates);
        setMeta({
          startTime: startTime ? startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : null,
          endTime: endTime ? endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : null,
          duration: durationStr,
          date: dateStr
        });
        setError(null);
      } catch (err) {
        console.error('Error parsing GPX:', err);
        setError(err.message || 'Failed to parse GPX file');
        setRouteData([]);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="pb-24 animate-slideUp h-screen flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
      <PageHeader title="Travel Route" onBack={() => navigate('more')} />
      
      {/* 1. UPLOAD SECTION */}
      <div className="p-4 z-10 flex-shrink-0">
        <div className={`bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm transition-all ${routeData.length > 0 ? 'flex items-center justify-between py-3' : 'text-center py-8'}`}>
          
          {routeData.length === 0 ? (
            // Empty State
            <div className="w-full">
              <div className="w-12 h-12 bg-[var(--accent-50)] dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-[var(--accent-600)] dark:text-[var(--accent-500)]">
                <Navigation size={24} />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Upload GPX File</h3>
              <p className="text-xs text-gray-500 mb-4">Visualize your journey on the map</p>
              {error && (
                <p className="text-xs text-red-500 mb-3 px-4">{error}</p>
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-xl text-sm font-medium transition-colors"
              >
                Choose File
              </button>
            </div>
          ) : (
            // Loaded State
            <>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--accent-50)] dark:bg-gray-800 rounded-lg text-[var(--accent-600)]">
                  <MapIcon size={20} />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{fileName}</h3>
                  <p className="text-xs text-gray-500">{routeData.length} points loaded</p>
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-[var(--accent-600)] px-3 py-2 bg-[var(--accent-50)] rounded-lg hover:bg-[var(--accent-100)] transition-colors"
              >
                Change
              </button>
            </>
          )}
          <input 
            type="file" 
            accept=".gpx" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>

        {/* 2. STATS BAR */}
        {routeData.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <Clock size={18} className="text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Duration</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{meta.duration}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <Calendar size={18} className="text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Date</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{meta.date}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. MAP AREA - FIXED HEIGHT */}
      <div className="flex-1 relative w-full bg-gray-100 dark:bg-gray-900 overflow-hidden min-h-0">
        {routeData.length > 0 ? (
          <MapContainer 
            key={routeData[0].join(',')} // Force re-render on new data
            center={routeData[0]} 
            zoom={13} 
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", minHeight: "300px" }}
            className="z-0"
          >
            <ChangeView bounds={routeData} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* The Route Line */}
            <Polyline 
              positions={routeData} 
              pathOptions={{ 
                color: '#6366f1', 
                weight: 4, 
                opacity: 0.8,
                lineJoin: 'round',
                lineCap: 'round'
              }} 
            />
            
            {/* Start Marker (Green) */}
            {routeData[0] && (
              <Marker position={routeData[0]} icon={startIcon}>
                <Popup>
                  <strong>Start</strong>
                  {meta.startTime && <div>{meta.startTime}</div>}
                </Popup>
              </Marker>
            )}

            {/* End Marker (Red) */}
            {routeData[routeData.length - 1] && (
              <Marker position={routeData[routeData.length - 1]} icon={endIcon}>
                <Popup>
                  <strong>End</strong>
                  {meta.endTime && <div>{meta.endTime}</div>}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700">
            <MapIcon size={64} strokeWidth={1} />
            <p className="mt-4 text-sm font-medium">Map Preview</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelRoute;
