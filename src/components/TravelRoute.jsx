import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Navigation, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Local Header Component (or import from a shared file if you have one)
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

// Helper to zoom map to route
function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

const TravelRoute = ({ navigate }) => {
  const [routeData, setRouteData] = useState([]);
  const [stats, setStats] = useState({ points: 0 });
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const trkpts = xmlDoc.getElementsByTagName("trkpt");
      
      const coordinates = [];
      for (let i = 0; i < trkpts.length; i++) {
        const lat = parseFloat(trkpts[i].getAttribute("lat"));
        const lon = parseFloat(trkpts[i].getAttribute("lon"));
        coordinates.push([lat, lon]);
      }

      setRouteData(coordinates);
      setStats({ points: coordinates.length });
    };

    reader.readAsText(file);
  };

  return (
    <div className="pb-24 animate-slideUp h-full flex flex-col">
      <PageHeader title="Travel Route" onBack={() => navigate('more')} />
      
      <div className="flex-1 flex flex-col p-4 space-y-4">
        {/* Upload Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm text-center">
          <div className="w-12 h-12 bg-[var(--accent-50)] dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-[var(--accent-600)] dark:text-[var(--accent-500)]">
             <Navigation size={24} />
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            {fileName || "Upload GPX File"}
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            {routeData.length > 0 
              ? `${stats.points} track points loaded` 
              : "Select a .gpx file from your device"}
          </p>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-xl text-sm font-medium transition-colors"
          >
            Choose File
          </button>
          <input 
            type="file" 
            accept=".gpx" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>

        {/* Map Area */}
        <div className="flex-1 min-h-[400px] bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative z-0">
          {routeData.length > 0 ? (
            <MapContainer 
              center={routeData[0]} 
              zoom={13} 
              style={{ height: "100%", width: "100%" }}
              className="z-0"
            >
              <ChangeView bounds={routeData} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline 
                positions={routeData} 
                pathOptions={{ color: 'var(--accent-500)', weight: 4 }} 
              />
            </MapContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
               <MapIcon size={48} className="mb-2 opacity-20" />
               <span className="text-sm">Map will appear here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TravelRoute;