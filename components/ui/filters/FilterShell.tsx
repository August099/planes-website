"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { PROVINCES, provinceShortName } from "@/lib/provinces";

// Mismo estilo para "Filtros" y "Ordenar" (pedido del socio, 9/10: en celular no eran iguales:
// fondo, esquinas, peso y color del texto distintos).
export const TOOLBAR_BUTTON_CLASS =
  "min-h-11 lg:min-h-0 flex items-center justify-center gap-2 bg-white border border-[#00205B]/15 px-4 py-2.5 rounded-md text-sm font-semibold text-[#00205B] hover:border-[#00205B]/40 transition-colors cursor-pointer";

// Estructura común de las barras de filtros de /aircraft, /spareparts y /services/hangars (VA-45):
// en celular, botón "Filtros (n)" que abre un panel lateral; desde lg, barra lateral fija.
// VA-91: el panel de celular va en un portal a <body> (las páginas usan `isolate`, que lo dejaba
// debajo del header) y "Aplicar filtros" queda fijo al pie, siempre visible.
export function FilterShell({
  activeCount,
  onClear,
  onApply,
  isOpenMobile,
  setIsOpenMobile,
  children,
}: {
  activeCount: number;
  onClear: () => void;
  onApply: () => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const clearButton = activeCount > 0 && (
    <button
      type="button"
      onClick={onClear}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors min-h-11 sm:min-h-0 cursor-pointer"
    >
      <X className="w-3.5 h-3.5" />
      Limpiar
    </button>
  );

  const applyButton = (
    <button
      type="button"
      onClick={onApply}
      className="w-full min-h-11 rounded-md bg-[#00205B] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#D62828] cursor-pointer"
    >
      Aplicar filtros
    </button>
  );

  return (
    <>
      <div className="lg:hidden w-full h-full flex items-center">
        <button
          type="button"
          onClick={() => setIsOpenMobile(true)}
          className={`w-full ${TOOLBAR_BUTTON_CLASS}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filtros {activeCount > 0 ? `(${activeCount})` : ""}</span>
        </button>
      </div>

      {isOpenMobile && (
        <MobileFilterPanel onClose={() => setIsOpenMobile(false)} clearButton={clearButton} applyButton={applyButton}>
          {children}
        </MobileFilterPanel>
      )}

      <aside className="va-plate hidden h-fit w-72 shrink-0 flex-col gap-4 p-5 lg:flex">
        <div className="flex items-center justify-between">
          <h2 className="va-label">Filtros</h2>
          {clearButton}
        </div>
        {children}
        {applyButton}
      </aside>
    </>
  );
}

function MobileFilterPanel({
  onClose,
  clearButton,
  applyButton,
  children,
}: {
  onClose: () => void;
  clearButton: React.ReactNode;
  applyButton: React.ReactNode;
  children: React.ReactNode;
}) {
  // Escape cierra y el fondo no scrollea mientras el panel está abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] lg:hidden flex" role="dialog" aria-modal="true" aria-label="Filtros de búsqueda">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto flex h-dvh w-full max-w-xs flex-col bg-[var(--primary-foreground)] shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
          <span className="font-semibold text-base">Filtros de búsqueda</span>
          <div className="flex items-center gap-1">
            {clearButton}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar filtros"
              className="flex h-11 w-11 items-center justify-center text-gray-500 hover:text-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        <div className="shrink-0 border-t bg-[var(--primary-foreground)] px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {applyButton}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Sección colapsable con contador de filtros activos en el encabezado.
export function FilterSection({
  title,
  count = 0,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  // Rediseño (25/10): la lista se despliega con una transición de alto (grid 0fr → 1fr). Cerrada queda
  // inerte, así sus casillas no reciben foco.
  return (
    <div className="border-t border-[#00205B]/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex min-h-11 w-full items-center justify-between py-2 text-left cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#00205B] transition-colors group-hover:text-[#D62828]">{title}</span>
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-[#D62828] px-1.5 text-[11px] font-bold text-white tabular-nums">{count}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#00205B]/60 transition-transform duration-300 ${open ? "" : "-rotate-90"}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden" inert={!open}>
          <div className="pb-3 pt-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Filtros aplicados (los de la URL) como etiquetas que se quitan de a una.
export function AppliedFilterChips({
  chips,
  onRemove,
}: {
  chips: { key: string; value: string | null; label: string }[];
  onRemove: (key: string, value: string | null) => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={`${chip.key}-${chip.value ?? ""}`}
          type="button"
          onClick={() => onRemove(chip.key, chip.value)}
          aria-label={`Quitar filtro ${chip.label}`}
          className="flex items-center gap-1 rounded-sm border border-[#00205B]/20 bg-white px-2 py-1 text-xs font-semibold text-[#00205B] transition-colors hover:border-[#D62828] hover:text-[#D62828] cursor-pointer"
        >
          {chip.label}
          <X className="w-3 h-3" />
        </button>
      ))}
    </div>
  );
}

// Provincia (VA-77): un solo valor, por slug (?province=santa-fe).
export function ProvinceFilterSelect({ value, onChange }: { value: string; onChange: (slug: string) => void }) {
  return (
    <select
      aria-label="Provincia"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-2 border rounded-md text-sm bg-white"
    >
      <option value="">Todas las provincias</option>
      {PROVINCES.map((p) => (
        <option key={p.slug} value={p.slug}>
          {provinceShortName(p.name)}
        </option>
      ))}
    </select>
  );
}
