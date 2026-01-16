import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, PolylineUtils } from '../../db';
import { calculateDistance, generateColor } from './utils';
import { parseGPX, parseGoogleJSON } from './parsers';

export const useRoutes = () => {
    const routesMeta = useLiveQuery(() => db.routes_meta.toArray(), []);
    const routesData = useLiveQuery(() => db.routes_data.toArray(), []);
    const [routes, setRoutes] = useState([]);

    useEffect(() => {
        if (routesMeta && routesData) {
            const loadedRoutes = routesMeta.map((meta, idx) => {
                const data = routesData.find(d => d.id === meta.id);
                const coordinates = Array.isArray(data?.coordinates) && data.coordinates.length > 0
                    ? data.coordinates
                    : (data?.compressedPath ? PolylineUtils.decode(data.compressedPath) : []);

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

    return { routes, setRoutes, groupedRoutes, stats, allBounds };
};

// FIX: This function now uses Polyline encoding to compress the data before saving
export const saveRoutesToDB = async (parsedRoutes) => {
    const metaEntries = [];
    const dataEntries = [];

    parsedRoutes.forEach((r) => {
        const d = new Date(r.date);
        const routeId = `${r.date}-${r.startTime.getTime()}-${Math.random().toString(36).substr(2, 9)}`;

        const distance = typeof r.distanceKm === 'number' ? r.distanceKm : calculateDistance(r.coordinates);
        const durMs = r.endTime - r.startTime;
        const h = Math.floor(durMs / 3600000);
        const m = Math.round((durMs % 3600000) / 60000);
        const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

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

        // Save full coordinates so the map can render the exact path.
        dataEntries.push({
            id: routeId,
            coordinates: r.coordinates,
            type: r.type,
            fileName: r.fileName
        });
    });

    await db.routes_meta.bulkAdd(metaEntries);
    await db.routes_data.bulkAdd(dataEntries);

    return { metaEntries, dataEntries };
};

export const useFileUpload = () => {
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [importStats, setImportStats] = useState(null);

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
            await saveRoutesToDB(newRoutes);

            if (newRoutes.length > 0) {
                const acts = {};
                let dist = 0;
                const dates = newRoutes.map(r => new Date(r.date));
                const minDate = new Date(Math.min.apply(null, dates));
                const maxDate = new Date(Math.max.apply(null, dates));

                newRoutes.forEach(r => {
                    dist += typeof r.distanceKm === 'number' ? r.distanceKm : calculateDistance(r.coordinates);
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

    return { isImporting, progress, statusText, importStats, setImportStats, handleFileUpload };
};
