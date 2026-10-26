"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

// VA-156: mapa real (MapLibre GL JS + teselas de OpenFreeMap) encima del SVG de la provincia. Se
// carga solo cuando el bloque entra en pantalla, desde public/vendor/ (módulo nativo: no suma JS a la
// página). Mientras carga, sin WebGL o si algo falla, queda el SVG de abajo. Nunca muestra un punto
// exacto: un círculo de ~5 km alrededor del centro de la localidad, y no se puede acercar más que eso.
// OpenFreeMap: sin clave ni cookies; la atribución la pone el estilo (OpenFreeMap, OpenMapTiles y
// OpenStreetMap).

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const RADIUS_KM = 5;
const VENDOR = `/vendor/maplibre-gl-${process.env.NEXT_PUBLIC_MAPLIBRE_VERSION}`;

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Polígono de un círculo (en grados) alrededor de un punto. */
function circle(lon: number, lat: number, km: number, steps = 64): [number, number][] {
  const dLat = km / 110.574;
  const dLon = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return ring;
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function ZoneMapEnhancer({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let map: MapLibreMap | null = null;
    let cancelled = false;

    const start = async () => {
      if (!hasWebGL()) return;
      try {
        loadCss(`${VENDOR}/maplibre-gl.css`);
        const lib: typeof import("maplibre-gl") = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${VENDOR}/maplibre-gl.mjs`);
        if (cancelled) return;
        const ring = circle(longitude, latitude, RADIUS_KM);
        const lons = ring.map((p) => p[0]);
        const lats = ring.map((p) => p[1]);
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ];
        map = new lib.Map({
          container: el,
          style: STYLE,
          bounds,
          fitBoundsOptions: { padding: 32 },
          minZoom: 4,
          cooperativeGestures: true,
          // Atribución visible (lo pide OpenFreeMap), en una línea chica: la compacta arranca abierta y tapa el mapa.
          attributionControl: { compact: false },
        });
        map.addControl(new lib.NavigationControl({ showCompass: false }), "top-left");
        map.once("load", () => {
          if (!map || cancelled) return;
          // No se acerca más que el círculo: la ubicación es aproximada.
          map.setMaxZoom(map.getZoom());
          map.addSource("zona", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } } });
          map.addLayer({ id: "zona-relleno", type: "fill", source: "zona", paint: { "fill-color": "#D62828", "fill-opacity": 0.12 } });
          map.addLayer({ id: "zona-borde", type: "line", source: "zona", paint: { "line-color": "#D62828", "line-width": 2 } });
          setReady(true);
        });
        map.on("error", (e) => console.warn("[mapa] error de MapLibre:", e.error?.message ?? e));
      } catch (error) {
        console.warn("[mapa] no se pudo cargar MapLibre; queda el mapa de la provincia:", error);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void start();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
      map?.remove();
    };
  }, [latitude, longitude]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      aria-hidden={!ready}
      className={`absolute inset-0 transition-opacity duration-300 ${ready ? "opacity-100" : "pointer-events-none opacity-0"}`}
    />
  );
}
