
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getAircraftTaxonomy, getSparePartCategories } from "@/lib/cached-data";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { SellerCta } from "@/components/ui/SellerCta";
import { SparePartCategoriesCarousel } from "@/components/ui/SparePartCategoriesCarousel";
import { FeaturedAircraftCarousel } from "@/components/ui/FeaturedAircraftCarousel";
import { LatestAircraft, ListingItem } from "@/components/ui/LatestListings";
import { HeroBanner } from "@/components/ui/hero-banner";
import { LaunchPromoBanner } from "@/components/ui/LaunchPromoBanner";
import HomeServicesCards from "@/components/ui/HomeServiceCards";
import { FeaturedBrands } from "@/components/ui/FeaturedBrands";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationAndWebsiteJsonLd } from "@/lib/structured-data";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";
import { ProvinceExplorer, type ProvinceCounts } from "@/components/ui/ProvinceExplorer";
import { provinceByName } from "@/lib/provinces";

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
    aircraftByProvince,
    sparePartsByProvince,
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
    // VA-77: avisos visibles por provincia (mismo criterio que /planes y /spareparts). Dinámico,
    // como el resto de la Home, para que coincida siempre con los listados.
    prisma.aircraft.groupBy({ by: ["province"], where: activeListingWhere(), _count: { _all: true } }),
    prisma.sparePart.groupBy({ by: ["province"], where: activeListingWhere(), _count: { _all: true } }),
  ]);

  // { slug: { aircraft, parts } }. Las provincias que no son una de las 24 canónicas no cuentan
  // (los listados filtran por igualdad exacta); ver scripts/normalize-provinces.ts.
  const provinceCounts: ProvinceCounts = {};
  const addCount = (province: string | null, field: "aircraft" | "parts", n: number) => {
    const slug = provinceByName(province)?.slug;
    if (!slug) return;
    provinceCounts[slug] ??= { aircraft: 0, parts: 0 };
    provinceCounts[slug][field] += n;
  };
  aircraftByProvince.forEach((g) => addCount(g.province, "aircraft", g._count._all));
  sparePartsByProvince.forEach((g) => addCount(g.province, "parts", g._count._all));

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

        {/* VA-47: invitación a registrarse, solo para visitantes sin cuenta */}
        {!user && <LaunchPromoBanner />}

        <FeaturedBrands brands={featuredBrandsFromDb} />

        <main className="container mx-auto px-4 py-8 space-y-12">
          <FeaturedAircraftCarousel aircrafts={formattedFeaturedAircrafts} />

          <LatestAircraft items={combinedLatestListings} />

          <ProvinceExplorer counts={provinceCounts} />

          <SparePartCategoriesCarousel categories={sparePartCategories} />
        </main>

        <SellerCta />
        <HowItWorks />
        <HomeServicesCards />
      </div>
    </>
  );
} 


