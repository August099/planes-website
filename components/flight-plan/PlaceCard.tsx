"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getTimes } from "suncalc";
import type { AeroPlaceDetail } from "@/app/api/aero/place/route";
import { formatCoordinate, M_PER_FT } from "@/lib/aero/formulas";
import { NO_RECENT_DATA, WeatherDetails, useWeather } from "@/components/flight-plan/WeatherSummary";

// VA-191: ficha de un aeródromo o LAD. Lo que la fuente no trae se dice o no se muestra; nunca se completa.
const TIME_ZONE = "America/Argentina/Buenos_Aires";
const KIND_LABEL = { AD: "Aeródromo", HELIPORT: "Helipuerto", LAD: "Lugar apto denunciado", LADH: "Lugar apto denunciado para helicópteros" };
const time = (d: Date | null) => (d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString("es-AR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }) : "No ocurre");

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-slate-600">{label}</dt>
      <dd className="text-right font-medium tabular-nums text-[#00205B]">{value}</dd>
    </div>
  );
}

export function PlaceCard({ source, code, onClose }: { source: string; code: string; onClose: () => void }) {
  const [state, setState] = useState<{ key: string; place: AeroPlaceDetail | null; failed: boolean } | null>(null);
  const key = `${source}/${code}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/aero/place?source=${encodeURIComponent(source)}&code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? (r.json() as Promise<AeroPlaceDetail>) : Promise.reject(new Error(String(r.status)))))
      .then((place) => !cancelled && setState({ key, place, failed: false }))
      .catch(() => !cancelled && setState({ key, place: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [source, code, key]);

  const current = state?.key === key ? state : null;
  const p = current?.place;
  const weather = useWeather(p?.icao ?? null);
  const now = new Date();
  const noon = new Date(`${now.toLocaleDateString("en-CA", { timeZone: TIME_ZONE })}T12:00:00-03:00`);
  const sun = p && p.lat !== null && p.lng !== null ? getTimes(noon, p.lat, p.lng) : null;

  return (
    <section aria-label="Ficha del lugar" aria-live="polite" className="rounded-lg border border-[#00205B]/15 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {p && <p className="text-xs font-semibold text-slate-500">{KIND_LABEL[p.kind]}</p>}
          <h2 className="font-heading text-lg font-bold leading-snug text-[#00205B]">{p?.name ?? (current?.failed ? "No se pudo cargar" : "Cargando…")}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar la ficha" className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#00205B] hover:bg-slate-100">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {current?.failed && <p className="mt-2 text-sm text-slate-700">Probá de nuevo en un momento.</p>}
      {p && (
        <>
          <dl className="mt-3 divide-y divide-[#00205B]/8 text-sm">
            <Row label="Código" value={[p.icao, p.iata, p.source === "LAD" ? `Registro ${p.code}` : p.code].filter(Boolean).join(" · ")} />
            {p.fir && <Row label="FIR" value={p.fir} />}
            {p.province && <Row label="Provincia" value={p.province} />}
            {p.location && <Row label="Ubicación" value={<span className="font-normal">{p.location}</span>} />}
            <Row label="Coordenadas" value={p.lat !== null && p.lng !== null ? `${formatCoordinate(p.lat, "lat")} ${formatCoordinate(p.lng, "lng")}` : "No figuran en el listado"} />
            <Row label="Elevación" value={p.elevationM !== null ? `${p.elevationM} m · ${Math.round(p.elevationM / M_PER_FT)} ft` : "No figura"} />
            {p.condition && <Row label="Condición" value={p.condition} />}
            {sun && <Row label="Sol hoy" value={`${time(sun.sunrise)} a ${time(sun.sunset)}`} />}
            {sun && <Row label="Fin del crepúsculo" value={time(sun.dusk)} />}
          </dl>
          {p.runways.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-bold text-[#00205B]">{p.kind === "HELIPORT" || p.kind === "LADH" ? "Área de aterrizaje" : "Pistas"}</h3>
              <ul className="mt-1 space-y-0.5 text-sm tabular-nums text-slate-700">
                {p.runways.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {p.frequencies.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-bold text-[#00205B]">Servicios y frecuencias</h3>
              <ul className="mt-1 space-y-0.5 text-sm tabular-nums text-slate-700">
                {p.frequencies.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          {p.seeAip && <p className="mt-3 border-l-2 border-[#D62828] pl-3 text-sm text-[#00205B]">Pistas y frecuencias: consultá el AIP Parte AD, como indica el MADHEL.</p>}
          <div className="mt-4 border-t border-[#00205B]/10 pt-3">
            <h3 className="mb-1 text-sm font-bold text-[#00205B]">Clima</h3>
            {!p.icao && <p className="text-sm text-slate-700">Sin código OACI: este lugar no reporta METAR.</p>}
            {weather.loading && <p className="text-sm text-slate-600">Consultando el clima…</p>}
            {weather.failed && <p className="text-sm text-slate-700">{NO_RECENT_DATA}: el servicio no responde.</p>}
            {weather.data && <WeatherDetails data={weather.data} />}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[#00205B]">
            <li>
              <a href="https://ais.anac.gob.ar/notam" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-[#D62828]">
                NOTAM oficiales
              </a>
            </li>
            {p.source === "MADHEL" && (
              <li>
                <a href="https://ais.anac.gob.ar/madhel/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-[#D62828]">
                  MADHEL
                </a>
              </li>
            )}
            {p.seeAip && (
              <li>
                <a href="https://ais.anac.gob.ar/aip" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-[#D62828]">
                  AIP
                </a>
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
