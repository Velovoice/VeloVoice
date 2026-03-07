import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function MapView({ center = [77.5946, 12.9716], zoom = 12 }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markerScale = Math.max(0.8, Math.min(1.35, window.innerWidth / 1400));

    useEffect(() => {
        if (map.current) return; // Initialize only once

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://demotiles.maplibre.org/style.json', // Open-source demo tiles
            center: center,
            zoom: zoom,
            attributionControl: false
        });

        // Add navigation controls (zoom in/out) but hide them for CarPlay aesthetic
        // map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    }, []);

    useEffect(() => {
        if (!map.current) return;
        map.current.flyTo({
            center: center,
            essential: true,
            duration: 2000
        });
    }, [center]);

    return (
        <div className="map-view-shell" style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            position: 'relative' // Added for absolute positioning of marker
        }}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

            {/* Car Position Marker (Static at center, simulating GPS lock) */}
            <div className="map-center-marker" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none'
            }}>
                {/* Outer Pulse */}
                <motion.div
                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                        position: 'absolute',
                        width: `${40 * markerScale}px`,
                        height: `${40 * markerScale}px`,
                        background: 'rgba(10, 132, 255, 0.4)',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        left: `${-20 * markerScale}px`,
                        top: `${-20 * markerScale}px`
                    }}
                />
                {/* Inner Core */}
                <div style={{
                    width: `${16 * markerScale}px`,
                    height: `${16 * markerScale}px`,
                    background: '#0a84ff',
                    border: '3px solid #fff',
                    borderRadius: '50%',
                    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                }} />
            </div>
        </div>
    );
}
