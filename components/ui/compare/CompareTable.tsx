"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleHelp, Plus, Search, X } from "lucide-react";
import { AppImage } from "@/components/ui/AppImage";
import { COMPARE_MAX, compareUrl, setCompare } from "@/lib/compare-store";
import { searchAircraftForCompare, type CompareSearchResult } from "@/app/actions/compare-actions";
import type { CompareCell, CompareSection } from "@/lib/compare-rows";

export type CompareColumn = {
  id: string;
  title: string;
  href: string;
  image: string | null;
  price: string;
  location: string;
  active: boolean;
};

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
// Celular: etiquetas fijas a la izquierda (120 px) y columnas de 160 px con scroll-snap.
// Escritorio: etiquetas de 220 px y 3 columnas iguales.
const GRID = "grid grid-cols-[120px_repeat(3,160px)] sm:grid-cols-[220px_repeat(3,minmax(0,1fr))]";

function Cell({ value, best }: { value: CompareCell; best: boolean }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const content = Array.isArray(value) ? (
    <ul className="space-y-1">
      {value.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </ul>
  ) : (
    <span className="whitespace-pre-line">{value}</span>
  );
  return (
    <span className={`flex items-start gap-1.5 ${best ? "font-bold text-[#00205B]" : ""}`}>
      {best && <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D62828]" />}
      <span className="min-w-0">
        {content}
        {best && <span className="sr-only"> (mejor valor)</span>}
      </span>
    </span>
  );
}

function AddSlot({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CompareSearchResult[]>([]);
  const [searched, setSearched] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await searchAircraftForCompare(q, ids);
        setResults(r);
        setSearched(q);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q, ids]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-full min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#00205B]/25 text-sm font-semibold text-[#00205B] hover:border-[#00205B]/50 hover:bg-white"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Agregar aeronave
      </button>
    );
  }

  const showResults = q.trim().length >= 2 && searched === q;
  return (
    <div className="space-y-2 rounded-md border border-[#00205B]/15 bg-white p-2">
      <label className="relative block">
        <span className="sr-only">Buscar por título, marca o modelo</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Marca, modelo o título"
          className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-2 text-sm"
        />
      </label>
      {showResults && results.length === 0 && <p className="px-1 text-xs text-slate-500">Sin resultados.</p>}
      {showResults && results.length > 0 && (
        <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => router.push(compareUrl([...ids, r.id]))}
                className="flex w-full cursor-pointer items-center gap-2 px-1 py-2 text-left hover:bg-slate-50"
              >
                <span className="relative h-8 w-11 shrink-0 overflow-hidden rounded-sm bg-slate-100">
                  {r.image && <AppImage src={r.image} alt="" fill sizes="44px" className="object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-[#00205B]">{r.title}</span>
                  <span className="block text-[11px] tabular-nums text-slate-500">{r.subtitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => setOpen(false)} className="px-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
        Cancelar
      </button>
    </div>
  );
}

// VA-83: tabla del comparador. El encabezado de columnas queda fijo arriba al bajar; en celular
// la tabla se desplaza de costado (las etiquetas quedan fijas) y el encabezado acompaña ese
// desplazamiento. La página nunca tiene scroll horizontal: solo la tabla.
export function CompareTable({ columns, sections }: { columns: CompareColumn[]; sections: CompareSection[] }) {
  const router = useRouter();
  const [onlyDiff, setOnlyDiff] = useState(false);
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const ids = columns.map((c) => c.id);
  const slots = Array.from({ length: COMPARE_MAX }, (_, i) => columns[i] ?? null);

  // La bandeja y los botones "Comparar" reflejan lo que se está viendo (también si llegaste por un
  // link compartido).
  useEffect(() => {
    setCompare(columns.map((c) => ({ id: c.id, title: c.title, image: c.image })));
  }, [columns]);

  const syncScroll = () => {
    if (headRef.current && bodyRef.current) headRef.current.scrollLeft = bodyRef.current.scrollLeft;
  };

  const remove = (id: string) => {
    const rest = ids.filter((x) => x !== id);
    router.push(rest.length ? compareUrl(rest) : "/aircraft/compare");
  };

  const activeCount = columns.filter((c) => c.active).length;
  const visibleSections = sections
    .map((s) => ({
      ...s,
      rows: s.rows.filter((r) => {
        if (!onlyDiff) return true;
        const vals = r.cells.slice(0, columns.length).filter((_, i) => columns[i]?.active).map((c) => JSON.stringify(c));
        return new Set(vals).size > 1;
      }),
    }))
    .filter((s) => s.rows.length > 0);

  return (
    <div className="rounded-lg border border-[#00205B]/12 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#00205B]/10 px-4 py-3">
        <p className={LABEL}>
          {columns.length} de {COMPARE_MAX} aeronaves
        </p>
        <label className={`flex items-center gap-2 text-sm text-slate-700 ${activeCount < 2 ? "opacity-50" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={onlyDiff}
            disabled={activeCount < 2}
            onChange={(e) => setOnlyDiff(e.target.checked)}
            className="h-4 w-4 accent-[#00205B]"
          />
          Mostrar solo diferencias
        </label>
      </div>

      {/* Encabezado de columnas, fijo arriba */}
      <div ref={headRef} className="sticky top-0 z-20 overflow-hidden border-b border-[#00205B]/12 bg-white">
        <div className={`${GRID} w-max sm:w-full`}>
          <div className="sticky left-0 z-10 bg-white" />
          {slots.map((c, i) => (
            <div key={c?.id ?? `slot-${i}`} className="border-l border-[#00205B]/10 p-2 sm:p-3">
              {c ? (
                <div className={`space-y-2 ${c.active ? "" : "opacity-70"}`}>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-slate-100">
                    {c.image && <AppImage src={c.image} alt={c.title} fill sizes="(min-width: 640px) 25vw, 160px" className="object-cover" />}
                  </div>
                  <p className="line-clamp-2 text-xs font-bold leading-snug text-[#00205B] sm:text-sm">{c.title}</p>
                  {c.active ? (
                    <>
                      <p className="text-sm font-bold tabular-nums text-[#00205B]">{c.price}</p>
                      <p className="truncate text-[11px] text-slate-500">{c.location}</p>
                    </>
                  ) : (
                    <p className="text-xs font-semibold text-[#B71F1F]">Este aviso ya no está disponible</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {c.active && (
                      <Link href={c.href} className="rounded-md border border-[#00205B]/20 px-2 py-1 text-[11px] font-semibold text-[#00205B] hover:bg-slate-50">
                        Ver aviso
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <X className="h-3 w-3" aria-hidden />
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <AddSlot ids={ids} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filas */}
      <div ref={bodyRef} onScroll={syncScroll} className="snap-x snap-mandatory scroll-pl-[120px] overflow-x-auto sm:snap-none sm:scroll-pl-0">
        <div className={`${GRID} w-max sm:w-full`}>
          {visibleSections.length === 0 && (
            <p className="col-span-4 px-4 py-6 text-sm text-slate-500">
              {onlyDiff ? "Todas las filas son iguales." : "Agregá aeronaves para comparar."}
            </p>
          )}
          {visibleSections.map((s) => (
            <div key={s.title} className="contents">
              <div className="sticky left-0 z-10 col-span-1 border-t border-[#00205B]/12 bg-slate-50 px-3 py-2">
                <p className={LABEL}>{s.title}</p>
              </div>
              <div className="col-span-3 border-t border-[#00205B]/12 bg-slate-50" />
              {s.rows.map((r) => (
                <div key={r.key} className="contents">
                  <div className="sticky left-0 z-10 flex items-start gap-1 border-t border-slate-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-500 sm:text-sm">
                    {r.label}
                    {r.helpHref && (
                      <Link href={r.helpHref} aria-label={`Qué es ${r.label}`} className="mt-0.5 text-slate-400 hover:text-[#00205B]">
                        <CircleHelp className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                  {slots.map((c, i) => (
                    <div key={i} className="snap-start border-l border-t border-slate-100 px-3 py-2.5 text-xs tabular-nums text-slate-800 sm:text-sm">
                      {c && c.active ? <Cell value={r.cells[i] ?? null} best={r.best[i] ?? false} /> : <span className="text-slate-300">—</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="border-t border-[#00205B]/10 px-4 py-3 text-xs text-slate-500">
        <span aria-hidden className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#D62828] align-middle" /> Mejor valor en
        precio, año y horas (menos horas totales y desde la última recorrida). Los precios se muestran como los publicó cada
        vendedor, sin convertir.
      </p>
    </div>
  );
}
