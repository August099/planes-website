"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type { WeatherResponse } from "@/app/api/aero/weather/route";
import { PlacePicker } from "@/components/flight-plan/PlacePicker";
import { NO_RECENT_DATA, WeatherDetails, useWeather } from "@/components/flight-plan/WeatherSummary";

const FAVORITES_KEY = "va_weather_favorites";

function readFavorites(): { icao: string; name: string }[] {
  try {
    const list = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function WeatherCalculator() {
  const [station, setStation] = useState<{ icao: string; name: string } | null>(null);
  const [nearest, setNearest] = useState<WeatherResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [favorites, setFavorites] = useState(readFavorites);
  const { data, failed, loading } = useWeather(station?.icao ?? null);
  const shown = station ? data : nearest;

  const toggleFavorite = () => {
    if (!station) return;
    const next = favorites.some((f) => f.icao === station.icao) ? favorites.filter((f) => f.icao !== station.icao) : [...favorites, station];
    setFavorites(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento, los favoritos duran hasta salir de la página.
    }
  };

  const findNearest = () => {
    if (!navigator.geolocation) {
      setNotice("Tu navegador no permite usar la ubicación. Buscá un aeródromo.");
      return;
    }
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/aero/weather?lat=${pos.coords.latitude.toFixed(3)}&lng=${pos.coords.longitude.toFixed(3)}`);
          if (!res.ok) throw new Error(String(res.status));
          const found = (await res.json()) as WeatherResponse;
          setStation(null);
          setNearest(found);
          setNotice(`Estación más cercana con datos: ${found.station}, a ${found.distanceKm} km.`);
        } catch {
          setNotice("No encontramos una estación cercana con datos recientes. Buscá un aeródromo.");
        }
        setLocating(false);
      },
      () => {
        setNotice("No pudimos usar tu ubicación. Buscá un aeródromo.");
        setLocating(false);
      }
    );
  };

  return (
    <div className="grid items-start gap-6 md:grid-cols-2 md:gap-10">
      <section aria-label="Estación" className="space-y-3">
        <PlacePicker
          label="Aeródromo"
          onPick={(p) => {
            setNearest(null);
            if (p.icao) {
              setStation({ icao: p.icao, name: p.name });
              setNotice(null);
            } else {
              setStation(null);
              setNotice(`${p.name} no tiene código OACI: no reporta METAR.`);
            }
          }}
        />
        <button type="button" onClick={findNearest} disabled={locating} className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-[#00205B]/25 bg-white px-4 text-sm font-bold text-[#00205B] hover:bg-slate-50 disabled:opacity-60">
          {locating ? "Buscando tu ubicación…" : "Ver el más cercano a mí"}
        </button>
        {notice && (
          <p role="status" className="text-sm text-slate-700">
            {notice}
          </p>
        )}
        {favorites.length > 0 && (
          <div>
            <h2 className="va-label mb-1">Favoritos</h2>
            <ul className="flex flex-wrap gap-2">
              {favorites.map((f) => (
                <li key={f.icao}>
                  <button
                    type="button"
                    onClick={() => {
                      setNearest(null);
                      setNotice(null);
                      setStation(f);
                    }}
                    className="min-h-11 cursor-pointer rounded-md border border-[#00205B]/20 bg-white px-3 text-sm font-semibold text-[#00205B] hover:bg-slate-50"
                    title={f.name}
                  >
                    {f.icao}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section aria-label="Clima" aria-live="polite" className="rounded-lg border border-[#00205B]/15 bg-white p-4 shadow-sm">
        {station || nearest ? (
          <>
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="font-heading text-lg font-bold leading-snug text-[#00205B]">
                {shown?.station ?? station?.icao}
                {station && <span className="block text-sm font-medium text-slate-600">{station.name}</span>}
              </h2>
              {station && (
                <button type="button" onClick={toggleFavorite} aria-pressed={favorites.some((f) => f.icao === station.icao)} aria-label="Guardar en favoritos" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#00205B] hover:bg-slate-100">
                  <Star className={`h-5 w-5 ${favorites.some((f) => f.icao === station.icao) ? "fill-[#00205B]" : ""}`} aria-hidden />
                </button>
              )}
            </div>
            {loading && <p className="text-sm text-slate-600">Consultando el clima…</p>}
            {failed && <p className="text-sm text-slate-700">{NO_RECENT_DATA}: el servicio no responde. Probá de nuevo en unos minutos.</p>}
            {shown && <WeatherDetails data={shown} />}
          </>
        ) : (
          <p className="text-sm text-slate-600">Elegí un aeródromo o buscá el más cercano. La ubicación se pide solo si tocás el botón.</p>
        )}
      </section>
    </div>
  );
}
