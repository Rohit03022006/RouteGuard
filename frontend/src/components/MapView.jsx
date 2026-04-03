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

// Custom Truck Icon
const truckIcon = new L.DivIcon({
  html: `<div class="bg-brand-deep p-1.5 rounded-lg border-2 border-white shadow-xl flex items-center justify-center transform rotate-45">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EFF6E0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="-rotate-45"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-1.39-1.74a2 2 0 0 0-1.56-.74H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Helper component to center map on coordinates
const ChangeView = ({ center }) => {
  const map = useMap();
  map.setView(center, 12);
  return null;
};

// Simple polyline decoder (very basic for demo purposes)
const decodePolyline = (str, precision = 5) => {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates = [],
    shift = 0,
    result = 0,
    byte = null,
    latitude_change,
    longitude_change,
    factor = Math.pow(10, precision);
  while (index < str.length) {
    byte = null;
    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude_change = result & 1 ? ~(result >> 1) : result >> 1;
    lat += latitude_change;
    byte = null;
    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude_change = result & 1 ? ~(result >> 1) : result >> 1;
    lng += longitude_change;
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
};

const MapView = ({ truck }) => {
  const routePoints = truck.polyline ? decodePolyline(truck.polyline) : [];

  const currentPosition = truck.lastLocation || [28.8571, 76.827];

  return (
    <MapContainer
      center={currentPosition}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
    >
      <ChangeView center={currentPosition} />

      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

      {/* Route */}
      {routePoints.length > 0 && (
        <Polyline
          positions={routePoints}
          color={truck.deviation ? "#ef4444" : "#124559"}
          weight={6}
          opacity={0.8}
        />
      )}

      {/*  Live Truck */}
      <Marker position={currentPosition} icon={truckIcon}>
        <Popup>
          <b>{truck.id}</b>
          <br />
          {truck.driver}
        </Popup>
      </Marker>

      {/* Destination */}
      <Marker position={truck.destination}>
        <Popup>Destination</Popup>
      </Marker>
    </MapContainer>
  );
};

export default MapView;
