import React from 'react';
import { Navigation, Car, Bike, Footprints, Plane, Train } from 'lucide-react';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// --- LEAFLET ICONS FIX ---
export const setupLeafletIcons = () => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconUrl: markerIcon,
        iconRetinaUrl: markerIcon2x,
        shadowUrl: markerShadow,
    });
};

export const parseCoordString = (coordStr) => {
    if (!coordStr) return null;
    const parts = coordStr.replace(/°/g, '').split(',');
    if (parts.length !== 2) return null;
    return [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
};

export const calculateDistance = (coords) => {
    if (coords.length < 2) return 0;
    let totalDistance = 0;
    const R = 6371; // Earth radius km
    for (let i = 0; i < coords.length - 1; i++) {
        const [lat1, lon1] = coords[i];
        const [lat2, lon2] = coords[i + 1];
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += R * c;
    }
    return totalDistance;
};

export const getActivityIcon = (type) => {
    if (!type) return <Navigation size={14} />;
    const t = type.toUpperCase();
    if (t.includes('WALK') || t.includes('HIKE') || t.includes('RUN') || t.includes('FOOT')) return <Footprints size={14} />;
    if (t.includes('CYCL') || t.includes('BIKE')) return <Bike size={14} />;
    if (t.includes('VEHICLE') || t.includes('DRIVE') || t.includes('CAR')) return <Car size={14} />;
    if (t.includes('FLY') || t.includes('AIR')) return <Plane size={14} />;
    if (t.includes('TRAIN') || t.includes('SUBWAY') || t.includes('TRAM')) return <Train size={14} />;
    return <Navigation size={14} />;
};

export const formatActivityName = (type) => {
    if (!type) return 'Travel';
    return type.replace(/IN_|_/g, ' ').toLowerCase().trim().replace(/\b\w/g, c => c.toUpperCase());
};

export const generateColor = (idx) => {
    const hues = [211, 25, 45, 150, 280, 35];
    return `hsl(${hues[idx % hues.length]}, 90%, 55%)`;
};
