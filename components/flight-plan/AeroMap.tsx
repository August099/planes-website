"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import { PlacePicker } from "@/components/flight-plan/PlacePicker";
import { PlaceCard } from "@/components/flight-plan/PlaceCard";

// VA-191: mapa aeronáutico. MapLibre + OpenFreeMap, cargado solo acá desde public/vendor/ (como el mapa de los
// avisos, VA-156). Las capas se prenden y apagan; la forma de cada punto también las distingue, no solo el color.
// Sin WebGL, el buscador y la ficha siguen funcionando.
const STYLE = "https://tiles.openfreemap.org/styles/positron";
const VENDOR = `/vendor/maplibre-gl-${process.env.NEXT_PUBLIC_MAPLIBRE_VERSION}`;
const ARGENTINA: [[number, number], [number, number]] = [
  [-74, -55.5],
  [-53, -21.5],
];
const NAVY = "#00205B";
const RED = "#D62828";

const LAYERS = [
  { key: "ad", label: "Aeródromos", kinds: ["AD"], layers: ["aero-ad", "aero-ad-label"] },
  { key: "heli", label: "Helipuertos", kinds: ["HELIPORT"], layers: ["aero-heli", "aero-heli-label"] },
  { key: "lad", label: "LAD y LADH", kinds: ["LAD", "LADH"], layers: ["aero-lad", "aero-lad-label"] },
] as const;
type LayerKey = (typeof LAYERS)[number]["key"];

const SWATCH: Record<LayerKey, string> = {
  ad: "h-3.5 w-3.5 rounded-full bg-[#00205B]",
  heli: "h-3.5 w-3.5 rounded-full border-[3px] border-[#D62828] bg-white",
  lad: "h-2.5 w-2.5 rounded-full border-2 border-[#00205B] bg-white",
};

type Selected = { source: string; code: string };

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function AeroMap() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({ ad: true, heli: true, lad: true });
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "failed">("loading");

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let map: MapLibreMap | null = null;
    let cancelled = false;

    (async () => {
      if (!hasWebGL()) {
        setStatus("failed");
        return;
      }
      try {
        loadCss(`${VENDOR}/maplibre-gl.css`);
        const lib: typeof import("maplibre-gl") = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${VENDOR}/maplibre-gl.mjs`);
        if (cancelled) return;
        map = new lib.Map({ container: el, style: STYLE, bounds: ARGENTINA, cooperativeGestures: true, attributionControl: { compact: false } });
        mapRef.current = map;
        map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", async () => {
          if (!map || cancelled) return;
          const res = await fetch("/api/aero/map");
          if (!res.ok) throw new Error(String(res.status));
          const data = (await res.json()) as GeoJSON.FeatureCollection;
          if (cancelled || !map) return;
          map.addSource("aero", { type: "geojson", data });
          const label = (id: string, kinds: readonly string[], minzoom: number) =>
            map!.addLayer({
              id,
              type: "symbol",
              source: "aero",
              minzoom,
              filter: ["in", ["get", "kind"], ["literal", kinds]],
              layout: { "text-field": ["get", "label"], "text-size": 11, "text-offset": [0, 1], "text-anchor": "top", "text-optional": true },
              paint: { "text-color": NAVY, "text-halo-color": "#fff", "text-halo-width": 1.5 },
            });
          map.addLayer({ id: "aero-lad", type: "circle", source: "aero", filter: ["in", ["get", "kind"], ["literal", ["LAD", "LADH"]]], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2, 9, 5], "circle-color": "#fff", "circle-stroke-color": NAVY, "circle-stroke-width": 1.5 } });
          map.addLayer({ id: "aero-heli", type: "circle", source: "aero", filter: ["==", ["get", "kind"], "HELIPORT"], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2.5, 9, 6], "circle-color": "#fff", "circle-stroke-color": RED, "circle-stroke-width": 2 } });
          map.addLayer({ id: "aero-ad", type: "circle", source: "aero", filter: ["==", ["get", "kind"], "AD"], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 9, 7], "circle-color": NAVY, "circle-stroke-color": "#fff", "circle-stroke-width": 1 } });
          label("aero-lad-label", ["LAD", "LADH"], 8.5);
          label("aero-heli-label", ["HELIPORT"], 8);
          label("aero-ad-label", ["AD"], 6.5);

          // Área de toque más grande que el punto: en un celular, un círculo de 3 px no se puede tocar.
          const pick = (point: { x: number; y: number }): MapGeoJSONFeature | undefined =>
            map!
              .queryRenderedFeatures(
                [
                  [point.x - 12, point.y - 12],
                  [point.x + 12, point.y + 12],
                ],
                { layers: ["aero-ad", "aero-heli", "aero-lad"].filter((id) => map!.getLayoutProperty(id, "visibility") !== "none") }
              )
              .sort((a, b) => {
                const dist = (f: MapGeoJSONFeature) => {
                  const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
                  const p = map!.project([lng, lat]);
                  return (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
                };
                return dist(a) - dist(b);
              })[0];
          map.on("click", (e) => {
            const feature = pick(e.point);
            if (feature) setSelected({ source: String(feature.properties.source), code: String(feature.properties.code) });
          });
          map.on("mousemove", (e) => {
            map!.getCanvas().style.cursor = pick(e.point) ? "pointer" : "";
          });
          setStatus(data.features.length ? "ready" : "empty");
        });
        map.on("error", (e) => console.warn("[mapa] error de MapLibre:", e.error?.message ?? e));
      } catch (error) {
        console.warn("[mapa] no se pudo cargar:", error);
        if (!cancelled) setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  const toggle = (key: LayerKey) => {
    const next = !visible[key];
    setVisible((v) => ({ ...v, [key]: next }));
    const map = mapRef.current;
    const layer = LAYERS.find((l) => l.key === key)!;
    if (map?.getSource("aero")) for (const id of layer.layers) map.setLayoutProperty(id, "visibility", next ? "visible" : "none");
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-3">
        <div role="group" aria-label="Capas del mapa" className="flex flex-wrap gap-2">
          {LAYERS.map((l) => (
            <button
              key={l.key}
              type="button"
              aria-pressed={visible[l.key]}
              onClick={() => toggle(l.key)}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-[#00205B] transition-colors ${visible[l.key] ? "border-[#00205B]" : "border-[#00205B]/20 opacity-60"}`}
            >
              <span aria-hidden className={SWATCH[l.key]} />
              {l.label}
            </button>
          ))}
        </div>
        <div className="relative overflow-hidden rounded-lg border border-[#00205B]/15 bg-[#EEF5FC]">
          <div ref={container} className="h-[58vh] min-h-80 w-full" />
          {status !== "ready" && (
            <p className="absolute inset-x-3 top-3 rounded-md bg-white/95 px-3 py-2 text-sm text-[#00205B] shadow-sm" role="status">
              {status === "loading" && "Cargando el mapa…"}
              {status === "empty" && "Todavía no hay datos cargados en el mapa."}
              {status === "failed" && "No se pudo mostrar el mapa en este dispositivo. Podés buscar un lugar acá al lado."}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <PlacePicker
          label="Buscar aeródromo o LAD"
          onPick={(p) => {
            setSelected({ source: p.kind === "LAD" || p.kind === "LADH" ? "LAD" : "MADHEL", code: p.code });
            if (p.lat !== null && p.lng !== null) mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 10 });
          }}
        />
        {selected ? <PlaceCard source={selected.source} code={selected.code} onClose={() => setSelected(null)} /> : <p className="text-sm text-slate-600">Tocá un punto del mapa o buscá un lugar para ver su ficha.</p>}
      </div>
    </div>
  );
}
