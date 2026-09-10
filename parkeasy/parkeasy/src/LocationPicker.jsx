import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pinIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const CHENNAI_CENTER = [13.0827, 80.2707];

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, Math.max(map.getZoom(), 15));
    }
  }, [position ? position[0] : null, position ? position[1] : null]);
  return null;
}

export default function LocationPicker({ value, onChange }) {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1.5px solid #E5E1D8' }}>
      <MapContainer
        center={value || CHENNAI_CENTER}
        zoom={13}
        style={{ height: 220, width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <ClickHandler onPick={onChange} />
        {value && <Marker position={value} icon={pinIcon} />}
        <Recenter position={value} />
      </MapContainer>
    </div>
  );
}
