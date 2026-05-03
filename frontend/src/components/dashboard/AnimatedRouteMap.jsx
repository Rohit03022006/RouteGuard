import React, { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// -------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------

// Haversine distance between two points in meters
const getDistance = (p1, p2) => {
  const R = 6371e3;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const deltaLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const deltaLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Bearing from start to end in degrees
const getBearing = (start, end) => {
  const startLat = (start.lat * Math.PI) / 180;
  const startLng = (start.lng * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;
  const endLng = (end.lng * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  let brng = Math.atan2(y, x);
  brng = brng * (180 / Math.PI);
  return (brng + 360) % 360;
};

// Interpolate a point along a segment given a fraction (0 to 1)
const interpolatePosition = (p1, p2, fraction) => {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * fraction,
    lng: p1.lng + (p2.lng - p1.lng) * fraction,
  };
};

// -------------------------------------------------------------
// Icons
// -------------------------------------------------------------

const truckIcon = (bearing) =>
  new L.DivIcon({
    html: `<div class="bg-brand-deep p-1.5 rounded-lg border-2 border-white shadow-xl flex items-center justify-center transform" style="transform: rotate(${bearing}deg); transition: transform 0.1s linear;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="#ffffff" width="14" height="14">
          <path d="M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160zM112 416a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm368-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"/>
        </svg>
      </div>`,
    className: "bg-transparent border-none",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const startIcon = new L.DivIcon({
  html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md bg-green-500"></div>`,
  className: "bg-transparent border-none",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destIcon = new L.DivIcon({
  html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md bg-purple-600"></div>`,
  className: "bg-transparent border-none",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// -------------------------------------------------------------
// Routing Component
// -------------------------------------------------------------
const RoutingMachine = ({ start, destination, onRouteFound }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!start || !destination || !map) return;

    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    const waypoints = [
      L.latLng(start[0], start[1]),
      L.latLng(destination[0], destination[1])
    ];

    routingControlRef.current = L.Routing.control({
      waypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: "#1e3a8a", weight: 5, opacity: 0.8 }]
      },
      createMarker: () => null, // We manage our own markers
      show: false // Hide the instruction panel
    }).addTo(map);

    routingControlRef.current.on('routesfound', (e) => {
      const routes = e.routes;
      if (routes && routes.length > 0) {
        const route = routes[0];
        onRouteFound({
          coordinates: route.coordinates, // Array of L.LatLng
          totalDistance: route.summary.totalDistance, // in meters
          totalTime: route.summary.totalTime // in seconds
        });
      }
    });

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, start, destination]);

  return null;
};

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------

const AnimatedRouteMap = ({ truck, defaultSpeedMetersPerSec = 20, onRouteData, onAnimationComplete }) => {
  const [routeData, setRouteData] = useState(null);

  // Sync route data to parent when it is found
  useEffect(() => {
    if (routeData && onRouteData) {
        onRouteData(routeData);
    }
  }, [routeData, onRouteData]);
  
  // Animation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [markerPos, setMarkerPos] = useState(null);
  const [markerBearing, setMarkerBearing] = useState(90);

  // Animation Refs
  const reqFrameRef = useRef();
  const lastTimeRef = useRef();
  const currentDistanceRef = useRef(0);
  const segmentLengthsRef = useRef([]);

  // Calculate segment lengths once route is found
  useEffect(() => {
    if (!routeData || !routeData.coordinates || routeData.coordinates.length < 2) return;

    const coords = routeData.coordinates;
    const lengths = [];
    for (let i = 0; i < coords.length - 1; i++) {
      lengths.push(getDistance(coords[i], coords[i + 1]));
    }
    segmentLengthsRef.current = lengths;
    
    // Initialize marker to start
    setMarkerPos(coords[0]);
    if (coords.length > 1) {
      setMarkerBearing(getBearing(coords[0], coords[1]));
    }
    currentDistanceRef.current = 0;
  }, [routeData]);

  // Animation loop
  const animateMarker = (timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaMs = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (!routeData || !routeData.coordinates || routeData.coordinates.length < 2) {
      reqFrameRef.current = requestAnimationFrame(animateMarker);
      return;
    }

    const coords = routeData.coordinates;
    const lengths = segmentLengthsRef.current;
    
    // Calculate speed based on multiplier
    // default speed = 20 m/s (~72 km/h)
    // distance to move in this frame = speed * (deltaMs / 1000)
    const moveDistance = defaultSpeedMetersPerSec * speedMultiplier * (deltaMs / 1000);
    
    currentDistanceRef.current += moveDistance;

    // Determine which segment the current distance falls into
    let accumulatedDist = 0;
    let segmentIndex = 0;
    
    for (let i = 0; i < lengths.length; i++) {
      if (currentDistanceRef.current <= accumulatedDist + lengths[i]) {
        segmentIndex = i;
        break;
      }
      accumulatedDist += lengths[i];
      // If we are at the last segment and overflowed
      if (i === lengths.length - 1) {
        segmentIndex = i;
      }
    }

    if (currentDistanceRef.current >= routeData.totalDistance) {
      // Reached the end
      setMarkerPos(coords[coords.length - 1]);
      setIsPlaying(false);
      if (onAnimationComplete) {
         onAnimationComplete();
      }
      return;
    }

    const p1 = coords[segmentIndex];
    const p2 = coords[segmentIndex + 1];
    
    const segmentStartDist = accumulatedDist;
    const distInSegment = currentDistanceRef.current - segmentStartDist;
    const fraction = Math.max(0, Math.min(1, distInSegment / (lengths[segmentIndex] || 1)));

    const interpolatedPos = interpolatePosition(p1, p2, fraction);
    
    // Smooth bearing update only if p1 and p2 are different enough
    if (lengths[segmentIndex] > 0.5) {
       setMarkerBearing(getBearing(p1, p2));
    }

    setMarkerPos(interpolatedPos);
    reqFrameRef.current = requestAnimationFrame(animateMarker);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      reqFrameRef.current = requestAnimationFrame(animateMarker);
    } else {
      if (reqFrameRef.current) {
        cancelAnimationFrame(reqFrameRef.current);
      }
    }
    return () => cancelAnimationFrame(reqFrameRef.current);
  }, [isPlaying, speedMultiplier, routeData]);

  // Handlers
  const handlePlayPause = () => {
    if (currentDistanceRef.current >= (routeData?.totalDistance || 0)) {
        // Reset if at end
        currentDistanceRef.current = 0;
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    currentDistanceRef.current = 0;
    if (routeData && routeData.coordinates.length > 0) {
      setMarkerPos(routeData.coordinates[0]);
      if (routeData.coordinates.length > 1) {
         setMarkerBearing(getBearing(routeData.coordinates[0], routeData.coordinates[1]));
      }
    }
  };

  if (!truck) return null;

  // Store the initial positions so that live polling doesn't reset the route and animation every 2 seconds
  const [initialStart] = useState(truck.lastLocation || [28.8571, 76.827]);
  const [initialDest] = useState(truck.destination || [28.6139, 77.2090]); // Default New Delhi for demo

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={initialStart}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        
        <RoutingMachine 
            start={initialStart} 
            destination={initialDest} 
            onRouteFound={setRouteData} 
        />

        {/* Start Marker */}
        <Marker position={initialStart} icon={startIcon}>
            <Popup><b>Start:</b> {truck.id}</Popup>
        </Marker>

        {/* Destination Marker */}
        <Marker position={initialDest} icon={destIcon}>
            <Popup><b>Destination</b></Popup>
        </Marker>

        {/* Animated Truck Marker */}
        {markerPos && (
            <Marker position={markerPos} icon={truckIcon(markerBearing)}>
                <Popup>
                    <b>{truck.id}</b><br/>
                    Driver: {truck.driver}<br/>
                    Status: {truck.status}
                </Popup>
            </Marker>
        )}
      </MapContainer>

      {/* Overlay Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] glass px-6 py-3 rounded-2xl border border-white/30 shadow-2xl flex items-center gap-6">
        <div className="flex items-center gap-3">
            <button 
                onClick={handlePlayPause}
                disabled={!routeData}
                className="w-10 h-10 rounded-full bg-brand-darkest text-white flex items-center justify-center hover:bg-brand-deep transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                )}
            </button>
            <button 
                onClick={handleReset}
                disabled={!routeData}
                className="w-10 h-10 rounded-full bg-white text-brand-darkest border border-brand-sage/30 flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            </button>
        </div>
        
        <div className="w-px h-8 bg-brand-sage/30"></div>
        
        <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-steel">Speed:</span>
            <div className="flex gap-1 bg-white/50 p-1 rounded-lg border border-brand-sage/20">
                {[1, 5, 10].map(multiplier => (
                    <button
                        key={multiplier}
                        onClick={() => setSpeedMultiplier(multiplier)}
                        disabled={!routeData}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all disabled:opacity-50 ${speedMultiplier === multiplier ? 'bg-brand-darkest text-white' : 'text-brand-steel hover:bg-white'}`}
                    >
                        {multiplier}x
                    </button>
                ))}
            </div>
        </div>

        {routeData && (
            <>
                <div className="w-px h-8 bg-brand-sage/30"></div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-steel">Distance</span>
                    <span className="text-sm font-black text-brand-darkest">{(routeData.totalDistance / 1000).toFixed(1)} km</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-steel">Est. Time</span>
                    <span className="text-sm font-black text-brand-darkest">{Math.round(routeData.totalTime / 60)} min</span>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default AnimatedRouteMap;
