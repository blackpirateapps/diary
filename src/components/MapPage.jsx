import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import { useBlobUrl } from '../db';

// We inject the Leaflet CSS directly via a style tag since we can't edit index.html
// Added ".dark .leaflet-tile-pane" filter to invert map colors in dark mode automatically!
const LeafletStyles = () => (
  <>
    <link 
      rel="stylesheet" 
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
      crossOrigin=""
    />
    <style>{`
      .leaflet-container {
        width: 100%;
        height: 100%;
        border-radius: 24px;
        z-index: 1;
        background: transparent !important;
      }
      /* Custom Marker Fix for React Leaflet */
      .leaflet-default-icon-path {
        background-image: url(https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png);
      }
      .custom-popup .leaflet-popup-content-wrapper {
        border-radius: 12px;
        padding: 0;
        overflow: hidden;
        background-color: white;
      }
      /* Dark Mode Popup Overrides */
      .dark .custom-popup .leaflet-popup-content-wrapper {
        background-color: #1f2937; /* gray-800 */
        color: #f3f4f6;
      }
      .dark .custom-popup .leaflet-popup-tip {
        background-color: #1f2937;
      }
      .custom-popup .leaflet-popup-content {
        margin: 0;
      }
      
      /* THEME ENGINE MAP MAGIC: Dark Mode Map Tiles */
      /* Inverts the standard light map to look dark without a paid API */
      .dark .leaflet-tile-pane {
        filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
      }
    `}</style>
  </>
);

// --- HELPER COMPONENT FOR MAP IMAGES ---
const MapPopupImage = ({ src }) => {
  const url = useBlobUrl(src);
  if (!url) return null;
  return <img src={url} alt="" className="w-full h-full object-cover" />;
};

// Helper to recenter map when entries change
const RecenterMap = ({ entries }) => {
  const map = useMap();
  useEffect(() => {
    if (entries.length > 0) {
      // Find the most recent entry with coords
      const latest = entries.find(e => e.locationLat && e.locationLng);
      if (latest) {
        map.setView([latest.locationLat, latest.locationLng], 13);
      }
    }
  }, [entries, map]);
  return null;
};

const MapPage = ({ entries, onEdit }) => {
  // Filter only entries that have coordinates
  const mapEntries = entries.filter(e => e.locationLat && e.locationLng);

  // Default to a world view or a specific starting point (e.g. New York) if no entries
  const defaultCenter = [40.7128, -74.0060];
  const startCenter = mapEntries.length > 0 
    ? [mapEntries[0].locationLat, mapEntries[0].locationLng] 
    : defaultCenter;

  return (
    <div className="h-screen bg-[#F3F4F6] dark:bg-gray-950 pb-24 flex flex-col transition-colors">
      <LeafletStyles />
      
      <header className="px-6 pt-6 pb-4 bg-[#F3F4F6] dark:bg-gray-950 transition-colors">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Atlas</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {mapEntries.length} locations visited
        </p>
      </header>

      <div className="flex-1 px-4 pb-4">
        <div className="h-full w-full bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden relative">
          {mapEntries.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10 flex-col text-center p-6">
              <div className="w-16 h-16 bg-[var(--accent-50)] dark:bg-gray-800 text-[var(--accent-500)] rounded-full flex items-center justify-center mb-4">
                <MapPin size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Location Data</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-xs">
                Enable location services when creating entries to see them appear on your map.
              </p>
            </div>
          ) : (
            <MapContainer center={startCenter} zoom={13} scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap entries={mapEntries} />
              
              {mapEntries.map(entry => (
                <Marker 
                  key={entry.id} 
                  position={[entry.locationLat, entry.locationLng]}
                >
                  <Popup className="custom-popup">
                    <div className="p-1 min-w-[200px]" onClick={() => onEdit(entry)}>
                      <div className="flex items-center gap-2 mb-2 p-2 pb-0 text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">
                         <Calendar size={12} />
                         {new Date(entry.date).toLocaleDateString()}
                      </div>
                      
                      {entry.images && entry.images.length > 0 && (
                        <div className="w-full h-24 mb-2 overflow-hidden bg-gray-100 dark:bg-gray-800 mt-2 rounded-lg">
                          <MapPopupImage src={entry.images[0]} />
                        </div>
                      )}

                      <div className="p-2 pt-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm line-clamp-2 mb-2">
                          {entry.content.replace(/<[^>]*>?/gm, ' ')}
                        </p>
                        
                        <button className="text-[var(--accent-500)] text-xs font-bold flex items-center gap-1 hover:underline">
                          View Entry <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;