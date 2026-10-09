"use client";

import Image from "next/image";
import { Plane, Clock, ShieldCheck, Wrench } from "lucide-react";

export default function ComingSoonPage() {
return ( <main className="fixed inset-0 z-50 min-h-screen overflow-y-auto bg-slate-50 isolate flex items-center justify-center px-4 py-12">
{/* Fondo */} <div className="absolute inset-0 -z-20 overflow-hidden"> <Image
       src="/bkg-forms.png"
       alt="Fondo de Ventas Aeronáuticas"
       fill
       priority
       sizes="100vw"
       className="object-cover"
     /> </div>

```
  {/* Capa translúcida */}
  <div className="absolute inset-0 -z-10 bg-slate-50/80 backdrop-blur-md" />

  <div className="container relative z-10 mx-auto max-w-3xl text-center">
    {/* Estado del lanzamiento */}
    <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-[#001F58] shadow-sm sm:text-sm">
      <Clock className="h-4 w-4 animate-pulse text-red-600" />
      <span>Lanzamiento Oficial: Próximo Mes</span>
    </div>

    {/* Tarjeta principal */}
    <section className="rounded-3xl border border-[#001F58]/10 bg-white/90 p-8 shadow-2xl backdrop-blur-sm sm:p-12">
      {/* Icono central */}
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-[#001F58] text-white shadow-md">
        <Plane className="h-10 w-10 -rotate-12" />
      </div>

      <h1 className="mb-4 font-heading text-3xl font-bold tracking-tight text-[#001F58] sm:text-5xl">
        Estamos preparando algo grande
      </h1>

      <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
        Nuestra plataforma especializada en la compra, venta y publicación
        de <strong>aeronaves y repuestos</strong> está en sus últimos
        detalles de desarrollo.
      </p>

      {/* Características */}
      <div className="grid grid-cols-1 gap-4 border-t border-slate-200/80 pt-8 text-left sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <Plane className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <h2 className="text-xs font-bold uppercase text-[#001F58]">
              Aeronaves
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Publicaciones con ficha técnica detallada.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <h2 className="text-xs font-bold uppercase text-[#001F58]">
              Repuestos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Categorización precisa hasta el último nivel técnico.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <h2 className="text-xs font-bold uppercase text-[#001F58]">
              Trato Directo
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Conexión directa entre compradores y vendedores.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Pie de página */}
    <footer className="mt-8 text-xs font-medium text-slate-500">
      © {new Date().getFullYear()} Ventas Aeronáuticas. Todos los derechos
      reservados.
    </footer>
  </div>
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

