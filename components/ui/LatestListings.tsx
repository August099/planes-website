// Componente de servidor (VA-76): solo ScrollCarousel y las tarjetas se hidratan.
import Link from "next/link";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import { SectionTitle } from "@/components/ui/home/SectionTitle";
import { ScrollCarousel } from "@/components/ui/home/ScrollCarousel";

type CategoryProp = { id?: string; name: string } | string | null;

export type ListingItem =
  | {
      type: "AIRCRAFT";
      id: string;
      title: string;
      price: number | null;
      year: number | null;
      category: CategoryProp;
      totalTimeHours: number | null;
      city?: string | null;
      province?: string | null;
      imageUrl: string;
      createdAt: string | Date;
      isFavoriteInitial?: boolean;
    }
  | {
      type: "SPARE_PART";
      id: string;
      title: string;
      price: number | null;
      inPesos?: boolean;
      category: CategoryProp;
      city?: string | null;
      province?: string | null;
      imageUrl: string;
      createdAt: string | Date;
      isFavoriteInitial?: boolean;
    };

type LatestListingsProps = {
  items: ListingItem[];
};

export function LatestAircraft({ items }: LatestListingsProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="py-8 relative">
      {/* TÍTULO Y NAVEGACIÓN */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <SectionTitle>Últimas Publicaciones</SectionTitle>
          <p className="text-sm text-slate-600 mt-1">
            Lo último en aeronaves y repuestos certificados ingresados al
            mercado
          </p>
        </div>
        <div className="flex gap-4 hidden sm:flex text-sm font-semibold text-[#001F58]">
          <Link href="/aircraft" className="hover:underline">
            Ver aviones
          </Link>
          <span className="text-slate-300">•</span>
          <Link href="/spareparts" className="hover:underline">
            Ver repuestos
          </Link>
        </div>
      </div>

      {/* VA-139: en celular se asoma la tarjeta siguiente (1,15); 2 desde 480 px, 3 desde md y 4 desde xl. */}
      <ScrollCarousel
        label="Últimas publicaciones"
        gapClassName="gap-3 min-[480px]:gap-4 md:gap-5 xl:gap-6"
        slideClassName="w-[calc((100%-1.8px)/1.15)] min-[480px]:w-[calc((100%-16px)/2)] md:w-[calc((100%-40px)/3)] xl:w-[calc((100%-72px)/4)]"
      >
        {items.map((item) =>
          item.type === "AIRCRAFT" ? (
            <AircraftCard
              key={`${item.type}-${item.id}`}
              id={item.id}
              title={item.title}
              price={item.price}
              year={item.year}
              category={item.category}
              totalTimeHours={item.totalTimeHours}
              city={item.city}
              province={item.province}
              imageUrl={item.imageUrl}
              isFavoriteInitial={item.isFavoriteInitial}
            />
          ) : (
            <SparePartCard
              key={`${item.type}-${item.id}`}
              id={item.id}
              title={item.title}
              price={item.price}
              inPesos={item.inPesos}
              category={item.category}
              city={item.city}
              province={item.province}
              imageUrl={item.imageUrl}
              isFavoriteInitial={item.isFavoriteInitial}
            />
          ),
        )}
      </ScrollCarousel>
    </section>
  );
}
