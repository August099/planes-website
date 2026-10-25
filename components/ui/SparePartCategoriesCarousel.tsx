// Componente de servidor (VA-76): solo ScrollCarousel se hidrata.
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DynamicCategoryIcon } from "@/components/ui/DynamicCategoryIcon";
import { SectionTitle } from "@/components/ui/home/SectionTitle";
import { ScrollCarousel } from "@/components/ui/home/ScrollCarousel";

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
  return (
    <section className="py-6 relative group">
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <SectionTitle>Buscar Repuestos por Categoría</SectionTitle>
          <p className="text-sm text-slate-600 mt-1">
            Encontrá piezas y componentes certificados para tu aeronave
          </p>
        </div>
        <Link
          href="/spareparts"
          // VA-162: el mismo azul que los demás links de la Home ("Ver Aviones →").
          className="text-sm font-semibold text-[#001F58] hover:underline hidden sm:block"
        >
          Ver todo el catálogo
        </Link>
      </div>

      {/* VA-139: en celular se asoma la tarjeta siguiente (2,3); 3,3 desde 480 px, 4 desde sm, 5 desde md y 6 desde lg. */}
      <ScrollCarousel
        label="Categorías de repuestos"
        className="px-1"
        gapClassName="gap-3 min-[480px]:gap-4 md:gap-5"
        slideClassName="w-[calc((100%-15.6px)/2.3)] min-[480px]:w-[calc((100%-36.8px)/3.3)] sm:w-[calc((100%-48px)/4)] md:w-[calc((100%-80px)/5)] lg:w-[calc((100%-100px)/6)]"
      >
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/spareparts?category=${cat.id}`}
            className="block h-full"
          >
            <Card className="home-card group/card flex h-full min-h-28 w-full flex-col justify-between gap-3 rounded-lg border-slate-200 bg-white p-4 shadow-sm transition-colors duration-200 hover:border-[#E70F1F] cursor-pointer">
              <DynamicCategoryIcon
                name={cat.icon}
                className="h-6 w-6 text-[#001F58] transition-colors group-hover/card:text-[#E70F1F]"
              />
              <span className="line-clamp-2 text-left text-xs font-semibold leading-snug text-slate-800 sm:text-sm">
                {cat.name}
              </span>
            </Card>
          </Link>
        ))}
      </ScrollCarousel>
    </section>
  );
}
