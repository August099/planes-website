"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import { PlacePicker } from "@/components/flight-plan/PlacePicker";
import { PlaceCard } from "@/components/flight-plan/PlaceCard";
import type { MapWeather, SigmetSummary } from "@/app/api/aero/map-weather/route";
import { FLIGHT_CATEGORY } from "@/lib/aero/metar";
import { ARGENTINA, MAP_LOCALE, MAP_STYLE, hasWebGL, loadMapLibre } from "@/components/flight-plan/map-loader";

// VA-191: mapa aeronáutico. MapLibre + OpenFreeMap, cargado solo acá desde public/vendor/ (como el mapa de los
// avisos, VA-156). Las capas se prenden y apagan; la forma de cada punto también las distingue, no solo el color.
// Sin WebGL, el buscador y la ficha siguen funcionando.
const NAVY = "#00205B";
const RED = "#D62828";

const LAYERS = [
  { key: "ad", label: "Aeródromos", kinds: ["AD"], layers: ["aero-ad", "aero-ad-label"] },
  { key: "heli", label: "Helipuertos", kinds: ["HELIPORT"], layers: ["aero-heli", "aero-heli-label"] },
  { key: "lad", label: "LAD y LADH", kinds: ["LAD", "LADH"], layers: ["aero-lad", "aero-lad-label"] },
] as const;
type LayerKey = (typeof LAYERS)[number]["key"];
type WeatherKey = "metar" | "sigmet";

// Colores habituales de categoría de vuelo. En el mapa cada punto lleva también el texto: nunca solo el color.
const CATEGORY_COLOR: Record<string, string> = { VFR: "#15803D", MVFR: "#1D4ED8", IFR: "#D62828", LIFR: "#7E22CE" };
const WEATHER_LAYERS: Record<WeatherKey, string[]> = { metar: ["aero-metar", "aero-metar-label"], sigmet: ["aero-sigmet", "aero-sigmet-line", "aero-sigmet-label"] };
const clock = (seconds: number) => new Date(seconds * 1000).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

const SWATCH: Record<LayerKey, string> = {
  ad: "h-3.5 w-3.5 rounded-full bg-[#00205B]",
  heli: "h-3.5 w-3.5 rounded-full border-[3px] border-[#D62828] bg-white",
  lad: "h-2.5 w-2.5 rounded-full border-2 border-[#00205B] bg-white",
};

type Selected = { source: string; code: string };

