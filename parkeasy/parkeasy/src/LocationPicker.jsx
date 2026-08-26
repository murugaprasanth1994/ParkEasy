import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icons not loading in bundlers
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

export default function LocationPicker({ value, onChange }) {
  const [position, setPosition] = useState(value || null);

  function handlePick(pos) {
    setPosition(pos);
    onChange(pos);
  }

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1.5px solid #E5E1D8' }}>
      <MapContainer
        center={position || CHENNAI_CENTER}
        zoom={13}
        style={{ height: 220, width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <ClickHandler onPick={handlePick} />
        {position && <Marker position={position} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}
