"use client";

import Link from "next/link";
import { useState } from "react";

// Parte interactiva de "Explorá por provincia" (VA-77): solo el estado de hover y selección.
// El mapa llega armado desde el servidor; acá se escuchan sus eventos por delegación (data-slug)
// y se pintan la provincia resaltada y la elegida con una regla CSS.
export type ProvinceCount = { slug: string; name: string; label: string; aircraft: number; parts: number };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const slugFrom = (target: EventTarget | null) =>
  target instanceof Element ? target.closest("[data-slug]")?.getAttribute("data-slug") ?? null : null;

export function ProvinceExplorerClient({ provinces, map }: { provinces: ProvinceCount[]; map: React.ReactNode }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const current = provinces.find((p) => p.slug === selected) ?? null;

  const mapHandlers = {
    onClick: (e: React.MouseEvent) => {
      const slug = slugFrom(e.target);
      if (slug) setSelected(slug);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      const slug = slugFrom(e.target);
      if (slug && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        setSelected(slug);
      }
    },
    onPointerOver: (e: React.PointerEvent) => setHovered(slugFrom(e.target)),
    onPointerLeave: () => setHovered(null),
    onFocus: (e: React.FocusEvent) => setHovered(slugFrom(e.target)),
    onBlur: () => setHovered(null),
  };

  // Resaltado (rojo suave) y seleccionada (rojo lleno). Más específico que las clases base del path.
  const css = [
    hovered && hovered !== selected && `[data-province-map] [data-slug="${hovered}"]{fill:rgb(231 15 31 / 0.45)}`,
    selected && `[data-province-map] [data-slug="${selected}"]{fill:#E70F1F}`,
  ]
    .filter(Boolean)
    .join("");

  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      {css && <style>{css}</style>}

      <div
        data-province-map
        className="home-card h-[380px] sm:h-[460px] md:h-[600px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
        {...mapHandlers}
      >
        {map}
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        {/* Celular: select nativo */}
        <label className="md:hidden">
          <span className="sr-only">Elegí una provincia</span>
          <select
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value || null)}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-[#001F58]"
          >
            <option value="">Elegí una provincia</option>
            {provinces.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label} ({p.aircraft + p.parts})
              </option>
            ))}
          </select>
        </label>

        {/* Desktop: lista de las 24, sincronizada con el mapa */}
        <ul className="home-card hidden md:grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {provinces.map((p) => {
            const total = p.aircraft + p.parts;
            const isSelected = p.slug === selected;
            const isHovered = p.slug === hovered;
            return (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => setSelected(p.slug)}
                  onPointerEnter={() => setHovered(p.slug)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(p.slug)}
                  onBlur={() => setHovered(null)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors duration-150 motion-reduce:transition-none cursor-pointer ${
                    isSelected
                      ? "bg-[#E70F1F] text-white"
                      : isHovered
                        ? "bg-[#E70F1F]/10 text-[#001F58]"
                        : total > 0
                          ? "text-[#001F58] hover:bg-slate-50"
                          : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate font-medium">{p.label}</span>
                  <span className={`shrink-0 text-xs ${isSelected ? "text-white/90" : ""}`}>
                    {plural(total, "aviso", "avisos")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Panel de la provincia elegida */}
        <div className="home-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-live="polite">
          {!current ? (
            <p className="text-sm text-slate-500">Tocá una provincia en el mapa para ver sus avisos</p>
          ) : current.aircraft + current.parts === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Todavía no hay avisos en <strong className="text-[#001F58]">{current.label}</strong>. ¿Tenés algo para vender?
              </p>
              <Link
                href="/publish"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#E70F1F] px-5 text-sm font-bold text-white hover:bg-[#c5121b] transition-colors"
              >
                Publicar
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-base font-bold text-[#001F58]">
                {current.label}
                <span className="font-medium text-slate-500">
                  {" · "}
                  {plural(current.aircraft, "aeronave", "aeronaves")}
                  {" · "}
                  {plural(current.parts, "repuesto", "repuestos")}
                </span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/planes?province=${current.slug}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#E70F1F] px-5 text-sm font-bold text-white hover:bg-[#c5121b] transition-colors"
                >
                  Ver aeronaves
                </Link>
                <Link
                  href={`/spareparts?province=${current.slug}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[#001F58]/20 bg-white px-5 text-sm font-bold text-[#001F58] hover:bg-slate-50 transition-colors"
                >
                  Ver repuestos
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
