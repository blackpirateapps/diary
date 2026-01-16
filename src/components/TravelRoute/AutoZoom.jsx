import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

function AutoZoom({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], animate: true });
        }
    }, [bounds, map]);
    return null;
}

export default AutoZoom;
