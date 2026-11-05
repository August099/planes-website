"use client";

import { useEffect, useState } from "react";
import type { WeatherResponse } from "@/app/api/aero/weather/route";
import { FLIGHT_CATEGORY, describeChange, describeClouds, describeMiles, describeVisibility, describeWeather, describeWind, isRecentMetar, minutesAgo } from "@/lib/aero/metar";

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const clock = (seconds: number) => new Date(seconds * 1000).toLocaleString("es-AR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

export const NO_RECENT_DATA = "No hay datos recientes para esta estación";

/** Pide el clima de una estación. Un cambio de estación descarta el resultado anterior. */
export function useWeather(station: string | null) {
  const [state, setState] = useState<{ station: string; data: WeatherResponse | null; failed: boolean } | null>(null);
  useEffect(() => {
    if (!station) return;
    let cancelled = false;
    fetch(`/api/aero/weather?station=${encodeURIComponent(station)}`)
      .then((r) => (r.ok ? (r.json() as Promise<WeatherResponse>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => !cancelled && setState({ station, data, failed: false }))
      .catch(() => !cancelled && setState({ station, data: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [station]);
  const current = station && state?.station === station ? state : null;
  return { data: current?.data ?? null, failed: current?.failed ?? false, loading: !!station && !current };
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-slate-600">{label}</dt>
      <dd className="text-right font-medium tabular-nums text-[#00205B]">{value}</dd>
    </div>
  );
}

export function WeatherDetails({ data, showTaf = true }: { data: WeatherResponse; showTaf?: boolean }) {
  const { metar, taf } = data;
  const recent = metar ? isRecentMetar(metar.obsTime) : false;
  const category = metar?.fltCat ? FLIGHT_CATEGORY[metar.fltCat] : null;
  const weather = describeWeather(metar?.wxString);
  return (
    <div className="space-y-3">
      {!metar || !recent ? (
        <p className="text-sm text-slate-700">{NO_RECENT_DATA}{metar ? ` (último METAR: ${clock(metar.obsTime)})` : ""}.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {category ? (
              <p className="text-sm font-bold text-[#00205B]">
                {category.label} <span className="font-normal text-slate-700">· {category.meaning}</span>
              </p>
            ) : (
              <span />
            )}
            <p className="text-xs tabular-nums text-slate-500">
              {clock(metar.obsTime)}, hace {minutesAgo(metar.obsTime)} min
            </p>
          </div>
          <dl className="divide-y divide-[#00205B]/8 text-sm">
            <Fact label="Viento" value={describeWind(metar.wdir, metar.wspd, metar.wgst)} />
            <Fact label="Visibilidad" value={describeVisibility(metar.rawOb, metar.visib)} />
            {weather && <Fact label="Tiempo presente" value={weather} />}
            <Fact label="Nubes" value={describeClouds(metar.clouds, metar.cover)} />
            {typeof metar.temp === "number" && <Fact label="Temperatura / rocío" value={`${metar.temp} °C / ${metar.dewp ?? "sin dato"} °C`} />}
            {typeof metar.altim === "number" && <Fact label="QNH" value={`${Math.round(metar.altim)} hPa`} />}
          </dl>
          <details className="text-xs">
            <summary className="min-h-8 cursor-pointer font-semibold text-[#00205B]">METAR original</summary>
            <p className="mt-1 break-words font-mono text-slate-700">{metar.rawOb}</p>
          </details>
        </>
      )}
      {showTaf && taf && (
        <details className="text-sm">
          <summary className="min-h-8 cursor-pointer font-semibold text-[#00205B]">Pronóstico (TAF)</summary>
          <ul className="mt-2 space-y-3">
            {(taf.fcsts ?? []).map((f) => {
              const wx = describeWeather(f.wxString);
              return (
                <li key={`${f.timeFrom}-${f.fcstChange ?? "base"}-${f.probability ?? ""}`} className="border-l-2 border-[#00205B]/20 pl-3">
                  <p className="text-xs font-semibold tabular-nums text-[#00205B]">
                    {describeChange(f.fcstChange, f.probability)} · {clock(f.timeFrom)} a {clock(f.timeTo)}
                  </p>
                  <p className="mt-0.5 text-slate-700">{[describeWind(f.wdir, f.wspd, f.wgst), f.visib != null && f.visib !== "" ? describeMiles(f.visib) : null, wx, describeClouds(f.clouds)].filter(Boolean).join(" · ")}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 break-words font-mono text-xs text-slate-700">{taf.rawTAF}</p>
        </details>
      )}
      <p className="text-xs text-slate-500">Hora argentina. Fuente: aviationweather.gov (NOAA). La categoría es orientativa, según el criterio de la fuente.</p>
    </div>
  );
}
