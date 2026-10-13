"use client";

import { SlidersHorizontal, X, ChevronDown, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PROVINCES, provinceShortName } from "@/lib/provinces";

// Mismo estilo para "Filtros" y "Ordenar" (pedido del socio, 9/10: en celular no eran iguales:
// fondo, esquinas, peso y color del texto distintos).
export const TOOLBAR_BUTTON_CLASS =
  "min-h-11 lg:min-h-0 flex items-center justify-center gap-2 bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer";

// Estructura común de las barras de filtros de /planes y /spareparts (VA-45):
// en celular, botón "Filtros (n)" que abre un panel lateral; desde lg, barra lateral fija.
export function FilterShell({
  activeCount,
  onClear,
  isOpenMobile,
  setIsOpenMobile,
  children,
}: {
  activeCount: number;
  onClear: () => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filtros</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors min-h-11 sm:min-h-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>
      {children}
    </>
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
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsOpenMobile(false)} />
          <div className="relative ml-auto w-full max-w-xs bg-[var(--primary-foreground)] h-full p-5 overflow-y-auto flex flex-col gap-5 shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-semibold text-base">Filtros de búsqueda</span>
              <button
                type="button"
                onClick={() => setIsOpenMobile(false)}
                aria-label="Cerrar filtros"
                className="flex h-11 w-11 items-center justify-center text-gray-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}

      <aside className="hidden lg:flex w-72 shrink-0 border border-[#001F58]/10 bg-[var(--primary-foreground)] rounded-xl p-5 h-fit flex-col gap-5">
        {content}
      </aside>
    </>
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
  return (
    <>
      <Separator />
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center justify-between w-full text-left py-1 min-h-11 sm:min-h-0 group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium group-hover:text-primary transition-colors">{title}</h3>
            {count > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </button>
        {open && <div className="pt-1">{children}</div>}
      </div>
    </>
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
          className="flex items-center gap-1 rounded-full bg-[#001F58]/10 px-2.5 py-1 text-xs font-medium text-[#001F58] hover:bg-[#001F58]/20 transition-colors cursor-pointer"
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
