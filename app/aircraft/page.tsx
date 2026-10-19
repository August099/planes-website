import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { provinceBySlug } from "@/lib/provinces";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getAircraftTaxonomy } from "@/lib/cached-data";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SortDropdown } from "@/components/ui/SortDropdown";
import { AircraftFiltersWrapper } from "@/components/ui/AircraftFiltersWrapper";
import { AircraftCondition, Prisma, UserType } from "@prisma/client";
import Link from "next/link";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// Canonical: los filtros no generan URLs indexables propias (apuntan a /aircraft);
// sin filtros, cada página del listado es su propia URL (/aircraft?page=N).
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const hasFilters = Object.keys(params).some((key) => key !== "page");
  const canonical = !hasFilters && page > 1 ? `/aircraft?page=${page}` : "/aircraft";

  return {
    title: "Aviones en venta en Argentina",
    description: "Aviones, helicópteros y aeronaves agrícolas en venta en Argentina. Filtrá por marca, modelo, año, horas y precio, y contactá directo con el vendedor.",
    alternates: { canonical },
  };
}

export default async function AircraftListPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const itemsPerPage = 21;
  const skip = (currentPage - 1) * itemsPerPage;

  const user = await getCurrentUser();

  const categoryIds = toArray(params.category);
  const brandIds = toArray(params.brand);
  const modelIds = toArray(params.model);
  const subModelIds = toArray(params.subModel);
  // Solo valores del enum: antes "?condition=X" llegaba a Prisma y la página daba error 500.
  const conditions = toArray(params.condition).filter((c): c is AircraftCondition =>
    (Object.values(AircraftCondition) as string[]).includes(c)
  );
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  // VA-45: año desde-hasta y tipo de vendedor ("Publica"). Valores inválidos se ignoran.
  const toInt = (v: string | string[] | undefined) => {
    const n = typeof v === "string" ? Number.parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : undefined;
  };
  const minYear = toInt(params.minYear);
  const maxYear = toInt(params.maxYear);
  const sellerTypes = toArray(params.sellerType).filter((t): t is UserType => (Object.values(UserType) as string[]).includes(t));
  const financing = params.financing === "true";
  const trade = params.trade === "true";
  const rent = params.rent === "true";
  // VA-77: provincia por slug, comparada con el nombre canónico. Un slug desconocido se ignora.
  const province = provinceBySlug(typeof params.province === "string" ? params.province : null);

  const sort = (params.sort as string) ?? "recent";

  const orderByMap: Record<string, Prisma.AircraftOrderByWithRelationInput> = {
    price_desc: { price: "desc" },
    price_asc: { price: "asc" },
    recent: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
    az: { title: "asc" },
    za: { title: "desc" },
  };

  const orderBy = orderByMap[sort] ?? orderByMap.recent;

  const whereClause: Prisma.AircraftWhereInput = {
    ...activeListingWhere(),
    ...(categoryIds.length > 0 && { categoryId: { in: categoryIds } }),
    ...(brandIds.length > 0 && { brandId: { in: brandIds } }),
    ...(modelIds.length > 0 && { modelId: { in: modelIds } }),
    ...(subModelIds.length > 0 && { subModelId: { in: subModelIds } }),
    ...(conditions.length > 0 && { condition: { in: conditions } }),
    ...((minYear !== undefined || maxYear !== undefined) && {
      year: {
        ...(minYear !== undefined && { gte: minYear }),
        ...(maxYear !== undefined && { lte: maxYear }),
      },
    }),
    ...(sellerTypes.length > 0 && { seller: { userType: { in: sellerTypes } } }),
    ...(financing && { financing: true }),
    ...(trade && { trade: true }),
    ...(rent && { rent: true }),
    ...(province && { province: province.name }),
    ...((minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    }),
  };

  const [aircrafts, totalAircrafts, { categories, brands }, userFavorites, inUse] = await Promise.all([
    prisma.aircraft.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        // El carrusel de la card muestra hasta 5 (antes se traían todas, VA-13).
        images: { orderBy: { order: "asc" }, take: 5 },
      },
      orderBy,
      skip,
      take: itemsPerPage,
    }),
    prisma.aircraft.count({ where: whereClause }),
    // Taxonomía cacheada (VA-13)
    getAircraftTaxonomy(),
    user
      ? prisma.favorite.findMany({
          where: { userId: user.id, aircraftId: { not: null } },
          select: { aircraftId: true },
        })
      : Promise.resolve([]),
    // VA-74: marcas, modelos y variantes con avisos activos (para no mandar al filtro toda la taxonomía).
    prisma.aircraft.findMany({
      where: activeListingWhere(),
      select: { brandId: true, modelId: true, subModelId: true, categoryId: true },
      distinct: ["brandId", "modelId", "subModelId", "categoryId"],
    }),
  ]);

  // Filtro: solo lo que tiene publicaciones activas, más lo que ya esté aplicado en la URL.
  const usedIds = new Set<string>([...brandIds, ...modelIds, ...subModelIds]);
  // VA-165: categorías de los avisos reales de cada marca y modelo (para acotar marcas al elegir una
  // categoría: un modificado aparece en la categoría que eligió el vendedor, no en la recomendada).
  const categoriesOf = new Map<string, Set<string>>();
  const addCategory = (id: string, categoryId: string) => categoriesOf.set(id, (categoriesOf.get(id) ?? new Set()).add(categoryId));
  for (const a of inUse) {
    if (a.brandId) usedIds.add(a.brandId);
    if (a.modelId) usedIds.add(a.modelId);
    if (a.subModelId) usedIds.add(a.subModelId);
    if (a.brandId) addCategory(a.brandId, a.categoryId);
    if (a.modelId) addCategory(a.modelId, a.categoryId);
  }
  const categoryIdsOf = (id: string) => [...(categoriesOf.get(id) ?? [])];
  const filterBrands = brands
    .filter((b) => usedIds.has(b.id))
    .map((b) => ({
      ...b,
      categoryIds: categoryIdsOf(b.id),
      models: b.models
        .filter((m) => usedIds.has(m.id))
        .map((m) => ({ ...m, categoryIds: categoryIdsOf(m.id), variants: m.variants.filter((v) => usedIds.has(v.id)) })),
    }));

  const userFavIds = new Set(userFavorites.map((f) => f.aircraftId));

  const totalPages = Math.ceil(totalAircrafts / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const createPageUrl = (pageNumber: number) => {
    const urlParams = new URLSearchParams();
    categoryIds.forEach((c) => urlParams.append("category", c));
    brandIds.forEach((b) => urlParams.append("brand", b));
    modelIds.forEach((m) => urlParams.append("model", m));
    subModelIds.forEach((s) => urlParams.append("subModel", s));
    conditions.forEach((c) => urlParams.append("condition", c));
    if (minPrice !== undefined) urlParams.set("minPrice", String(minPrice));
    if (maxPrice !== undefined) urlParams.set("maxPrice", String(maxPrice));
    if (minYear !== undefined) urlParams.set("minYear", String(minYear));
    if (maxYear !== undefined) urlParams.set("maxYear", String(maxYear));
    sellerTypes.forEach((t) => urlParams.append("sellerType", t));
    if (financing) urlParams.set("financing", "true");
    if (trade) urlParams.set("trade", "true");
    if (rent) urlParams.set("rent", "true");
    if (province) urlParams.set("province", province.slug);
    urlParams.set("sort", sort);
    urlParams.set("page", pageNumber.toString());
    return `?${urlParams.toString()}`;
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <main className="relative isolate min-h-screen px-4 py-8">
      <PageBackground page="aircraftList" />
      <Breadcrumbs items={[{ label: "Aviones" }]} className="-mt-4 mb-2" />

      {/* Encabezado: Título a la izquierda, Sort (solo Desktop) a la derecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-medium">
          Aviones en venta <span className="text-slate-500 font-normal text-lg">({totalAircrafts})</span>
        </h1>
        <div className="hidden lg:block">
          <SortDropdown />
        </div>
      </div>

      <section className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* Barra móvil simétrica: 50% Filtros | 50% Ordenar */}
        <div className="w-full flex lg:block items-center gap-3 lg:w-auto shrink-0">
          <div className="flex-1 lg:flex-none lg:w-72">
            <AircraftFiltersWrapper categories={categories} brands={filterBrands} />
          </div>
          <div className="flex-1 lg:hidden w-full *:w-full">
            <SortDropdown />
          </div>
        </div>

        <div className="w-full flex-1">
          {aircrafts.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 px-4">
              No se encontraron aeronaves con los criterios de búsqueda seleccionados.
            </div>
          ) : (
            /* Grilla original: 1 por fila en móvil, 2 en sm, 3 en lg/xl */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-8">
              {aircrafts.map((aircraft) => (
                <AircraftCard
                  key={aircraft.id}
                  id={aircraft.id}
                  title={aircraft.title}
                  price={aircraft.price ? Number(aircraft.price) : null}
                  year={aircraft.year}
                  category={aircraft.category}
                  totalTimeHours={aircraft.totalTimeHours}
                  city={aircraft.city}
                  province={aircraft.province}
                  imageUrl={aircraft.images[0]?.url ?? PLACEHOLDER_IMAGE}
                  images={aircraft.images}
                  isFavoriteInitial={userFavIds.has(aircraft.id)}
                />
              ))}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 border-t border-slate-200/80 pt-6 flex-wrap">
              {hasPrevPage ? (
                <Link
                  href={createPageUrl(currentPage - 1)}
                  className="px-3 py-2 border rounded-md hover:bg-neutral-100 text-sm font-medium transition-colors bg-white/80"
                >
                  Anterior
                </Link>
              ) : (
                <span className="px-3 py-2 border rounded-md text-neutral-400 text-sm font-medium cursor-not-allowed bg-neutral-50">
                  Anterior
                </span>
              )}

              {getPageNumbers().map((page, index) =>
                page === "..." ? (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-neutral-400 font-medium">
                    ...
                  </span>
                ) : (
                  <Link
                    key={`page-${page}`}
                    href={createPageUrl(Number(page))}
                    className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      page === currentPage
                        ? "bg-neutral-900 text-white border-neutral-900 pointer-events-none"
                        : "hover:bg-neutral-100 text-neutral-700 bg-white/80"
                    }`}
                  >
                    {page}
                  </Link>
                )
              )}

              {hasNextPage ? (
                <Link
                  href={createPageUrl(currentPage + 1)}
                  className="px-3 py-2 border rounded-md hover:bg-neutral-100 text-sm font-medium transition-colors bg-white/80"
                >
                  Siguiente
                </Link>
              ) : (
                <span className="px-3 py-2 border rounded-md text-neutral-400 text-sm font-medium cursor-not-allowed bg-neutral-50">
                  Siguiente
                </span>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}