import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

// Custom Truck Icon
const truckIcon = (isDeviated) => new L.DivIcon({
  html: `<div class="p-1.5 rounded-lg border-2 border-white shadow-xl flex items-center justify-center transform rotate-45 transition-all duration-1000 ${isDeviated ? 'bg-red-500 scale-110' : 'bg-brand-deep'}">
        <svg class="-rotate-45" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="#ffffff" width="14" height="14">
          <path d="M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160zM112 416a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm368-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"/>
        </svg>
      </div>`,
  className: "bg-transparent border-none",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const BoundsFitter = ({ positions }) => {
  const map = useMap();
  React.useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [map, positions]);
  return null;
};

const FleetMap = ({ trucks }) => {
  const navigate = useNavigate();

  // Calculate bounds to fit all trucks
  const positions = trucks.length > 0 ? trucks.map(t => t.lastLocation) : [[28.6139, 77.2090]];
  
  return (
    <div className="w-full h-[400px] rounded-[2.5rem] overflow-hidden shadow-2xl border border-brand-sage/20 relative group mb-8">
      <MapContainer
        center={positions[0]}
        zoom={10}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <BoundsFitter positions={positions} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        
        {trucks.map((truck) => (
          <Marker 
            key={truck.id} 
            position={truck.lastLocation} 
            icon={truckIcon(truck.deviation)}
            eventHandlers={{
              click: () => navigate(`/truck/${truck.id}`)
            }}
          >
            <Popup className="custom-popup">
              <div className="p-1">
                <p className="text-xs font-black text-brand-darkest uppercase tracking-widest mb-1">{truck.id}</p>
                <div className="space-y-1">
                  <p className="text-[10px] text-brand-steel flex justify-between gap-4">
                    <span>Driver:</span> <span className="font-bold text-brand-darkest">{truck.driver}</span>
                  </p>
                  <p className="text-[10px] text-brand-steel flex justify-between gap-4">
                    <span>Status:</span> <span className={`font-bold ${truck.deviation ? 'text-red-500' : 'text-green-600'}`}>{truck.status}</span>
                  </p>
                </div>
                <button 
                  onClick={() => navigate(`/truck/${truck.id}`)}
                  className="mt-3 w-full bg-brand-darkest text-white text-[9px] font-black uppercase py-1.5 rounded-lg hover:bg-brand-deep transition-colors"
                >
                  Deep View
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Overlay Legend */}
      <div className="absolute top-6 right-6 z-[1000] glass px-4 py-2 rounded-xl border border-white/20 shadow-xl pointer-events-none">
        <p className="text-[9px] font-black uppercase tracking-widest text-brand-steel mb-2">Fleet Status</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-brand-deep"></div>
            <span className="text-[10px] font-bold text-brand-darkest">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-brand-darkest">Deviated</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetMap;