export function AeroMap() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({ ad: true, heli: true, lad: true });
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "failed">("loading");
  const [weatherOn, setWeatherOn] = useState<Record<WeatherKey, boolean>>({ metar: false, sigmet: false });
  const [weatherState, setWeatherState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [sigmetList, setSigmetList] = useState<SigmetSummary[]>([]);
  const [metarCount, setMetarCount] = useState(0);

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
        const lib = await loadMapLibre();
        if (cancelled) return;
        map = new lib.Map({ container: el, style: MAP_STYLE, bounds: ARGENTINA, cooperativeGestures: true, locale: MAP_LOCALE, attributionControl: { compact: false } });
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
                { layers: ["aero-metar", "aero-ad", "aero-heli", "aero-lad"].filter((id) => map!.getLayer(id) && map!.getLayoutProperty(id, "visibility") !== "none") }
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

  // En el celular la ficha queda debajo del mapa: se lleva a la vista para que se note que se abrió.
  useEffect(() => {
    if (!selected || !window.matchMedia("(max-width: 1023px)").matches) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cardRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  }, [selected]);

  const toggle = (key: LayerKey) => {
    const next = !visible[key];
    setVisible((v) => ({ ...v, [key]: next }));
    const map = mapRef.current;
    const layer = LAYERS.find((l) => l.key === key)!;
    if (map?.getSource("aero")) for (const id of layer.layers) map.setLayoutProperty(id, "visibility", next ? "visible" : "none");
  };

  // Las capas de clima se piden recién al prenderlas por primera vez.
  const addWeatherLayers = (map: MapLibreMap, data: MapWeather) => {
    map.addSource("aero-sigmets", { type: "geojson", data: data.sigmets });
    map.addLayer({ id: "aero-sigmet", type: "fill", source: "aero-sigmets", layout: { visibility: "none" }, paint: { "fill-color": RED, "fill-opacity": 0.12 } });
    map.addLayer({ id: "aero-sigmet-line", type: "line", source: "aero-sigmets", layout: { visibility: "none" }, paint: { "line-color": RED, "line-width": 1.5, "line-dasharray": [2, 1.5] } });
    map.addLayer({ id: "aero-sigmet-label", type: "symbol", source: "aero-sigmets", layout: { visibility: "none", "text-field": ["get", "label"], "text-size": 11 }, paint: { "text-color": RED, "text-halo-color": "#fff", "text-halo-width": 1.5 } });
    map.addSource("aero-metars", { type: "geojson", data: data.metars });
    const color: unknown[] = ["match", ["get", "category"]];
    for (const [category, value] of Object.entries(CATEGORY_COLOR)) color.push(category, value);
    color.push(NAVY);
    map.addLayer({ id: "aero-metar", type: "circle", source: "aero-metars", layout: { visibility: "none" }, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 9, 9], "circle-color": color as never, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
    map.addLayer({ id: "aero-metar-label", type: "symbol", source: "aero-metars", minzoom: 4.5, layout: { visibility: "none", "text-field": ["get", "label"], "text-size": 11, "text-offset": [0, -1.1], "text-anchor": "bottom" }, paint: { "text-color": NAVY, "text-halo-color": "#fff", "text-halo-width": 1.5 } });
  };

  const toggleWeather = async (key: WeatherKey) => {
    const next = !weatherOn[key];
    setWeatherOn((v) => ({ ...v, [key]: next }));
    const map = mapRef.current;
    if (next && weatherState !== "ready") {
      setWeatherState("loading");
      try {
        const res = await fetch("/api/aero/map-weather");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as MapWeather;
        setSigmetList(data.sigmetList);
        setMetarCount(data.metars.features.length);
        if (map && !map.getSource("aero-metars")) addWeatherLayers(map, data);
        setWeatherState("ready");
      } catch {
        setWeatherState("failed");
        setWeatherOn((v) => ({ ...v, [key]: false }));
        return;
      }
    }
    if (map?.getSource("aero-metars")) for (const id of WEATHER_LAYERS[key]) map.setLayoutProperty(id, "visibility", next ? "visible" : "none");
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="lg:col-start-2 lg:row-start-1">
        <PlacePicker
          label="Buscar aeródromo o LAD"
          onPick={(p) => {
            setSelected({ source: p.kind === "LAD" || p.kind === "LADH" ? "LAD" : "MADHEL", code: p.code });
            if (p.lat !== null && p.lng !== null) mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 10 });
          }}
        />
      </div>
      <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-span-2 lg:row-start-1">
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
          <button type="button" aria-pressed={weatherOn.metar} onClick={() => toggleWeather("metar")} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-[#00205B] transition-colors ${weatherOn.metar ? "border-[#00205B]" : "border-[#00205B]/20 opacity-60"}`}>
            <span aria-hidden className="h-3.5 w-3.5 rounded-full bg-[#15803D]" />
            METAR
          </button>
          <button type="button" aria-pressed={weatherOn.sigmet} onClick={() => toggleWeather("sigmet")} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-[#00205B] transition-colors ${weatherOn.sigmet ? "border-[#00205B]" : "border-[#00205B]/20 opacity-60"}`}>
            <span aria-hidden className="h-3.5 w-3.5 border-2 border-dashed border-[#D62828] bg-[#D62828]/10" />
            SIGMET
          </button>
        </div>
        {weatherState === "loading" && <p role="status" className="text-sm text-slate-600">Consultando el clima…</p>}
        {weatherState === "failed" && <p role="status" className="text-sm text-slate-700">El servicio meteorológico no responde. Probá de nuevo en unos minutos.</p>}
        {weatherOn.metar && weatherState === "ready" && (
          <ul aria-label="Categorías de vuelo" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
            {Object.entries(FLIGHT_CATEGORY).map(([key, c]) => (
              <li key={key} className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[key] }} />
                <span className="font-semibold">{c.label}</span> {c.meaning}
              </li>
            ))}
            <li className="tabular-nums text-slate-500">{metarCount} estaciones con datos recientes. Criterio de la fuente, orientativo.</li>
          </ul>
        )}
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
        {weatherOn.sigmet && weatherState === "ready" && (
          <section aria-labelledby="sigmet-title">
            <h2 id="sigmet-title" className="text-sm font-bold text-[#00205B]">SIGMET vigentes en la región</h2>
            {sigmetList.length === 0 ? (
              <p className="mt-1 text-sm text-slate-700">La fuente no informa SIGMET vigentes para Argentina y alrededores.</p>
            ) : (
              <ul className="mt-1 divide-y divide-[#00205B]/10 text-sm">
                {sigmetList.map((s) => (
                  <li key={s.id} className="py-2">
                    <p className="font-semibold text-[#00205B]">{s.hazard} <span className="font-normal text-slate-700">· {s.fir} · {s.levels}</span></p>
                    <p className="text-xs tabular-nums text-slate-600">Vigente de {clock(s.from)} a {clock(s.to)}, hora argentina</p>
                    <details className="mt-1 text-xs">
                      <summary className="min-h-8 cursor-pointer font-semibold text-[#00205B]">Texto original</summary>
                      <p className="whitespace-pre-wrap break-words font-mono text-slate-700">{s.raw}</p>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
      <div ref={cardRef} className="scroll-mt-20 lg:col-start-2 lg:row-start-2">
        {selected ? <PlaceCard source={selected.source} code={selected.code} onClose={() => setSelected(null)} /> : <p className="text-sm text-slate-600">Tocá un punto del mapa o buscá un lugar para ver su ficha.</p>}
      </div>
    </div>
  );
}
