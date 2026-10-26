// Componente de servidor (VA-76): solo ScrollCarousel se hidrata.
import Link from "next/link";
import { SparePartIcon } from "@/components/ui/SparePartIcon";
import { DisplayTitle, HOME_SQUARE_LINK } from "@/components/ui/home/DisplayTitle";
import { ScrollCarousel } from "@/components/ui/home/ScrollCarousel";
import { categoryInitials } from "@/lib/category-initials";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

interface Props {
  categories: CategoryItem[];
}

export function SparePartCategoriesCarousel({ categories }: Props) {
  // Iniciales de cada categoría (FE, TA...) en vez del número de orden: los números ya están en los títulos.
  const initials = categoryInitials(categories.map((c) => c.name));
  return (
    <section className="relative">
      {/* CABECERA */}
      <div className="mb-8">
        <DisplayTitle
          aside={
            // VA-162: el mismo azul que los demás links de la Home.
            <Link href="/spareparts" className={HOME_SQUARE_LINK}>
              Ver todo el catálogo
            </Link>
          }
        >
          Buscar Repuestos por Categoría
        </DisplayTitle>
        <p className="mt-3 text-sm text-slate-600">Encontrá piezas y componentes certificados para tu aeronave</p>
      </div>

      {/* VA-139: en celular se asoma la tarjeta siguiente (2,3); 3,3 desde 480 px, 4 desde sm, 5 desde md y 6 desde lg.
          Rediseño (25/10, v2): fichas altas de borde grueso que se rellenan de azul al pasar. */}
      <ScrollCarousel
        label="Categorías de repuestos"
        className="va-cats px-1"
        gapClassName="gap-3 min-[480px]:gap-4 md:gap-5"
        slideClassName="w-[calc((100%-15.6px)/2.3)] min-[480px]:w-[calc((100%-36.8px)/3.3)] sm:w-[calc((100%-48px)/4)] md:w-[calc((100%-80px)/5)] lg:w-[calc((100%-100px)/6)]"
      >
        {categories.map((cat, i) => (
          <Link key={cat.id} href={`/spareparts?category=${cat.id}`} className="group block h-full">
            <span className="va-tile relative flex h-full min-h-44 w-full flex-col justify-between overflow-hidden border-2 border-[#00205B] bg-white p-4 transition-colors duration-300 group-hover:bg-[#00205B] group-focus-visible:bg-[#00205B]">
              <span className="flex items-start justify-between gap-2">
                <span
                  aria-hidden
                  className="font-heading text-[2.25rem] leading-none font-black tracking-[-0.04em] tabular-nums text-[#00205B]/13 transition-colors group-hover:text-white/20"
                >
                  {initials[i]}
                </span>
                <SparePartIcon name={cat.name} icon={cat.icon} className="h-10 w-12 shrink-0 text-[#00205B] transition-colors group-hover:text-white" />
              </span>
              <span className="line-clamp-3 text-left text-[13px] font-black uppercase leading-tight tracking-[0.01em] text-[#00205B] transition-colors group-hover:text-white sm:text-sm">
                {cat.name}
              </span>
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-[#D62828] transition-transform duration-300 group-hover:scale-x-100" />
            </span>
          </Link>
        ))}
      </ScrollCarousel>
    </section>
  );
}
