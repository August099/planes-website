import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import { FavoriteIdsProvider } from "@/components/ui/FavoriteIdsProvider";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";
import type { AircraftRec, RecommendationBlock, SparePartRec } from "@/lib/recommendations";

// VA-88: bloque de recomendaciones al pie del detalle. Las tarjetas son las mismas de los listados.
// En escritorio, grilla de 4; en celular, carrusel horizontal con scroll-snap (solo CSS: no suma
// JavaScript y la página no se desplaza de costado). Los favoritos llegan desde el navegador
// (FavoriteIdsProvider), así el bloque se puede cachear igual para todos.

type Props =
  | { kind: "aircraft"; block: RecommendationBlock<AircraftRec>; action?: React.ReactNode; id?: string }
  | { kind: "sparePart"; block: RecommendationBlock<SparePartRec>; action?: React.ReactNode; id?: string };

export function RecommendationRail(props: Props) {
  const { block, action, id } = props;
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className="space-y-4 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-xl sm:text-2xl font-bold text-[#001F58]">
            {block.title}
          </h2>
          {block.subtitle && <p className="mt-1 text-sm text-slate-600">{block.subtitle}</p>}
        </div>
        {action}
      </div>

      <FavoriteIdsProvider>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] scroll-px-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
          {props.kind === "aircraft"
            ? props.block.items.map((a) => (
                <li key={a.id} className="w-[78%] max-w-[320px] shrink-0 snap-start sm:w-[45%] lg:w-auto lg:max-w-none">
                  <AircraftCard
                    id={a.id}
                    title={a.title}
                    price={a.price}
                    year={a.year}
                    category={a.category}
                    totalTimeHours={a.totalTimeHours}
                    city={a.city}
                    province={a.province}
                    imageUrl={a.images[0]?.url ?? PLACEHOLDER_IMAGE}
                    images={a.images}
                  />
                </li>
              ))
            : props.block.items.map((s) => (
                <li key={s.id} className="w-[78%] max-w-[320px] shrink-0 snap-start sm:w-[45%] lg:w-auto lg:max-w-none">
                  <SparePartCard
                    id={s.id}
                    title={s.title}
                    inPesos={s.inPesos}
                    price={s.price}
                    category={s.category}
                    city={s.city}
                    province={s.province}
                    imageUrl={s.imageUrl ?? PLACEHOLDER_IMAGE}
                  />
                </li>
              ))}
        </ul>
      </FavoriteIdsProvider>
    </section>
  );
}

/** "Comparar estas aeronaves": la actual y las 2 primeras similares (VA-83 + VA-88). 
export function CompareSimilarLink({ currentId, items }: { currentId: string; items: { id: string }[] }) {
  const ids = [currentId, ...items.slice(0, 2).map((i) => i.id)];
  return (
    <Link
      href={`/planes/compare?ids=${ids.map(encodeURIComponent).join(",")}`}
      className="inline-flex min-h-11 items-center rounded-md bg-[#001F58] px-4 text-sm font-semibold text-white hover:bg-[#00133A]"
    >
      Comparar estas aeronaves
    </Link>
  );
}
*/