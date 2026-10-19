import Image from "next/image";

// Hasta el lanzamiento (2/11), main muestra solo esta pantalla: el resto de las rutas redirige acá
// (next.config.ts). La Home real queda comentada abajo.
export default function ComingSoonPage() {
  return (
    <main className="fixed inset-0 z-50 isolate flex flex-col items-center justify-center gap-8 overflow-hidden bg-[#001F58] px-6 text-center">
      <Image
        src="/bkg-home.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 scale-110 object-cover blur-[6px]"
      />
      <div className="absolute inset-0 -z-10 bg-[#001F58]/45" />

      <h1 className="font-heading text-7xl font-bold tracking-tight text-white drop-shadow-lg sm:text-9xl">2/11</h1>
      <Image
        src="/logo-full.png"
        alt="Ventas Aeronáuticas"
        width={1842}
        height={128}
        priority
        className="h-auto w-full max-w-[min(80vw,560px)] drop-shadow-lg"
      />
    </main>
  );
}





{/*
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getAircraftTaxonomy, getSparePartCategories } from "@/lib/cached-data";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { SellerCta } from "@/components/ui/SellerCta";
import { TrustBlock } from "@/components/ui/TrustBlock";
import { SparePartCategoriesCarousel } from "@/components/ui/SparePartCategoriesCarousel";
import { FeaturedAircraftCarousel } from "@/components/ui/FeaturedAircraftCarousel";
import { LatestAircraft, ListingItem } from "@/components/ui/LatestListings";
import { HeroBanner } from "@/components/ui/hero-banner";
import HomeServicesCards from "@/components/ui/HomeServiceCards";
import { FeaturedBrands } from "@/components/ui/FeaturedBrands";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationAndWebsiteJsonLd } from "@/lib/structured-data";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";

// Título y descripción salen del layout; acá solo el canonical.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // 1. Obtener usuario actual
  const user = await getCurrentUser();

  // 2. Traer datos y favoritos en paralelo
  const [
    featuredAircraftsFromDb,
    latestSparePartsFromDb,
    sparePartCategories,
    featuredBrandsFromDb,
    userFavorites,
  ] = await Promise.all([
    prisma.aircraft.findMany({
      where: activeListingWhere(),
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        category: true,
        brand: true,
        model: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    // Últimos Repuestos
    prisma.sparePart.findMany({
      where: activeListingWhere(),
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        category: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // Categorías raíz de repuestos y marcas con logo: salen de la taxonomía cacheada (VA-13)
    getSparePartCategories().then((all) =>
      all.filter((c) => c.parentId === null).map(({ id, name, slug, icon }) => ({ id, name, slug, icon }))
    ),
    getAircraftTaxonomy().then(({ brands }) =>
      brands.filter((b) => b.logoUrl !== null).map(({ id, name, logoUrl }) => ({ id, name, logoUrl }))
    ),
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
    imageUrl: aircraft.images[0]?.url ?? PLACEHOLDER_IMAGE,
    isFavoriteInitial: userFavAircraftIds.has(aircraft.id),
  }));

  // Mapear aeronaves a ListingItem. "Últimas aeronaves" son las 6 primeras de la misma
  // consulta de destacadas (antes eran dos queries idénticas, VA-13).
  const aircraftListings: ListingItem[] = featuredAircraftsFromDb.slice(0, 6).map(
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
      imageUrl: aircraft.images[0]?.url ?? PLACEHOLDER_IMAGE,
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
      imageUrl: part.images[0]?.url ?? PLACEHOLDER_IMAGE,
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
      <JsonLd data={organizationAndWebsiteJsonLd()} />
      <div className="bg-[#FAF5F5] min-h-screen">
        <HeroBanner />

        <FeaturedBrands brands={featuredBrandsFromDb} />

        <main className="container mx-auto px-4 py-8 space-y-12">
          <FeaturedAircraftCarousel aircrafts={formattedFeaturedAircrafts} />

          <LatestAircraft items={combinedLatestListings} />

          <SparePartCategoriesCarousel categories={sparePartCategories} />
        </main>

        <SellerCta />
        <HowItWorks />
        <HomeServicesCards />
      </div>
    </>
  );
} 
  */}

