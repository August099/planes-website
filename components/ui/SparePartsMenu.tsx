import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { PartCategoryLink } from "@/components/ui/header-menu-shared";
import { SparePartIcon } from "@/components/ui/SparePartIcon";

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
    <div className="va-mega group flex h-20 items-center">
      <Link href="/spareparts" className={`${linkClass} flex items-center gap-1`} aria-haspopup="true">
        Repuestos
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden />
      </Link>

      {/* Rediseño (25/10): colores por variables (.va-mega-panel en globals.css). En la Home el header es
          transparente: al abrir, header y panel pasan al mismo azul y forman una sola pieza. */}
      <div className="va-mega-panel invisible absolute inset-x-0 top-full z-50 -translate-y-1 border-t border-[var(--mega-line)] bg-[var(--mega-bg)] text-[var(--mega-fg)] opacity-0 shadow-[0_18px_30px_-18px_rgb(0_19_49/0.45)] transition-[opacity,transform] duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none">
        <div className="container mx-auto grid gap-10 px-4 pt-8 pb-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)]">
          {/* Presentación */}
          <div className="border-r border-[var(--mega-line)] pr-8">
            <p className="font-heading text-[2rem] leading-none font-black uppercase tracking-[-0.025em]">Repuestos</p>
            <span aria-hidden className="mt-3 block h-0.5 w-16 bg-[#D62828]" />
            <p className="mt-4 text-sm leading-relaxed text-[var(--mega-muted)]">
              Repuestos, instrumentos y equipamiento aeronáutico, nuevos y usados, de vendedores de todo el país.
            </p>
            <Link
              href="/spareparts"
              className="mt-5 inline-flex min-h-10 items-center border-2 border-current px-4 text-xs font-bold uppercase tracking-[0.08em] transition-colors hover:border-[#D62828] hover:bg-[#D62828] hover:text-white"
            >
              Ver todos los repuestos
            </Link>
          </div>

          {columns.map((column, c) => (
            <ul key={c} className="border-t border-[var(--mega-line)]">
              {column.map((cat) => (
                <li key={cat.id} className="border-b border-[var(--mega-line)]">
                  <Link href={sparePartsCategoryHref(cat.id)} className="group/link flex min-h-11 items-center gap-4 py-2 text-sm font-semibold">
                    {/* Ícono propio de la categoría (sprite public/iconos.svg) en lugar del número. */}
                    <SparePartIcon name={cat.name} className="h-6 w-7 shrink-0 text-[var(--mega-num)]" />
                    <span className="flex-1 transition-transform duration-200 group-hover/link:translate-x-1">{cat.name}</span>
                    <span aria-hidden className="h-0.5 w-0 bg-[#D62828] transition-[width] duration-200 group-hover/link:w-6" />
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
