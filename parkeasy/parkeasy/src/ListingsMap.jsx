import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const pinIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const CHENNAI_CENTER = [13.0827, 80.2707];

export default function ListingsMap({ listings, onCall }) {
  const withCoords = listings.filter(l => l.lat != null && l.lng != null);
  const center = withCoords.length > 0 ? [withCoords[0].lat, withCoords[0].lng] : CHENNAI_CENTER;

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #EDEAE1' }}>
      <MapContainer center={center} zoom={12} style={{ height: 420, width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {withCoords.map(l => (
          <Marker key={l.id} position={[l.lat, l.lng]} icon={pinIcon}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{l.area}</strong>
                {l.is_available === false && (
                  <p style={{ margin: '2px 0', color: '#B91C1C', fontSize: 12, fontWeight: 700 }}>Currently occupied</p>
                )}
                <p style={{ margin: '4px 0', fontSize: 13 }}>{l.address}</p>
                <p style={{ margin: '4px 0', fontWeight: 700 }}>₹{l.price}/hr</p>
                <a href={`tel:${l.phone}`} onClick={() => onCall && onCall(l)}>
                  Call {l.host_name}
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
