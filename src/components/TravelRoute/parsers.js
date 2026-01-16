import { parseCoordString } from './utils';

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

    const rawPaths = [];
    const activities = [];

    segments.forEach(segment => {
        if (segment.timelinePath && Array.isArray(segment.timelinePath)) {
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
                    activityType: null,
                    locationName: null,
                    fileName,
                    type: 'JSON_PATH'
                });
            }
        }
        else if (segment.activity) {
            const act = segment.activity;
            const startCoord = parseCoordString(act.start?.latLng);
            const endCoord = parseCoordString(act.end?.latLng);

            if (startCoord && endCoord) {
                const start = new Date(segment.startTime);
                const end = new Date(segment.endTime);
                activities.push({
                    date: start.toISOString().split('T')[0],
                    coordinates: [startCoord, endCoord],
                    startTime: start,
                    endTime: end,
                    activityType: act.topCandidate?.type,
                    locationName: null,
                    fileName,
                    type: 'JSON_ACTIVITY'
                });
            }
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
