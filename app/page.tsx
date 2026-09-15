import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { SellerCta } from "@/components/ui/SellerCta";
import { TrustBlock } from "@/components/ui/TrustBlock";
import { SparePartCategoriesCarousel } from "@/components/ui/SparePartCategoriesCarousel";
import { FeaturedAircraftCarousel } from "@/components/ui/FeaturedAircraftCarousel";
import { LatestAircraft, ListingItem } from "@/components/ui/LatestListings";
import { HeroBanner } from "@/components/ui/hero-banner";
import HomeServicesCards from "@/components/ui/HomeServiceCards";
import { FeaturedBrands } from "@/components/ui/FeaturedBrands";

export default async function HomePage() {
  // 1. Obtener usuario actual
  const user = await getCurrentUser();

  // 2. Traer datos y favoritos en paralelo
  const [
    featuredAircraftsFromDb,
    latestAircraftsFromDb,
    latestSparePartsFromDb,
    sparePartCategories,
    featuredBrandsFromDb,
    userFavorites,
  ] = await Promise.all([
    prisma.aircraft.findMany({
      where: { status: "ACTIVE" },
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        category: true,
        brand: true,
        model: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    // Últimas Aeronaves
    prisma.aircraft.findMany({
      where: { status: "ACTIVE" },
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        category: true,
        brand: true,
        model: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // Últimos Repuestos
    prisma.sparePart.findMany({
      where: { status: "ACTIVE" },
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        category: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // Categorías de Repuestos
    prisma.category.findMany({
      where: { parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
      },
      orderBy: { name: "asc" },
    }),
    // Marcas de Aeronaves con Logo
    prisma.aircraftBrand.findMany({
      where: {
        logoUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
      },
      orderBy: { name: "asc" },
    }),
    // Favoritos del usuario logueado
    user
      ? prisma.favorite.findMany({
          where: { userId: user.id },
          select: { aircraftId: true, sparePartId: true },
        })
      : Promise.resolve([]),
  ]);

  // Sets de búsqueda rápida para los IDs favoritos
  const userFavAircraftIds = new Set(
    userFavorites.filter((f) => f.aircraftId).map((f) => f.aircraftId)
  );
  const userFavSparePartIds = new Set(
    userFavorites.filter((f) => f.sparePartId).map((f) => f.sparePartId)
  );

  // Formateo para Aeronaves Destacadas (OverlayCard)
  const formattedFeaturedAircrafts = featuredAircraftsFromDb.map((aircraft) => ({
    id: aircraft.id,
    title: aircraft.title,
    brand: aircraft.brand?.name ?? aircraft.customBrand ?? "",
    model: aircraft.model?.name ?? aircraft.customModel ?? "",
    price: aircraft.price ? Number(aircraft.price) : null,
    year: aircraft.year,
    category: aircraft.category
      ? { id: aircraft.category.id, name: aircraft.category.name }
      : null,
    totalTimeHours: aircraft.totalTimeHours,
    city: aircraft.city,
    province: aircraft.province,
    imageUrl: aircraft.images[0]?.url ?? "/placeholder.png",
    isFavoriteInitial: userFavAircraftIds.has(aircraft.id),
  }));

  // Mapear aeronaves a ListingItem
  const aircraftListings: ListingItem[] = latestAircraftsFromDb.map(
    (aircraft) => ({
      type: "AIRCRAFT",
      id: aircraft.id,
      title: aircraft.title,
      price: aircraft.price ? Number(aircraft.price) : null,
      year: aircraft.year,
      category: aircraft.category
        ? { id: aircraft.category.id, name: aircraft.category.name }
        : null,
      totalTimeHours: aircraft.totalTimeHours,
      city: aircraft.city,
      province: aircraft.province,
      imageUrl: aircraft.images[0]?.url ?? "/placeholder.png",
      createdAt: aircraft.createdAt,
      isFavoriteInitial: userFavAircraftIds.has(aircraft.id),
    })
  );

  // Mapear repuestos a ListingItem (Asegurando inPesos)
  const sparePartListings: ListingItem[] = latestSparePartsFromDb.map(
    (part) => ({
      type: "SPARE_PART",
      id: part.id,
      title: part.title,
      price: part.price ? Number(part.price) : null,
      category: part.category
        ? { id: part.category.id, name: part.category.name }
        : null,
      city: part.city,
      province: part.province,
      inPesos: part.inPesos,
      imageUrl: part.images[0]?.url ?? "/placeholder.png",
      createdAt: part.createdAt,
      isFavoriteInitial: userFavSparePartIds.has(part.id),
    })
  );

  // Combinar y ordenar de más reciente a más antiguo
  const combinedLatestListings = [...aircraftListings, ...sparePartListings]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 10);

  return (
    <>
      <div className="bg-[#FAF5F5] min-h-screen">
        <HeroBanner />

        {/* MARQUESINA DE MARCAS */}
        <FeaturedBrands brands={featuredBrandsFromDb} />

        <main className="container mx-auto px-4 py-8 space-y-12">
          {/* AERONAVES DESTACADAS */}
          <FeaturedAircraftCarousel aircrafts={formattedFeaturedAircrafts} />

          {/* ÚLTIMAS PUBLICACIONES */}
          <LatestAircraft items={combinedLatestListings} />

          {/* CATEGORÍAS DE REPUESTOS */}
          <SparePartCategoriesCarousel categories={sparePartCategories} />
        </main>

        {/* SECCIONES FINALES */}
        <SellerCta />
        <HowItWorks />
        <HomeServicesCards />
      </div>
    </>
  );
}