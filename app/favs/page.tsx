import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import { Heart } from "lucide-react";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { UnavailableFavoriteCard } from "@/components/ui/UnavailableFavoriteCard";
import { isListingActive } from "@/lib/listing-filters";
import { PageHeader } from "@/components/ui/PageHeader";

// VA-105 · 5.3: por qué un favorito ya no está disponible.
function unavailableReason(listing: { status: string }) {
  if (listing.status === "SOLD") return "Se vendió.";
  if (listing.status === "PAUSED") return "El vendedor la pausó.";
  return "La publicación no está activa.";
}

export default async function FavoritesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: {
      aircraft: {
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { order: "asc" }, take: 1 },
        },
      },
      sparePart: {
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { order: "asc" }, take: 1 },
        },
      },
    },
  });

  // VA-105 · 5.3: los que ya no están disponibles van al final, grisados (no se borran solos).
  const isAvailable = (f: (typeof favorites)[number]) => {
    const listing = f.aircraft ?? f.sparePart;
    return listing ? isListingActive(listing) : false;
  };
  const sorted = [...favorites.filter(isAvailable), ...favorites.filter((f) => !isAvailable(f))];

  return (
    <main className="relative isolate min-h-[calc(100vh-80px)] container mx-auto px-4 py-8 pb-16">
      <PageBackground page="default" />
      <Breadcrumbs items={[{ label: "Favoritos" }]} className="-mt-4 mb-2" />

      <PageHeader variant="plain"
        compact
        routeId="va-route-favs"
        className="mb-8"
        title={
          <span className="inline-flex items-center gap-3">
            <Heart aria-hidden className="h-7 w-7 fill-[#D62828] text-[#D62828]" />
            Mis Favoritos
          </span>
        }
        subtitle={`Publicaciones guardadas (${favorites.length})`}
      />

      {favorites.length === 0 ? (
        <div className="va-plate py-20 text-center">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium text-sm">
            Aún no guardaste ninguna publicación en tus favoritos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {sorted.map((fav) => {
            const listing = fav.aircraft ?? fav.sparePart;
            if (listing && !isAvailable(fav)) {
              return (
                <UnavailableFavoriteCard
                  key={`fav-unavailable-${listing.id}`}
                  id={listing.id}
                  type={fav.aircraft ? "AIRCRAFT" : "SPARE_PART"}
                  title={listing.title}
                  imageUrl={listing.images[0]?.url ?? PLACEHOLDER_IMAGE}
                  reason={unavailableReason(listing)}
                />
              );
            }
            if (fav.aircraft) {
              return (
                <AircraftCard
                  key={`fav-aircraft-${fav.aircraft.id}`}
                  id={fav.aircraft.id}
                  title={fav.aircraft.title}
                  price={fav.aircraft.price ? Number(fav.aircraft.price) : null}
                  year={fav.aircraft.year}
                  category={fav.aircraft.category}
                  totalTimeHours={fav.aircraft.totalTimeHours}
                  city={fav.aircraft.city}
                  province={fav.aircraft.province}
                  imageUrl={fav.aircraft.images[0]?.url ?? PLACEHOLDER_IMAGE}
                  isFavoriteInitial={true}
                />
              );
            }

            if (fav.sparePart) {
              return (
                <SparePartCard
                  key={`fav-spare-${fav.sparePart.id}`}
                  id={fav.sparePart.id}
                  title={fav.sparePart.title}
                  price={fav.sparePart.price ? Number(fav.sparePart.price) : null}
                  category={fav.sparePart.category}
                  city={fav.sparePart.city}
                  province={fav.sparePart.province}
                  imageUrl={fav.sparePart.images[0]?.url ?? PLACEHOLDER_IMAGE}
                  isFavoriteInitial={true}
                />
              );
            }

            return null;
          })}
        </div>
      )}
    </main>
  );
}