"use client";

import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import { ScrollCarousel } from "@/components/ui/home/ScrollCarousel";
import { logProfileListingClick } from "@/app/actions/analytics-actions";
import { listingsFor, type PageListing, type PageSection } from "@/lib/profile-page";

// VA-169: las secciones de la Página VA completa (Broker y admins), como las ven los visitantes. Mismas
// tarjetas y carrusel que el resto de la web. Las usa también la vista previa del editor.

export type PageCard = PageListing & {
  id: string;
  price: number | null;
  city: string;
  province: string;
  category: { id: string; name: string } | null;
  imageUrl: string;
  year?: number;
  totalTimeHours?: number | null;
  inPesos?: boolean;
};

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

function Card({ l, fav }: { l: PageCard; fav: boolean }) {
  return l.kind === "AIRCRAFT" ? (
    <AircraftCard id={l.id} title={l.title} price={l.price} year={l.year ?? null} category={l.category} totalTimeHours={l.totalTimeHours ?? null} city={l.city} province={l.province} imageUrl={l.imageUrl} isFavoriteInitial={fav} />
  ) : (
    <SparePartCard id={l.id} title={l.title} price={l.price} inPesos={l.inPesos} category={l.category} city={l.city} province={l.province} imageUrl={l.imageUrl} isFavoriteInitial={fav} />
  );
}

export function ProfilePageSections({
  sections,
  listings,
  favIds = [],
  profileUserId,
  trackClicks = false,
  compact = false,
}: {
  sections: PageSection[];
  listings: PageCard[];
  favIds?: string[];
  profileUserId: string;
  /** Contar los clics de los visitantes hacia los avisos (VA-171). */
  trackClicks?: boolean;
  /** Vista previa angosta (celular) del editor. */
  compact?: boolean;
}) {
  const onClick = (l: PageCard) => (e: React.MouseEvent) => {
    if (!trackClicks || (e.target as HTMLElement).closest("button")) return;
    if ((e.target as HTMLElement).closest("a")) void logProfileListingClick(profileUserId, l.kind, l.id);
  };
  const visible = sections.filter((s) => !s.hidden);
  if (visible.length === 0) return null;

  return (
    // overflow-x-clip: las flechas del carrusel se asoman unos px por fuera (como en la Home).
    <div className="space-y-10 overflow-x-clip">
      {visible.map((s) => {
        const items = listingsFor(s, listings);
        return (
          <section key={s.id} aria-label={s.title || undefined} className="space-y-4">
            {s.title && (
              <h2 className="font-heading text-xl font-bold text-[#00205B] sm:text-2xl">
                <span className="mr-2 text-[#D62828]" aria-hidden>
                  {"//"}
                </span>
                {s.title}
              </h2>
            )}
            {s.type === "text" && <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-slate-700">{s.body}</p>}
            {s.type === "carousel" &&
              (items.length === 0 ? (
                <p className={LABEL}>Sin avisos para mostrar</p>
              ) : (
                <ScrollCarousel
                  label={s.title || "Avisos"}
                  className={compact ? "" : "sm:px-10"}
                  gapClassName="gap-4"
                  slideClassName={compact ? "w-[calc((100%-16px)/1.15)]" : "w-[calc((100%-16px)/1.15)] sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-48px)/4)]"}
                >
                  {items.map((l) => (
                    <div key={l.key} onClickCapture={onClick(l)}>
                      <Card l={l} fav={favIds.includes(l.id)} />
                    </div>
                  ))}
                </ScrollCarousel>
              ))}
            {s.type === "grid" &&
              (items.length === 0 ? (
                <p className={LABEL}>Todavía no hay avisos activos</p>
              ) : (
                <div className={`grid grid-cols-1 gap-6 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                  {items.map((l) => (
                    <div key={l.key} onClickCapture={onClick(l)}>
                      <Card l={l} fav={favIds.includes(l.id)} />
                    </div>
                  ))}
                </div>
              ))}
          </section>
        );
      })}
    </div>
  );
}
