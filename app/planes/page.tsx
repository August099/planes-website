import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SortDropdown } from "@/components/ui/SortDropdown";
import { AircraftFiltersWrapper } from "@/components/ui/AircraftFiltersWrapper";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function AvionesPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const itemsPerPage = 21;
  const skip = (currentPage - 1) * itemsPerPage;

  // 1. Obtener el usuario actual
  const user = await getCurrentUser();

  const categoryIds = toArray(params.category);
  const brandIds = toArray(params.brand);
  const modelIds = toArray(params.model);
  const subModelIds = toArray(params.subModel);
  const conditions = toArray(params.condition);
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const financing = params.financing === "true";
  const trade = params.trade === "true";
  const rent = params.rent === "true";

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
  const now = new Date();

  const whereClause: Prisma.AircraftWhereInput = {
    status: "ACTIVE",
    OR: [
      { listingExpiresAt: { gte: now } },
      { listingExpiresAt: null },
    ],
    ...(categoryIds.length > 0 && { categoryId: { in: categoryIds } }),
    ...(brandIds.length > 0 && { brandId: { in: brandIds } }),
    ...(modelIds.length > 0 && { modelId: { in: modelIds } }),
    ...(subModelIds.length > 0 && { subModelId: { in: subModelIds } }),
    ...(conditions.length > 0 && { condition: { in: conditions as any } }),
    ...(financing && { financing: true }),
    ...(trade && { trade: true }),
    ...(rent && { rent: true }),
    ...((minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    }),
  };

  // 2. Traer los datos en paralelo
  const [aircrafts, totalAircrafts, categories, brands, userFavorites] = await Promise.all([
    prisma.aircraft.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: "asc" } },
      },
      orderBy,
      skip,
      take: itemsPerPage,
    }),
    prisma.aircraft.count({ where: whereClause }),
    prisma.aircraftCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.aircraftBrand.findMany({
      orderBy: { name: "asc" },
      include: {
        models: {
          orderBy: { name: "asc" },
          include: { variants: { orderBy: { name: "asc" } } },
        },
      },
    }),
    user
      ? prisma.favorite.findMany({
          where: { userId: user.id, aircraftId: { not: null } },
          select: { aircraftId: true },
        })
      : Promise.resolve([]),
  ]);

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
    if (financing) urlParams.set("financing", "true");
    if (trade) urlParams.set("trade", "true");
    if (rent) urlParams.set("rent", "true");
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
    <main className="relative isolate min-h-screen px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <Image src="/bkg-forms.png" alt="Fondo Formularios" fill priority className="object-cover" />
      </div>
      <div className="absolute inset-0 -z-10 bg-background/85" />

      {/* Encabezado Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Aviones en venta <span className="text-slate-500 font-normal text-lg">({totalAircrafts})</span>
        </h1>
        <div className="self-end sm:self-auto">
          <SortDropdown />
        </div>
      </div>

      <section className="flex flex-col lg:flex-row items-start gap-6">
        {/* Componente de Filtros (Sidebar en PC / Drawer Modal en Móvil) */}
        <AircraftFiltersWrapper categories={categories} brands={brands} />

        <div className="w-full flex-1">
          {aircrafts.length === 0 ? (
            <div className="py-16 sm:py-20 text-center text-slate-500 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 px-4">
              No se encontraron aeronaves con los criterios de búsqueda seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
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
                  imageUrl={aircraft.images[0]?.url ?? "/placeholder.png"}
                  images={aircraft.images}
                  isFavoriteInitial={userFavIds.has(aircraft.id)}
                />
              ))}
            </div>
          )}

          {/* Paginación Responsive */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-8 border-t border-slate-200/80 pt-6 flex-wrap">
              {hasPrevPage ? (
                <Link
                  href={createPageUrl(currentPage - 1)}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-md hover:bg-neutral-100 text-xs sm:text-sm font-medium transition-colors bg-white/80"
                >
                  Anterior
                </Link>
              ) : (
                <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-md text-neutral-400 text-xs sm:text-sm font-medium cursor-not-allowed bg-neutral-50">
                  Anterior
                </span>
              )}

              {getPageNumbers().map((page, index) =>
                page === "..." ? (
                  <span key={`ellipsis-${index}`} className="px-2 py-1.5 text-xs sm:text-sm text-neutral-400 font-medium">
                    ...
                  </span>
                ) : (
                  <Link
                    key={`page-${page}`}
                    href={createPageUrl(Number(page))}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-md text-xs sm:text-sm font-medium transition-colors ${
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
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-md hover:bg-neutral-100 text-xs sm:text-sm font-medium transition-colors bg-white/80"
                >
                  Siguiente
                </Link>
              ) : (
                <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-md text-neutral-400 text-xs sm:text-sm font-medium cursor-not-allowed bg-neutral-50">
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