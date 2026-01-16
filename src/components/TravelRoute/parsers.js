import { parseCoordString } from './utils';

const toLatLngFromE7 = (obj) => {
    if (!obj) return null;
    const lat = obj.latE7 ?? obj.latitudeE7 ?? obj.lat ?? obj.latitude;
    const lng = obj.lngE7 ?? obj.longitudeE7 ?? obj.lng ?? obj.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return [lat / 1e7, lng / 1e7];
};

const toDate = (value) => (value ? new Date(value) : null);

const buildRoute = ({ date, coordinates, startTime, endTime, activityType, locationName, fileName, type, distanceMeters, raw }) => ({
    date,
    coordinates,
    startTime,
    endTime,
    activityType,
    locationName,
    fileName,
    type,
    distanceKm: typeof distanceMeters === 'number' ? distanceMeters / 1000 : undefined,
    raw
});

const normalizeLine = (coords) => {
    const filtered = coords.filter(Boolean);
    if (filtered.length === 1) {
        filtered.push([...filtered[0]]);
    }
    return filtered;
};

const extractTimelinePathCoords = (segment) => {
    const coords = [];
    const timelinePath = segment.timelinePath;

    if (Array.isArray(timelinePath)) {
        timelinePath.forEach((pt) => {
            const parsed = parseCoordString(pt.point || pt.latLng);
            if (parsed) coords.push(parsed);
            else {
                const fallback = toLatLngFromE7(pt);
                if (fallback) coords.push(fallback);
            }
        });
    } else if (timelinePath && Array.isArray(timelinePath.points)) {
        timelinePath.points.forEach((pt) => {
            const parsed = parseCoordString(pt.point || pt.latLng);
            if (parsed) coords.push(parsed);
            else {
                const fallback = toLatLngFromE7(pt);
                if (fallback) coords.push(fallback);
            }
        });
    }

    return normalizeLine(coords);
};

export const parseGPX = (text, fileName) => {
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

export const parseGoogleJSON = (text, fileName) => {
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error("Invalid JSON file");
    }

    const segments = data.semanticSegments || [];
    const timelineObjects = data.timelineObjects || [];

    const rawPaths = [];
    const activities = [];

    segments.forEach(segment => {
        const coords = extractTimelinePathCoords(segment);
        if (coords.length > 0) {
            const start = new Date(segment.startTime);
            const end = new Date(segment.endTime);
            rawPaths.push(buildRoute({
                date: start.toISOString().split('T')[0],
                coordinates: coords,
                startTime: start,
                endTime: end,
                activityType: null,
                locationName: null,
                fileName,
                type: 'JSON_PATH',
                distanceMeters: segment.distanceMeters,
                raw: segment
            }));
        } else if (segment.visit?.topCandidate?.placeLocation?.latLng) {
            const visitCoord = parseCoordString(segment.visit.topCandidate.placeLocation.latLng);
            if (visitCoord) {
                const start = new Date(segment.startTime);
                const end = new Date(segment.endTime);
                rawPaths.push(buildRoute({
                    date: start.toISOString().split('T')[0],
                    coordinates: [visitCoord, visitCoord],
                    startTime: start,
                    endTime: end,
                    activityType: null,
                    locationName: null,
                    fileName,
                    type: 'JSON_VISIT',
                    distanceMeters: segment.distanceMeters,
                    raw: segment
                }));
            }
        }

        if (segment.activity) {
            const act = segment.activity;
            const startCoord = parseCoordString(act.start?.latLng);
            const endCoord = parseCoordString(act.end?.latLng);

            if (startCoord && endCoord) {
                const start = new Date(segment.startTime);
                const end = new Date(segment.endTime);
                activities.push(buildRoute({
                    date: start.toISOString().split('T')[0],
                    coordinates: [startCoord, endCoord],
                    startTime: start,
                    endTime: end,
                    activityType: act.topCandidate?.type,
                    locationName: null,
                    fileName,
                    type: 'JSON_ACTIVITY',
                    distanceMeters: segment.distanceMeters,
                    raw: segment
                }));
            }
        }
    });

    timelineObjects.forEach(obj => {
        const segment = obj.activitySegment;
        if (!segment) return;

        const duration = segment.duration || {};
        const start = toDate(segment.startTimestamp || duration.startTimestamp);
        const end = toDate(segment.endTimestamp || duration.endTimestamp);
        if (!start || !end) return;

        const date = start.toISOString().split('T')[0];
        const activityType = segment.activityType;
        const distanceMeters = typeof segment.distance === 'number' ? segment.distance : segment.distanceMeters;

        const coords = [];
        if (segment.simplifiedRawPath?.points?.length) {
            segment.simplifiedRawPath.points.forEach(pt => {
                const parsed = toLatLngFromE7(pt);
                if (parsed) coords.push(parsed);
            });
        }
        if (coords.length === 0 && segment.waypointPath?.waypoints?.length) {
            segment.waypointPath.waypoints.forEach(pt => {
                const parsed = toLatLngFromE7(pt);
                if (parsed) coords.push(parsed);
            });
        }
        if (coords.length === 0 && segment.transitPath?.transitStops?.length) {
            segment.transitPath.transitStops.forEach(stop => {
                const parsed = toLatLngFromE7(stop);
                if (parsed) coords.push(parsed);
            });
        }

        if (coords.length < 2) {
            const startCoord = toLatLngFromE7(segment.startLocation);
            const endCoord = toLatLngFromE7(segment.endLocation);
            if (startCoord && endCoord) coords.push(startCoord, endCoord);
        }

        if (coords.length > 0) {
            rawPaths.push(buildRoute({
                date,
                coordinates: normalizeLine(coords),
                startTime: start,
                endTime: end,
                activityType,
                locationName: null,
                fileName,
                type: 'JSON_PATH',
                distanceMeters,
                raw: obj
            }));
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
