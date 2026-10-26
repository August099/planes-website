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
    hovered && hovered !== selected && `[data-province-map] [data-slug="${hovered}"]{fill:rgb(214 40 40 / 0.5)}`,
    selected && `[data-province-map] [data-slug="${selected}"]{fill:#D62828}`,
  ]
    .filter(Boolean)
    .join("");

  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      {css && <style>{css}</style>}

      <div
        data-province-map
        className="va-tile va-static h-[380px] sm:h-[460px] md:h-[600px] rounded-[28px] border border-[#00205B]/10 shadow-[0_14px_34px_-16px_rgb(0_32_91/0.22)] bg-white p-3"
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
            className="w-full rounded-2xl border border-[#00205B]/15 bg-white p-3 text-sm font-semibold text-[#00205B] shadow-sm"
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
        <ul className="va-tile va-static hidden md:grid grid-cols-2 gap-1 rounded-[28px] border border-[#00205B]/10 shadow-[0_14px_34px_-16px_rgb(0_32_91/0.22)] bg-white p-3">
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
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2 text-left text-sm transition-colors duration-150 motion-reduce:transition-none cursor-pointer ${
                    isSelected
                      ? "bg-[linear-gradient(135deg,#D62828_0%,#B71F1F_100%)] text-white shadow-sm"
                      : isHovered
                        ? "bg-[#EEF5FC] text-[#00205B]"
                        : total > 0
                          ? "text-[#00205B]"
                          : "text-slate-500"
                  }`}
                >
                  <span className="truncate font-semibold">{p.label}</span>
                  <span className={`shrink-0 text-xs tabular-nums ${isSelected ? "text-white" : ""}`}>
                    {plural(total, "aviso", "avisos")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Panel de la provincia elegida */}
        <div className="va-tile va-static relative rounded-[28px] border border-[#00205B]/10 shadow-[0_14px_34px_-16px_rgb(0_32_91/0.22)] bg-white p-5" aria-live="polite">
          {!current ? (
            <p className="text-sm text-slate-500">Tocá una provincia en el mapa para ver sus avisos</p>
          ) : current.aircraft + current.parts === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Todavía no hay avisos en <strong className="text-[#00205B]">{current.label}</strong>. ¿Tenés algo para vender?
              </p>
              <Link
                href="/publish"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#D62828] px-5 text-sm font-bold text-white hover:bg-[#B71F1F] transition-colors"
              >
                Publicar
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-heading text-lg font-extrabold tracking-[-0.02em] text-[#00205B]">
                {current.label}
                <span className="font-body text-sm font-medium normal-case tracking-normal text-slate-500">
                  {" · "}
                  {plural(current.aircraft, "aeronave", "aeronaves")}
                  {" · "}
                  {plural(current.parts, "repuesto", "repuestos")}
                </span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/aircraft?province=${current.slug}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#D62828] px-5 text-sm font-bold text-white hover:bg-[#B71F1F] transition-colors"
                >
                  Ver aeronaves
                </Link>
                <Link
                  href={`/spareparts?province=${current.slug}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[#00205B]/20 bg-white px-5 text-sm font-bold text-[#00205B] hover:bg-[#00205B] hover:text-white transition-colors"
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
