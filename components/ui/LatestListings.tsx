// Componente de servidor (VA-76): solo ScrollCarousel y las tarjetas se hidratan.
import Link from "next/link";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import { DisplayTitle, HOME_SQUARE_LINK } from "@/components/ui/home/DisplayTitle";
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
    <section className="relative">
      {/* TÍTULO Y NAVEGACIÓN */}
      <div className="mb-8">
        <DisplayTitle
          aside={
            <div className="flex gap-2">
              <Link href="/aircraft" className={HOME_SQUARE_LINK}>
                Ver aviones
              </Link>
              <Link href="/spareparts" className={HOME_SQUARE_LINK}>
                Ver repuestos
              </Link>
            </div>
          }
        >
          Últimas Publicaciones
        </DisplayTitle>
        <p className="mt-3 text-sm text-slate-600">Lo último en aeronaves y repuestos certificados ingresados al mercado</p>
      </div>

      {/* VA-139: en celular se asoma la tarjeta siguiente (1,45: más chicas que Destacadas, 26/10); 2 desde 480 px, 3 desde md y 4 desde xl. */}
      <ScrollCarousel
        label="Últimas publicaciones"
        gapClassName="gap-3 min-[480px]:gap-4 md:gap-5 xl:gap-6"
        slideClassName="w-[calc((100%-5.4px)/1.45)] min-[480px]:w-[calc((100%-16px)/2)] md:w-[calc((100%-40px)/3)] xl:w-[calc((100%-72px)/4)]"
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
