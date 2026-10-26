"use client";

import { Check, Columns3 } from "lucide-react";
import { addToCompare, removeFromCompare, useCompareItems, type CompareItem } from "@/lib/compare-store";
import { logCompareAdd } from "@/app/actions/analytics-actions";

// VA-83: botón chico "Comparar" / "Agregado". En las tarjetas va sobre la foto, en el detalle
// junto a favoritos. No navega (frena el click del link de la tarjeta).
export function CompareButton({ item, variant = "card" }: { item: CompareItem; variant?: "card" | "detail" | "overlay" }) {
  const items = useCompareItems();
  const added = items.some((i) => i.id === item.id);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (added) removeFromCompare(item.id);
    // VA-171: cuenta para las métricas del Broker (el comparador es de aviones).
    else if (addToCompare(item) === "added") void logCompareAdd("AIRCRAFT", item.id);
  };

  const label = added ? "Agregado" : "Comparar";
  const aria = added ? `Quitar ${item.title} de la comparación` : `Agregar ${item.title} a la comparación`;

  if (variant === "detail") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={added}
        aria-label={aria}
        className="group flex min-h-11 min-w-11 cursor-pointer select-none items-center justify-center sm:min-h-0 sm:min-w-0"
      >
        {added ? <Check className="text-[#D62828]" /> : <Columns3 className="text-slate-600 transition-colors hover:text-[#00205B]" />}
        <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold text-slate-700 opacity-0 transition-all duration-300 ease-out group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100">
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={added}
      aria-label={aria}
      className={`flex h-8 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold shadow-sm transition-colors ${
        added
          ? "bg-[#00205B] text-white"
          : variant === "overlay"
            ? "bg-white/85 text-[#00205B] hover:bg-white"
            : "bg-white/80 text-slate-700 hover:bg-white hover:text-[#00205B]"
      }`}
    >
      {added ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Columns3 className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </button>
  );
}
