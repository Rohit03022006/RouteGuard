import React from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const truckIcon = new L.DivIcon({
  html: `<div class="bg-brand-deep p-1.5 rounded-lg border-2 border-white shadow-xl flex items-center justify-center transform rotate-45">
        <svg class="-rotate-45" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="#ffffff" width="14" height="14">
          <path d="M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160zM112 416a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm368-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"/>
        </svg>
      </div>`,
  className: "bg-transparent border-none",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
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

const BoundsFitter = ({ points }) => {
  const map = useMap();
  React.useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
};

const MapView = ({ truck, history = [] }) => {
  if (!truck) return null;

  // Planned Route
  let routePoints = [];
  try {
    routePoints =
      truck.polyline && truck.polyline.length > 0
        ? polyline.decode(truck.polyline)
        : [];
  } catch (e) {
    console.error("Polyline decode error:", e);
    routePoints = [];
  }

  // Trajectory (Breadcrumb trail)
  const trajectoryPoints = history.map(log => [log.latitude, log.longitude]);

  const currentPosition = truck.lastLocation || [28.8571, 76.827];
  
  // Starting point from route if available
  const startPosition = routePoints.length > 0 ? routePoints[0] : null;

  // Gather all relevant points to frame the map correctly
  const allPoints = [...routePoints, ...trajectoryPoints, currentPosition];
  if (truck.destination) allPoints.push(truck.destination);

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden shadow-xl border border-brand-sage/20 relative">
      <MapContainer
        center={currentPosition}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <BoundsFitter points={allPoints.length > 1 ? allPoints : [currentPosition]} />

        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

        {/* PLANNED ROUTE (RED) */}
        {routePoints && routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            color="#ff4d4d" 
            weight={4}
            opacity={0.4}
            dashArray="10, 10"
          />
        )}

        {/* ACTUAL TRAJECTORY (BLUE) */}
        {trajectoryPoints && trajectoryPoints.length > 1 && (
          <Polyline
            positions={trajectoryPoints}
            color="#1e3a8a" 
            weight={5}
            opacity={0.8}
          />
        )}

        {/* START MARKER */}
        {startPosition && (
            <Marker position={startPosition} icon={startIcon}>
                <Popup><b>Start Point</b></Popup>
            </Marker>
        )}

        {/* Destination Marker */}
        {truck.destination && (
          <Marker position={truck.destination} icon={destIcon}>
            <Popup><b>Destination</b></Popup>
          </Marker>
        )}

        {/* Truck Marker (Current Position) */}
        <Marker position={currentPosition} icon={truckIcon}>
          <Popup>
            <b>{truck.id}</b>
            <br />
            Driver: {truck.driver}
            <br />
            Risk: {truck.risk}%
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MapView;
