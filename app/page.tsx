
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { getAircraftTaxonomy, getSparePartCategories } from "@/lib/cached-data";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { GuidesSection } from "@/components/ui/GuidesSection";
import { SellerCta } from "@/components/ui/SellerCta";
import { SparePartCategoriesCarousel } from "@/components/ui/SparePartCategoriesCarousel";
import { FeaturedAircraftCarousel } from "@/components/ui/FeaturedAircraftCarousel";
import { LatestAircraft, ListingItem } from "@/components/ui/LatestListings";
import { HeroBanner } from "@/components/ui/hero-banner";
import { LaunchPromoBanner } from "@/components/ui/LaunchPromoBanner";
import { FavoriteIdsProvider } from "@/components/ui/FavoriteIdsProvider";
import HomeServicesCards from "@/components/ui/HomeServiceCards";
import { FeaturedBrands } from "@/components/ui/FeaturedBrands";
import { AircraftTypesSection } from "@/components/ui/AircraftTypesSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationAndWebsiteJsonLd } from "@/lib/structured-data";
import { FEATURED_AIRCRAFT_POOL, LATEST_AIRCRAFT_COUNT, PLACEHOLDER_IMAGE } from "@/lib/constants";
import { ProvinceExplorer, type ProvinceCounts } from "@/components/ui/ProvinceExplorer";
import { provinceByName } from "@/lib/provinces";
import { BrandSlashes } from "@/components/ui/BrandSlashes";

// Título y descripción salen del layout; acá solo el canonical.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// VA-76: la Home es estática y se regenera cada 5 minutos (y al publicar, editar, renovar o borrar
// un aviso, con revalidatePath("/")). Antes leía la sesión para marcar favoritos y se renderizaba
// en cada visita sin caché; ahora los favoritos los pide el navegador (FavoriteIdsProvider).
export const revalidate = 300;

export default async function HomePage() {
  // Datos en paralelo
  const [
    featuredAircraftsFromDb,
    latestSparePartsFromDb,
    sparePartCategories,
    featuredBrandsFromDb,
    aircraftByProvince,
    sparePartsByProvince,
    aircraftByCategory,
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
      take: FEATURED_AIRCRAFT_POOL,
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
    // VA-77: avisos visibles por provincia (mismo criterio que /planes y /spareparts). Dinámico,
    // como el resto de la Home, para que coincida siempre con los listados.
    prisma.aircraft.groupBy({ by: ["province"], where: activeListingWhere(), _count: { _all: true } }),
    prisma.sparePart.groupBy({ by: ["province"], where: activeListingWhere(), _count: { _all: true } }),
    // VA-86: avisos visibles por categoría de aeronave (mismo criterio que /planes).
    prisma.aircraft.groupBy({ by: ["categoryId"], where: activeListingWhere(), _count: { _all: true } }),
  ]);
  const categoryCounts: Record<string, number> = Object.fromEntries(
    aircraftByCategory.filter((g) => g.categoryId).map((g) => [g.categoryId as string, g._count._all])
  );

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
  }));

  // Mapear aeronaves a ListingItem. "Últimas aeronaves" salen de la misma consulta de
  // destacadas (antes eran dos queries idénticas, VA-13).
  const aircraftListings: ListingItem[] = featuredAircraftsFromDb.slice(0, LATEST_AIRCRAFT_COUNT).map(
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
      {/* VA-79: la Home es una sola pieza. Cuatro zonas con degradés que se continúan (el color con
          que termina una es el color con que empieza la siguiente); estilos en app/globals.css. */}
      <FavoriteIdsProvider>
      <main className="home-theme relative isolate overflow-x-clip">
        {/* Zona 1 · Cielo: hero + marcas + destacadas */}
        <HeroBanner />
        <div className="home-zone home-zone-1">
          <div aria-hidden className="home-zone-bg" />
          {/* VA-47: invitación a registrarse, solo para visitantes sin cuenta (se decide en el navegador) */}
          <LaunchPromoBanner />
          <FeaturedBrands brands={featuredBrandsFromDb} />
          <AircraftTypesSection counts={categoryCounts} />
          <div className="container mx-auto px-4 pb-12">
            <FeaturedAircraftCarousel aircrafts={formattedFeaturedAircrafts} />
          </div>
        </div>

        {/* Zona 2 · Altura: últimas publicaciones + provincias + categorías */}
        <div className="home-zone home-zone-2">
          <div aria-hidden className="home-zone-bg" />
          <div className="container mx-auto px-4 py-8 space-y-16">
            <LatestAircraft items={combinedLatestListings} />
            <ProvinceExplorer counts={provinceCounts} />
            <SparePartCategoriesCarousel categories={sparePartCategories} />
          </div>
        </div>

        {/* Zona 3 · Puente: SellerCta flota mientras el fondo pasa de claro a oscuro */}
        <div className="home-zone home-zone-3 pt-8 pb-20">
          <div aria-hidden className="home-zone-bg" />
          <SellerCta />
        </div>

        {/* Zona 4 · Estratósfera: cómo funciona + guías + servicios; el footer sigue el mismo color */}
        <div className="home-zone home-zone-4 pb-8">
          <div aria-hidden className="home-zone-bg" />
          <BrandSlashes className="-top-6 right-[-4rem] w-72 sm:w-[28rem]" />
          <BrandSlashes className="bottom-24 -left-24 w-64 sm:w-96" />
          <HowItWorks />
          <GuidesSection />
          <HomeServicesCards />
        </div>
      </main>
      </FavoriteIdsProvider>
    </>
  );
} 



