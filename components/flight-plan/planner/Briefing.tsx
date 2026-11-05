"use client";

import { useEffect, useMemo, useState } from "react";
import type { AeroPlaceDetail } from "@/app/api/aero/place/route";
import type { MapWeather } from "@/app/api/aero/map-weather/route";
import { NO_RECENT_DATA, WeatherDetails, useWeather } from "@/components/flight-plan/WeatherSummary";
import { LegList } from "@/components/flight-plan/planner/LegList";
import { describeChange, describeClouds, describeMiles, describeWeather, describeWind, tafBlocksAt } from "@/lib/aero/metar";
import { localToUtc, type PlanDraft } from "@/lib/aero/fpl";
import { draftLegs, routePoints } from "@/lib/aero/plan-schema";
import { planFuel, planWarnings } from "@/lib/aero/plan-summary";
import { bestRunway, crossedAreas, declinationAt, sunAtArrival, totalDistanceNm, type RoutePoint } from "@/lib/aero/route";

const AR = "America/Argentina/Buenos_Aires";
const clock = (d: Date | null) => (d ? d.toLocaleTimeString("es-AR", { timeZone: AR, hour: "2-digit", minute: "2-digit", hour12: false }) : "No ocurre");
const STATION = /^SA[A-Z0-9]{2}$/;

