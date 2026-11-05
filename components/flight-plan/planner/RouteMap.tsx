"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { AeroPlaceDetail } from "@/app/api/aero/place/route";
import type { RoutePoint } from "@/lib/aero/route";
import { icaoCoordinates } from "@/lib/aero/fpl";
import { ARGENTINA, MAP_LOCALE, MAP_STYLE, hasWebGL, loadMapLibre } from "@/components/flight-plan/map-loader";

// VA-191: ruta sobre el mapa. Tocar agrega un punto intermedio: el aeródromo o LAD si hay uno cerca, si no, la coordenada.
const NAVY = "#00205B";
const RED = "#D62828";

function routeData(points: RoutePoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      ...(points.length > 1 ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: points.map((p) => [p.lng, p.lat]) } }] : []),
      ...points.map((p) => ({ type: "Feature" as const, properties: { label: p.icao ?? (p.kind === "COORD" ? "" : p.code) }, geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] } })),
    ],
  };
}

export function RouteMap({ points, onAddWaypoint }: { points: RoutePoint[]; onAddWaypoint: (p: RoutePoint) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const addRef = useRef(onAddWaypoint);
  const pointsRef = useRef(points);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    addRef.current = onAddWaypoint;
    pointsRef.current = points;
  }, [onAddWaypoint, points]);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let map: MapLibreMap | null = null;
    let cancelled = false;
    (async () => {
      if (!hasWebGL()) return setFailed(true);
      try {
        const lib = await loadMapLibre();
        if (cancelled) return;
        map = new lib.Map({ container: el, style: MAP_STYLE, bounds: ARGENTINA, cooperativeGestures: true, locale: MAP_LOCALE, attributionControl: { compact: false } });
        mapRef.current = map;
        map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", async () => {
          if (!map || cancelled) return;
          const res = await fetch("/api/aero/map");
          const places = res.ok ? ((await res.json()) as GeoJSON.FeatureCollection) : { type: "FeatureCollection" as const, features: [] };
          if (cancelled || !map) return;
          map.addSource("places", { type: "geojson", data: places });
          map.addLayer({ id: "places", type: "circle", source: "places", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 1.5, 9, 5], "circle-color": "#fff", "circle-stroke-color": NAVY, "circle-stroke-width": 1 } });
          map.addSource("route", { type: "geojson", data: routeData(pointsRef.current) });
          map.addLayer({ id: "route-line", type: "line", source: "route", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": RED, "line-width": 2.5 } });
          map.addLayer({ id: "route-points", type: "circle", source: "route", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 6, "circle-color": RED, "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
          map.addLayer({ id: "route-labels", type: "symbol", source: "route", filter: ["==", ["geometry-type"], "Point"], layout: { "text-field": ["get", "label"], "text-size": 12, "text-offset": [0, -1.2], "text-anchor": "bottom" }, paint: { "text-color": NAVY, "text-halo-color": "#fff", "text-halo-width": 1.5 } });
          readyRef.current = true;
          map.on("click", async (e) => {
            const near = map!.queryRenderedFeatures(
              [
                [e.point.x - 12, e.point.y - 12],
                [e.point.x + 12, e.point.y + 12],
              ],
              { layers: ["places"] }
            )[0];
            if (near) {
              const res = await fetch(`/api/aero/place?source=${encodeURIComponent(String(near.properties.source))}&code=${encodeURIComponent(String(near.properties.code))}`);
              if (res.ok) {
                const p = (await res.json()) as AeroPlaceDetail;
                if (p.lat !== null && p.lng !== null) return addRef.current({ kind: p.kind, code: p.code, icao: p.icao, name: p.name.replace(/﻿/g, ""), province: p.province, lat: p.lat, lng: p.lng, elevationM: p.elevationM });
              }
            }
            const { lat, lng } = e.lngLat;
            const name = icaoCoordinates(lat, lng);
            addRef.current({ kind: "COORD", code: name, icao: null, name, lat, lng });
          });
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      readyRef.current = false;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource("route") as GeoJSONSource | undefined)?.setData(routeData(points));
    if (points.length > 1) {
      const lngs = points.map((p) => p.lng);
      const lats = points.map((p) => p.lat);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, maxZoom: 9, duration: 400 }
      );
    }
  }, [points]);

  if (failed) return <p className="text-sm text-slate-700">No se pudo mostrar el mapa en este dispositivo. Los puntos intermedios se agregan con el buscador.</p>;
  return (
    <div>
      <div ref={container} className="h-[42vh] min-h-72 w-full overflow-hidden rounded-lg border border-[#00205B]/15 bg-[#EEF5FC]" />
      <p className="mt-1 text-xs text-slate-500">Tocá el mapa para agregar un punto intermedio. Si tocás cerca de un aeródromo o LAD, se usa ese lugar. En el celular, movés el mapa con dos dedos.</p>
    </div>
  );
}
