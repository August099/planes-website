"use client";

import { X } from "lucide-react";
import type { RoutePoint } from "@/lib/aero/route";
import type { AeroPlaceResult } from "@/app/api/aero/places/route";
import { PlacePicker } from "@/components/flight-plan/PlacePicker";

// VA-191: campos del plan de vuelo. Misma estética que las calculadoras.
const LABEL = "mb-1 block text-xs font-semibold text-slate-600";
const INPUT = "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-[#00205B] placeholder:text-slate-400";

export function Field({ label, value, onChange, hint, placeholder, inputMode, type = "text", uppercase = false, missing = false, maxLength }: { label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string; inputMode?: "text" | "numeric" | "decimal"; type?: "text" | "date" | "time"; uppercase?: boolean; missing?: boolean; maxLength?: number }) {
  return (
    <label className="block min-w-0">
      <span className={LABEL}>
        {label}
        {missing && <span className="ml-1 font-bold text-[#D62828]">Falta</span>}
      </span>
      <input type={type} inputMode={inputMode} autoComplete="off" value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)} className={`${INPUT} ${missing ? "border-[#D62828]" : ""}`} />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Select<T extends string>({ label, value, onChange, options, missing = false, hint }: { label: string; value: T; onChange: (v: T) => void; options: readonly { value: T; label: string }[]; missing?: boolean; hint?: string }) {
  return (
    <label className="block min-w-0">
      <span className={LABEL}>
        {label}
        {missing && <span className="ml-1 font-bold text-[#D62828]">Falta</span>}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={`${INPUT} cursor-pointer ${missing ? "border-[#D62828]" : ""}`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/** Casillas en lenguaje simple. `exclusive` es el código que se marca solo: "N" (sin equipo) excluye al resto. */
export function CheckGroup({ legend, value, onChange, options, exclusive, missing = false }: { legend: string; value: string[]; onChange: (v: string[]) => void; options: readonly { code: string; label: string }[]; exclusive?: string; missing?: boolean }) {
  const toggle = (code: string) => {
    if (value.includes(code)) return onChange(value.filter((c) => c !== code));
    if (code === exclusive) return onChange([code]);
    // Conserva el orden de la lista: el código queda igual sin importar en qué orden se tildó.
    const next = [...value.filter((c) => c !== exclusive), code];
    onChange(options.map((o) => o.code).filter((c) => next.includes(c)));
  };
  return (
    <fieldset className="min-w-0">
      <legend className={LABEL}>
        {legend}
        {missing && <span className="ml-1 font-bold text-[#D62828]">Falta</span>}
      </legend>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.code} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[#00205B]">
            <input type="checkbox" checked={value.includes(o.code)} onChange={() => toggle(o.code)} className="h-5 w-5 shrink-0 cursor-pointer accent-[#00205B]" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export const toRoutePoint = (p: AeroPlaceResult): RoutePoint | null => (p.lat === null || p.lng === null ? null : { kind: p.kind, code: p.code, icao: p.icao, name: p.name.replace(/﻿/g, ""), province: p.province, lat: p.lat, lng: p.lng, elevationM: p.elevationM });

/** Lugar elegido con opción de cambiarlo, o el buscador si todavía no hay ninguno. */
export function PointField({ label, value, onChange, onError, missing = false }: { label: string; value: RoutePoint | null; onChange: (p: RoutePoint | null) => void; onError: (message: string) => void; missing?: boolean }) {
  if (value) {
    return (
      <div className="min-w-0">
        <span className={LABEL}>{label}</span>
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-[#00205B]/25 bg-white py-1 pl-3">
          <span className="min-w-0 text-sm font-semibold text-[#00205B]">
            <span className="tabular-nums">{value.icao ?? value.code}</span> <span className="font-normal text-slate-700">{value.name}</span>
          </span>
          <button type="button" onClick={() => onChange(null)} aria-label={`Quitar ${label.toLowerCase()}`} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#00205B] hover:bg-slate-100">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <PlacePicker
        label={missing ? `${label} (falta)` : label}
        onPick={(p) => {
          const point = toRoutePoint(p);
          if (point) onChange(point);
          else onError(`${p.name} no tiene coordenadas en el listado oficial: no se puede usar para calcular la ruta.`);
        }}
      />
    </div>
  );
}