function usePlaceDetail(point: RoutePoint | null) {
  const key = point && point.kind !== "COORD" ? `${point.kind === "LAD" || point.kind === "LADH" ? "LAD" : "MADHEL"}/${point.code}` : null;
  const [state, setState] = useState<{ key: string; detail: AeroPlaceDetail } | null>(null);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const [source, code] = key.split("/");
    fetch(`/api/aero/place?source=${encodeURIComponent(source)}&code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? (r.json() as Promise<AeroPlaceDetail>) : null))
      .then((detail) => {
        if (!cancelled && detail) setState({ key, detail });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state?.key === key ? state.detail : null;
}

function AirportBrief({ label, point, detail, atSeconds }: { label: string; point: RoutePoint; detail: AeroPlaceDetail | null; atSeconds: number | null }) {
  const station = point.icao && STATION.test(point.icao) ? point.icao : null;
  const weather = useWeather(station);
  const metar = weather.data?.metar;
  const taf = weather.data?.taf;
  const blocks = taf && atSeconds !== null ? tafBlocksAt(taf, atSeconds) : [];
  const advice = useMemo(() => {
    if (!detail?.runways.length || !metar || typeof metar.wdir !== "number" || !metar.wspd) return null;
    return bestRunway(detail.runways, metar.wdir, metar.wspd, declinationAt(point.lat, point.lng, new Date()));
  }, [detail, metar, point]);

  return (
    <section className="border-t border-[#00205B]/15 pt-4">
      <h3 className="font-heading text-base font-bold text-[#00205B]">
        {label}: {point.icao ?? point.code} <span className="text-sm font-medium text-slate-600">{point.name}</span>
      </h3>
      <div className="mt-2 space-y-3 text-sm">
        {!station && <p className="text-slate-700">Sin código OACI argentino: este lugar no reporta METAR.</p>}
        {weather.loading && <p className="text-slate-600">Consultando el clima…</p>}
        {weather.failed && <p className="text-slate-700">{NO_RECENT_DATA}: el servicio no responde.</p>}
        {weather.data && <WeatherDetails data={weather.data} />}
        {taf && atSeconds !== null && (
          <div className="border-l-2 border-[#00205B]/30 pl-3">
            <p className="font-semibold text-[#00205B]">A la hora de tu vuelo, según el TAF</p>
            {blocks.length === 0 ? (
              <p className="text-slate-700">El TAF vigente no llega hasta esa hora. Volvé a consultarlo más cerca del vuelo.</p>
            ) : (
              blocks.map((f) => (
                <p key={`${f.timeFrom}-${f.fcstChange ?? "base"}`} className="text-slate-700">
                  {describeChange(f.fcstChange, f.probability)}: {[describeWind(f.wdir, f.wspd, f.wgst), f.visib != null && f.visib !== "" ? describeMiles(f.visib) : null, describeWeather(f.wxString), describeClouds(f.clouds)].filter(Boolean).join(" · ")}
                </p>
              ))
            )}
          </div>
        )}
        {advice && (
          <p className="text-[#00205B]">
            <span className="font-semibold">Pista {advice.runway}</span> según el viento del METAR: {Math.abs(advice.headwind).toFixed(0)} kt {advice.headwind >= 0 ? "de frente" : "de cola"}, {Math.abs(advice.crosswind).toFixed(0)} kt cruzado{advice.crossSide ? ` desde la ${advice.crossSide}` : ""}. Verificá la pista en uso.
          </p>
        )}
        {detail?.seeAip && <p className="text-slate-700">Pistas y frecuencias: consultá el AIP Parte AD.</p>}
        {detail && !detail.seeAip && detail.runways.length === 0 && <p className="text-slate-700">El listado oficial no informa pistas para este lugar.</p>}
      </div>
    </section>
  );
}

function SigmetCheck({ points }: { points: RoutePoint[] }) {
  const [state, setState] = useState<{ data: MapWeather | null; failed: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/aero/map-weather")
      .then((r) => (r.ok ? (r.json() as Promise<MapWeather>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => !cancelled && setState({ data, failed: false }))
      .catch(() => !cancelled && setState({ data: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, []);
  const crossed = useMemo(() => {
    if (!state?.data) return [];
    const areas = state.data.sigmets.features as GeoJSON.Feature<GeoJSON.Polygon>[];
    return crossedAreas(points, areas).map((i) => areas[i].properties as { label: string; fir: string; levels: string });
  }, [state, points]);
  if (!state) return <p className="text-sm text-slate-600">Revisando SIGMET…</p>;
  if (state.failed) return <p className="text-sm text-slate-700">No se pudieron revisar los SIGMET: el servicio no responde.</p>;
  if (!crossed.length) return <p className="text-sm text-slate-700">La ruta no cruza ningún SIGMET vigente en este momento, según la fuente.</p>;
  return (
    <ul className="space-y-1">
      {crossed.map((c, i) => (
        <li key={`${c.label}-${c.fir}-${i}`} className="border-l-2 border-[#D62828] pl-3 text-sm font-medium text-[#00205B]">
          La ruta cruza un SIGMET vigente: {c.label} · {c.fir} · {c.levels}
        </li>
      ))}
    </ul>
  );
}

export function Briefing({ draft }: { draft: PlanDraft }) {
  const { origin, destination, alternate } = draft.route;
  const originDetail = usePlaceDetail(origin);
  const destinationDetail = usePlaceDetail(destination);
  const alternateDetail = usePlaceDetail(alternate);
  const { legs, hours } = useMemo(() => draftLegs(draft), [draft]);
  const points = useMemo(() => routePoints(draft), [draft]);

  if (!origin || !destination) return <p className="text-sm text-slate-700">Para ver el briefing, cargá la salida y el destino en el paso Ruta.</p>;

  const departure = localToUtc(draft.flight.date, draft.flight.time);
  const arrival = departure && hours !== null ? new Date(departure.getTime() + hours * 3600_000) : null;
  const sun = arrival ? sunAtArrival(arrival, destination.lat, destination.lng) : null;
  const warnings = planWarnings(draft, hours, sun);
  const fuel = planFuel(draft, hours);
  const altLeg = alternate ? totalDistanceNm(draftLegs({ ...draft, route: { ...draft.route, origin: destination, destination: alternate, waypoints: [], winds: [] } }).legs) : null;

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <ul className="space-y-1">
          {warnings.map((w) => (
            <li key={w} className="border-l-2 border-[#D62828] pl-3 text-sm font-medium text-[#00205B]">
              {w}
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary className="min-h-11 cursor-pointer py-2 font-heading text-base font-bold text-[#00205B]">
          <span className="tabular-nums">
            Tramos ·{" "}{totalDistanceNm(legs).toFixed(0)} NM{hours !== null ? ` · ${Math.floor(Math.round(hours * 60) / 60)} h ${String(Math.round(hours * 60) % 60).padStart(2, "0")} min` : ""}
          </span>
          {altLeg !== null && <span className="block text-sm font-medium tabular-nums text-slate-600">Destino a alternativa: {altLeg.toFixed(0)} NM</span>}
        </summary>
        <LegList legs={legs} />
      </details>
      {legs.some((l) => l.wind.dir === null) && <p className="text-sm text-slate-700">Hay tramos sin viento cargado: sus tiempos y su combustible están calculados en aire calmo.</p>}
      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-heading text-base font-bold text-[#00205B]">Sol en el destino</h3>
          {sun && arrival ? (
            <p className="mt-1 text-sm tabular-nums text-slate-700">
              Llegada estimada {clock(arrival)}. Puesta del sol {clock(sun.sunset)}. Fin del crepúsculo civil {clock(sun.dusk)}.
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-700">Cargá la fecha, la hora y la velocidad para compararlo con tu llegada.</p>
          )}
        </div>
        <div>
          <h3 className="font-heading text-base font-bold text-[#00205B]">Combustible</h3>
          {fuel ? (
            <ul className="mt-1 text-sm tabular-nums text-slate-700">
              {fuel.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-700">Cargá la velocidad y el consumo para calcularlo. La reserva la definís vos.</p>
          )}
        </div>
      </section>
      <section>
        <h3 className="mb-1 font-heading text-base font-bold text-[#00205B]">SIGMET</h3>
        <SigmetCheck points={points} />
      </section>
      <section>
        <h3 className="mb-1 font-heading text-base font-bold text-[#00205B]">FIR y espacios aéreos</h3>
        {originDetail?.fir && destinationDetail?.fir && originDetail.fir !== destinationDetail.fir && (
          <p className="text-sm font-medium text-[#00205B]">
            Salís de la FIR {originDetail.fir} y llegás a la FIR {destinationDetail.fir}.
          </p>
        )}
        <p className="text-sm text-slate-700">Esta herramienta todavía no compara la ruta con los espacios aéreos: revisá CTR, zonas restringidas y prohibidas en las cartas y el AIP.</p>
      </section>
      <AirportBrief label="Salida" point={origin} detail={originDetail} atSeconds={departure ? departure.getTime() / 1000 : null} />
      <AirportBrief label="Destino" point={destination} detail={destinationDetail} atSeconds={arrival ? arrival.getTime() / 1000 : null} />
      {alternate && <AirportBrief label="Alternativa" point={alternate} detail={alternateDetail} atSeconds={arrival ? arrival.getTime() / 1000 : null} />}
      <p className="text-sm">
        <a href="https://ais.anac.gob.ar/notam" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-[#00205B] underline underline-offset-2 hover:text-[#D62828]">
          Consultar los NOTAM oficiales
        </a>
      </p>
    </div>
  );
}
