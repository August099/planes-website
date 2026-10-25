import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { PartCategoryLink } from "@/components/ui/header-menu-shared";

export const sparePartsCategoryHref = (id: string) => `/spareparts?category=${encodeURIComponent(id)}`;

// VA-120: menú desplegable de "Repuestos" en el header de escritorio, con el mismo panel que tenía
// Servicios (VA-83, referencia: menú de adidas): al pasar el mouse o al llegar con Tab se abre a
// todo el ancho con las categorías principales, que llevan al listado filtrado. Solo CSS (hover y
// focus-within), sin JavaScript. Las categorías llegan del Header (taxonomía cacheada, VA-13).
export function SparePartsMenu({ linkClass, categories }: { linkClass: string; categories: PartCategoryLink[] }) {
  if (categories.length === 0) {
    return (
      <Link href="/spareparts" className={linkClass}>
        Repuestos
      </Link>
    );
  }
  const half = Math.ceil(categories.length / 2);
  const columns = [categories.slice(0, half), categories.slice(half)].filter((c) => c.length > 0);

  return (
    <div className="group flex h-20 items-center">
      <Link href="/spareparts" className={`${linkClass} flex items-center gap-1`} aria-haspopup="true">
        Repuestos
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden />
      </Link>

      <div className="invisible absolute inset-x-0 top-full z-50 border-t border-[#00205B]/10 bg-white text-slate-800 opacity-0 shadow-sm transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 motion-reduce:transition-none">
        <div className="container mx-auto grid gap-10 px-4 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)]">
          {/* Presentación */}
          <div className="border-r border-[#00205B]/10 pr-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Repuestos</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Repuestos, instrumentos y equipamiento aeronáutico, nuevos y usados, de vendedores de todo el país.
            </p>
            <Link href="/spareparts" className="mt-4 inline-block text-sm font-semibold text-[#00205B] hover:text-[#D62828] hover:underline">
              Ver todos los repuestos
            </Link>
          </div>

          {columns.map((column, c) => (
            <ul key={c} className="space-y-2.5">
              {column.map((cat, i) => (
                <li key={cat.id}>
                  <Link href={sparePartsCategoryHref(cat.id)} className="group/link flex gap-3 text-sm text-slate-700 hover:text-[#00205B]">
                    <span className="w-5 shrink-0 font-semibold tabular-nums text-[#D62828]">
                      {String(c * half + i + 1).padStart(2, "0")}
                    </span>
                    <span className="group-hover/link:underline">{cat.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
