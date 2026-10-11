"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// VA-83: el mapa en sí (solo lo carga ListingLocationMap cuando entra en pantalla).
// Teselas de Stadia Maps (estilo "Alidade Smooth", claro). No se usan los servidores de
// openstreetmap.org, cuya política no permite uso intensivo, ni CARTO, que ahora pide clave.
// Stadia autoriza por dominio: en localhost anda sin clave; en producción hay que registrar el
// dominio en la cuenta de Stadia (sin clave en el código). Si se prefiere clave, se lee de
// NEXT_PUBLIC_STADIA_API_KEY (opcional). Sin zoom con la rueda, para no secuestrar el scroll de la
// página; los botones de zoom quedan visibles.
const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_API_KEY;
const TILES = `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png${STADIA_KEY ? `?api_key=${STADIA_KEY}` : ""}`;
const ATTRIBUTION =
  '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener noreferrer">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

export default function LeafletZoneMap({ lat, lon, radius }: { lat: number; lon: number; radius: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Si algo del mapa falla, el aviso se sigue viendo: el bloque queda con su fondo y se registra.
    let map: L.Map | null = null;
    try {
      map = createMap(ref.current, lat, lon, radius);
    } catch (error) {
      console.error("[mapa] no se pudo mostrar la zona:", error);
    }
    return () => {
      map?.remove();
    };
  }, [lat, lon, radius]);

  return <div ref={ref} className="h-full w-full" aria-label="Mapa de la zona aproximada del aviso" role="img" />;
}

function createMap(el: HTMLElement, lat: number, lon: number, radius: number) {
  const map = L.map(el, {
    scrollWheelZoom: false,
    zoomControl: true,
    attributionControl: true,
  });
  map.attributionControl.setPrefix(false);
  // Encuadre: el círculo con margen, así se ve la ciudad y sus alrededores. Se calcula desde el
  // centro y el radio (circle.getBounds() falla si el mapa todavía no tiene vista).
  map.fitBounds(L.latLng(lat, lon).toBounds(radius * 2), { padding: [24, 24] });
  L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(map);
  L.circle([lat, lon], {
    radius,
    color: "#E70F1F",
    weight: 2,
    fillColor: "#E70F1F",
    fillOpacity: 0.15,
    interactive: false,
  }).addTo(map);
  return map;
}
