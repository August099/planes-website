"use client";

import { useEffect, useRef, useState } from "react";
import type { AeroPlaceResult } from "@/app/api/aero/places/route";

// VA-191: buscador de aeródromos y LAD por código OACI, código local, nombre o localidad.
export function PlacePicker({ label, hint, onPick }: { label: string; hint?: string; onPick: (place: AeroPlaceResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AeroPlaceResult[] | null>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const search = (text: string) => {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/aero/places?q=${encodeURIComponent(text.trim())}`);
        if (!res.ok) throw new Error(String(res.status));
        setResults((await res.json()) as AeroPlaceResult[]);
        setFailed(false);
      } catch {
        setResults(null);
        setFailed(true);
      }
      setOpen(true);
    }, 250);
  };

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => search(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => results && setOpen(true)}
          placeholder="SACO, Córdoba, Coronel Bogado…"
          autoComplete="off"
          className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-[#00205B] placeholder:text-slate-400"
        />
      </label>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {open && (
        <ul className="absolute inset-x-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-[#00205B]/15 bg-white shadow-lg">
          {failed && <li className="px-3 py-2 text-sm text-red-800">No se pudo buscar. Probá de nuevo.</li>}
          {!failed && results?.length === 0 && <li className="px-3 py-2 text-sm text-slate-600">No encontramos ese lugar. Revisá el código o el nombre.</li>}
          {results?.map((p) => (
            <li key={`${p.kind}-${p.code}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(p);
                  setQuery(p.name);
                  setOpen(false);
                }}
                className="block min-h-11 w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-semibold text-[#00205B]">{p.name}</span>
                <span className="block text-xs text-slate-500">
                  {[p.icao, p.code, p.kind, p.province].filter(Boolean).join(" · ")}
                  {p.elevationM !== null ? ` · ${p.elevationM} m` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
