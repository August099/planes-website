import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import { FavoriteIdsProvider } from "@/components/ui/FavoriteIdsProvider";
import { ScrollCarousel } from "@/components/ui/home/ScrollCarousel";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";
import type { AircraftRec, RecommendationBlock, SparePartRec } from "@/lib/recommendations";

// VA-88: bloque de recomendaciones al pie del detalle. Las tarjetas son las mismas de los listados.
// 26/10 (socio): siempre carrusel (el de la Home, con flechas y puntos), también en escritorio: 4 por
// pantalla desde xl, 3 desde md, 2 desde 480 px y en celular se asoma la siguiente. Los favoritos llegan
// desde el navegador (FavoriteIdsProvider), así el bloque se puede cachear igual para todos.

const SLIDE = "w-[calc((100%-1.8px)/1.15)] min-[480px]:w-[calc((100%-16px)/2)] md:w-[calc((100%-40px)/3)] xl:w-[calc((100%-72px)/4)]";
const GAP = "gap-3 min-[480px]:gap-4 md:gap-5 xl:gap-6";

type Props =
  | { kind: "aircraft"; block: RecommendationBlock<AircraftRec>; action?: React.ReactNode; id?: string }
  | { kind: "sparePart"; block: RecommendationBlock<SparePartRec>; action?: React.ReactNode; id?: string };

export function RecommendationRail(props: Props) {
  const { block, action, id } = props;
  const headingId = id ? `${id}-title` : undefined;
  // VA-141: solo el título, sin el subtítulo explicativo (block.subtitle queda sin usar).
  return (
    <section id={id} aria-labelledby={headingId} className="space-y-4 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="font-heading text-xl font-extrabold tracking-[-0.02em] text-[#00205B] sm:text-2xl">
            {block.title}
          </h2>
        </div>
        {action}
      </div>

      <FavoriteIdsProvider>
        {/* sm:mx-2: las flechas del carrusel asoman 20 px del borde; con este margen no salen de la pantalla. */}
        <ScrollCarousel label={block.title} className="sm:mx-2" gapClassName={GAP} slideClassName={SLIDE}>
          {props.kind === "aircraft"
            ? props.block.items.map((a) => (
                <AircraftCard
                  key={a.id}
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
              ))
            : props.block.items.map((s) => (
                <SparePartCard
                  key={s.id}
                  id={s.id}
                  title={s.title}
                  inPesos={s.inPesos}
                  price={s.price}
                  category={s.category}
                  city={s.city}
                  province={s.province}
                  imageUrl={s.imageUrl ?? PLACEHOLDER_IMAGE}
                />
              ))}
        </ScrollCarousel>
      </FavoriteIdsProvider>
    </section>
  );
}

/** "Comparar estas aeronaves": la actual y las 2 primeras similares (VA-83 + VA-88). 
export function CompareSimilarLink({ currentId, items }: { currentId: string; items: { id: string }[] }) {
  const ids = [currentId, ...items.slice(0, 2).map((i) => i.id)];
  return (
    <Link
      href={`/aircraft/compare?ids=${ids.map(encodeURIComponent).join(",")}`}
      className="inline-flex min-h-11 items-center rounded-md bg-[#00205B] px-4 text-sm font-semibold text-white hover:bg-[#001331]"
    >
      Comparar estas aeronaves
    </Link>
  );
}
*/