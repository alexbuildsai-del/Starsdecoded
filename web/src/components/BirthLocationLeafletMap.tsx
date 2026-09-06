import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  latitude: number;
  longitude: number;
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: false });
  }, [lat, lng, map]);
  return null;
}

export default function BirthLocationLeafletMap({ latitude, longitude }: Props) {
  const center: [number, number] = [latitude, longitude];
  return (
    <MapContainer
      center={center}
      zoom={9}
      scrollWheelZoom={false}
      attributionControl={false}
      zoomControl={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      style={{
        height: "100%",
        width: "100%",
        minHeight: "260px",
        background: "#0d1117",
      }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
        maxZoom={19}
      />
      <CircleMarker
        center={center}
        radius={6}
        pathOptions={{
          color: "#9FA8DA",
          fillColor: "#7C83D4",
          fillOpacity: 0.9,
          weight: 2,
        }}
      />
      <MapRecenter lat={latitude} lng={longitude} />
    </MapContainer>
  );
}
