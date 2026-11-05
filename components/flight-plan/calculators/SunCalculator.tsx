"use client";

import { useState } from "react";
import { getTimes } from "suncalc";
import { PlacePicker } from "@/components/flight-plan/PlacePicker";
import { ResultPanel } from "./shared";

// Calculado en el navegador con suncalc. Crepúsculo civil: sol a 6° bajo el horizonte. Hora argentina.
const TIME_ZONE = "America/Argentina/Buenos_Aires";
const DAYS = 8;

const time = (d: Date | null) => (!d || Number.isNaN(d.getTime()) ? "No ocurre" : d.toLocaleTimeString("es-AR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }));
const day = (d: Date) => d.toLocaleDateString("es-AR", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "numeric" });

function until(target: Date | null, now: Date) {
  if (!target) return null;
  const minutes = Math.round((target.getTime() - now.getTime()) / 60000);
  return minutes <= 0 ? null : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

export function SunCalculator() {
  const [place, setPlace] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useLocation = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no permite usar la ubicación. Buscá un aeródromo.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlace({ name: "Tu ubicación", lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("No pudimos usar tu ubicación. Buscá un aeródromo.");
        setLocating(false);
      }
    );
  };

  const now = new Date();
  // Mediodía argentino de cada día: así el resultado no cambia de fecha según la hora en que se consulta.
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const todayNoon = new Date(`${todayKey}T12:00:00-03:00`).getTime();
  const days = place
    ? Array.from({ length: DAYS }, (_, i) => {
        const noon = new Date(todayNoon + i * 86400000);
        return { date: noon, times: getTimes(noon, place.lat, place.lng) };
      })
    : [];
  const today = days[0]?.times;
  const toSunset = today ? until(today.sunset, now) : null;

  return (
    <div className="grid items-start gap-6 md:grid-cols-2 md:gap-10">
      <section aria-label="Lugar" className="space-y-3">
        <PlacePicker label="Aeródromo o lugar" onPick={(p) => (p.lat !== null && p.lng !== null ? setPlace({ name: p.name, lat: p.lat, lng: p.lng }) : setError("Ese lugar no tiene coordenadas en el listado. Elegí otro."))} />
        <button type="button" onClick={useLocation} disabled={locating} className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-[#00205B]/25 bg-white px-4 text-sm font-bold text-[#00205B] hover:bg-slate-50 disabled:opacity-60">
          {locating ? "Buscando tu ubicación…" : "Usar mi ubicación"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        )}
      </section>
      <section aria-label="Resultado" className="space-y-4">
        <ResultPanel label={place ? `Puesta del sol hoy · ${place.name}` : "Puesta del sol hoy"} empty="Elegí un aeródromo o usá tu ubicación." headline={today ? time(today.sunset) : null}>
          {today && (
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-slate-600">Crepúsculo</dt>
                <dd className="font-semibold tabular-nums text-[#00205B]">{time(today.dawn)}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Salida</dt>
                <dd className="font-semibold tabular-nums text-[#00205B]">{time(today.sunrise)}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Fin crepúsculo</dt>
                <dd className="font-semibold tabular-nums text-[#00205B]">{time(today.dusk)}</dd>
              </div>
              {toSunset && <p className="col-span-3 text-sm font-medium text-[#00205B]">Faltan {toSunset} para la puesta.</p>}
            </dl>
          )}
        </ResultPanel>
        {days.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[#00205B]/12 bg-white">
            <table className="w-full text-sm">
              <caption className="sr-only">Próximos días, en hora argentina</caption>
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Día</th>
                  <th className="px-2 py-2 font-semibold">Crep.</th>
                  <th className="px-2 py-2 font-semibold">Salida</th>
                  <th className="px-2 py-2 font-semibold">Puesta</th>
                  <th className="px-2 py-2 font-semibold">Fin crep.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00205B]/8 tabular-nums text-[#00205B]">
                {days.slice(1).map((d) => (
                  <tr key={d.date.getTime()}>
                    <td className="px-3 py-2 font-medium">{day(d.date)}</td>
                    <td className="px-2 py-2">{time(d.times.dawn)}</td>
                    <td className="px-2 py-2">{time(d.times.sunrise)}</td>
                    <td className="px-2 py-2">{time(d.times.sunset)}</td>
                    <td className="px-2 py-2">{time(d.times.dusk)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-500">Hora argentina. Crepúsculo civil: el sol a 6° bajo el horizonte.</p>
      </section>
    </div>
  );
}
