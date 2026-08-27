import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import Image from "next/image";
import { Heart } from "lucide-react";

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

  return (
    <main className="relative isolate overflow-hidden h-screen container mx-auto px-4 py-8">
      <Image
        src="/bkg-forms.png"
        alt="Fondo Favoritos"
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100">
          <Heart className="w-6 h-6 fill-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#001F58]">Mis Favoritos</h1>
          <p className="text-xs text-slate-500">
            Publicaciones guardadas ({favorites.length})
          </p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="py-20 text-center bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium text-sm">
            Aún no guardaste ninguna publicación en tus favoritos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((fav) => {
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
                  imageUrl={fav.aircraft.images[0]?.url ?? "/placeholder.png"}
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
                  imageUrl={fav.sparePart.images[0]?.url ?? "/placeholder.png"}
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