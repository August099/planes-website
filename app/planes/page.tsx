import { prisma } from "@/lib/prisma";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SortDropdown } from "@/components/ui/SortDropdown";
import { AircraftFiltersWrapper } from "@/components/ui/AircraftFiltersWrapper";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Convierte un searchParam que puede venir como string o string[] siempre a array
function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function AvionesPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const itemsPerPage = 21;
  const skip = (currentPage - 1) * itemsPerPage;

  const categoryIds = toArray(params.category);
  const brandIds = toArray(params.brand);
  const modelIds = toArray(params.model);
  const subModelIds = toArray(params.subModel);
  const conditions = toArray(params.condition);
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;

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
    status: "ACTIVE",
    ...(categoryIds.length > 0 && { categoryId: { in: categoryIds } }),
    ...(brandIds.length > 0 && { brandId: { in: brandIds } }),
    ...(modelIds.length > 0 && { modelId: { in: modelIds } }),
    ...(subModelIds.length > 0 && { subModelId: { in: subModelIds } }),
    ...(conditions.length > 0 && { condition: { in: conditions as any } }),
    ...((minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    }),
  };

  const [aircrafts, totalAircrafts, categories, brands] = await Promise.all([
    prisma.aircraft.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
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
  ]);

  const totalPages = Math.ceil(totalAircrafts / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Helper para preservar TODOS los filtros activos al cambiar de página
  const createPageUrl = (pageNumber: number) => {
    const urlParams = new URLSearchParams();
    categoryIds.forEach((c) => urlParams.append("category", c));
    brandIds.forEach((b) => urlParams.append("brand", b));
    modelIds.forEach((m) => urlParams.append("model", m));
    subModelIds.forEach((s) => urlParams.append("subModel", s));
    conditions.forEach((c) => urlParams.append("condition", c));
    if (minPrice !== undefined) urlParams.set("minPrice", String(minPrice));
    if (maxPrice !== undefined) urlParams.set("maxPrice", String(maxPrice));
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
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <Image src="/bkg-forms.png" alt="Fondo Formularios" fill priority className="object-cover" />
      </div>
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium">
          Aviones en venta ({totalAircrafts})
        </h1>
        <SortDropdown />
      </div>

      <section className="flex items-start gap-6">
        <AircraftFiltersWrapper categories={categories} brands={brands} />

        <div className="w-full">
          {aircrafts.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200">
              No se encontraron aeronaves con los criterios de búsqueda seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-6 mb-8">
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
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 border-t pt-4 flex-wrap">
              {hasPrevPage ? (
                <Link href={createPageUrl(currentPage - 1)} className="px-3 py-2 border rounded-md hover:bg-neutral-100 text-sm font-medium transition-colors bg-white/80">
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
                <Link href={createPageUrl(currentPage + 1)} className="px-3 py-2 border rounded-md hover:bg-neutral-100 text-sm font-medium transition-colors bg-white/80">
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