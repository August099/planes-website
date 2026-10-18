"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, X } from "lucide-react";
import { AppImage } from "@/components/ui/AppImage";
import { COMPARE_MAX, clearCompare, compareUrl, removeFromCompare, useCompareItems } from "@/lib/compare-store";

// VA-83: bandeja fija abajo con las aeronaves elegidas. Aparece con la primera. En escritorio
// muestra las miniaturas; en celular, una barra compacta "n de 3 · Comparar" con las miniaturas
// en un desplegable. No se muestra en la propia página de comparación ni en el admin.
export function CompareTray() {
  const items = useCompareItems();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onFull = () => {
      setNotice(true);
      clearTimeout(timer);
      timer = setTimeout(() => setNotice(false), 4000);
    };
    window.addEventListener("va-compare-full", onFull);
    return () => {
      window.removeEventListener("va-compare-full", onFull);
      clearTimeout(timer);
    };
  }, []);

  if (items.length === 0 || pathname.startsWith("/aircraft/compare") || pathname.startsWith("/admin")) return null;

  const ready = items.length >= 2;
  const href = compareUrl(items.map((i) => i.id));
  const cta = (
    <Link
      href={ready ? href : "#"}
      aria-disabled={!ready}
      onClick={(e) => !ready && e.preventDefault()}
      className={`inline-flex min-h-10 shrink-0 items-center rounded-md px-4 text-xs font-bold ${
        ready ? "bg-[#E70F1F] text-white hover:bg-[#C20D1A]" : "cursor-not-allowed bg-white/15 text-white/60"
      }`}
    >
      Comparar ({items.length})
    </Link>
  );

  // VA-109: cerrar el comparador de una (vacía la selección; se vuelve a armar desde las tarjetas).
  const close = (
    <button
      type="button"
      onClick={clearCompare}
      aria-label="Cerrar comparador"
      title="Cerrar comparador"
      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
    >
      <X className="h-5 w-5" />
    </button>
  );

  const thumbs = (
    <ul className="flex flex-col gap-2 sm:flex-row sm:gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex min-w-0 items-center gap-2 rounded-md bg-white/10 p-1.5 pr-2 sm:w-52">
          <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded-sm bg-white/10">
            {item.image && <AppImage src={item.image} alt="" fill sizes="48px" className="object-cover" />}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">{item.title}</span>
          <button
            type="button"
            onClick={() => removeFromCompare(item.id)}
            aria-label={`Quitar ${item.title}`}
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </li>
      ))}
      {Array.from({ length: COMPARE_MAX - items.length }).map((_, i) => (
        <li key={`empty-${i}`} className="hidden h-12 rounded-md border border-dashed border-white/25 sm:block sm:w-52" aria-hidden />
      ))}
    </ul>
  );

  return (
    <>
    {/* Espacio para que la bandeja no tape el final de la página */}
    <div aria-hidden className="h-16 sm:h-[76px] print:hidden" />
    <div role="region" aria-label="Comparación de aeronaves" className="fixed inset-x-0 bottom-[var(--va-consent-h,0px)] z-40 border-t border-white/10 bg-[#001331] text-white shadow-[0_-4px_16px_rgba(0,0,0,0.25)] print:hidden">
      {notice && (
        <p role="status" className="border-b border-white/10 bg-[#E70F1F] px-4 py-2 text-center text-xs font-semibold">
          Podés comparar hasta 3. Quitá una para agregar otra.
        </p>
      )}
      {/* Escritorio */}
      <div className="container mx-auto hidden items-center justify-between gap-4 px-4 py-3 sm:flex">
        <div className="flex min-w-0 items-center gap-4">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
            Comparar
            <span className="block text-sm normal-case tracking-normal text-white tabular-nums">
              {items.length} de {COMPARE_MAX}
            </span>
          </p>
          {thumbs}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {cta}
          {close}
        </div>
      </div>
      {/* Celular */}
      <div className="sm:hidden">
        {open && <div className="max-h-[50vh] overflow-y-auto border-b border-white/10 px-4 py-3">{thumbs}</div>}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex min-h-10 cursor-pointer items-center gap-1.5 text-sm font-semibold tabular-nums"
          >
            {items.length} de {COMPARE_MAX}
            <ChevronUp className={`h-4 w-4 transition-transform ${open ? "" : "rotate-180"}`} aria-hidden />
          </button>
          <div className="flex items-center gap-1">
            {cta}
            {close}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
