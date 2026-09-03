import { prisma } from "@/lib/prisma";
import { SparePartCard } from "@/components/ui/SparePartCard";
import { SparePartFiltersWrapper } from "@/components/ui/SparePartFiltersWrapper";
import Link from "next/link";
import { Prisma } from "@prisma/client";

interface Props {
  // Índice abierto porque los filtros dinámicos (filter_marca, filter_voltaje_min, etc.)
  // no se pueden listar de antemano como propiedades fijas
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Normaliza un searchParam que puede venir como string, string[] o undefined
function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function SparePartsPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const itemsPerPage = 20;
  const skip = (currentPage - 1) * itemsPerPage;

  const categoryParam = toArray(params.category);
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;

  // ==========================================
  // Filtro de Precio
  // ==========================================
  const where: Prisma.SparePartWhereInput = {
    status: "ACTIVE",
  };

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined && !isNaN(minPrice)) where.price.gte = minPrice;
    if (maxPrice !== undefined && !isNaN(maxPrice)) where.price.lte = maxPrice;
  }

  // ==========================================
  // Filtro de Categoría (incluye subcategorías hijas)
  // ==========================================
  let allTargetCategoryIds: string[] = [];

  if (categoryParam.length > 0) {
    const allCategories = await prisma.category.findMany({
      select: { id: true, parentId: true },
    });

    function getDescendantIds(id: string): string[] {
      const children = allCategories.filter((c) => c.parentId === id);
      return [id, ...children.flatMap((c) => getDescendantIds(c.id))];
    }

    allTargetCategoryIds = Array.from(
      new Set(categoryParam.flatMap((id) => getDescendantIds(id)))
    );

    where.categoryId = { in: allTargetCategoryIds };
  }

  // ==========================================
  // Filtros dinámicos (filter_<slug> y filter_<slug>_min/_max)
  // ==========================================
  const dynamicFilterEntries = Object.entries(params).filter(([key]) => key.startsWith("filter_"));
  const filterConditions: Prisma.SparePartWhereInput[] = [];
  const rangeSlugsSeen = new Set<string>();

  for (const [key, value] of dynamicFilterEntries) {
    // Rangos numéricos: se procesan aparte, más abajo, para juntar _min y _max en una sola condición
    if (key.endsWith("_min") || key.endsWith("_max")) {
      const slug = key.replace(/_min$|_max$/, "").replace("filter_", "");
      if (rangeSlugsSeen.has(slug)) continue;
      rangeSlugsSeen.add(slug);

      const min = toArray(params[`filter_${slug}_min`])[0];
      const max = toArray(params[`filter_${slug}_max`])[0];
      if (!min && !max) continue;

      filterConditions.push({
        filterValues: {
          some: {
            filter: { slug },
            ...(min && { valueNumber: { gte: Number(min) } }),
            ...(max && { valueNumber: { lte: Number(max) } }),
          },
        },
      });
      continue;
    }

    // Filtros de selección (SELECT / MULTI_SELECT) y BOOLEAN
    const values = toArray(value);
    if (values.length === 0) continue;

    const slug = key.replace("filter_", "");
    filterConditions.push({
      filterValues: {
        some: {
          filter: { slug },
          OR: [{ optionId: { in: values } }, { valueString: { in: values } }],
        },
      },
    });
  }

  if (filterConditions.length > 0) {
    where.AND = filterConditions;
  }

  // ==========================================
  // Ejecución paralela: listado + total + datos para el sidebar
  // ==========================================
  const [spareParts, totalSpareParts] = await Promise.all([
    prisma.sparePart.findMany({
      where,
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        category: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: itemsPerPage,
    }),
    prisma.sparePart.count({ where }),
  ]);

  const totalPages = Math.ceil(totalSpareParts / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Helper para generar URLs de paginación manteniendo TODOS los filtros activos
  const createPageUrl = (pageNumber: number) => {
    const urlParams = new URLSearchParams();

    categoryParam.forEach((c) => urlParams.append("category", c));
    if (params.minPrice) urlParams.set("minPrice", String(params.minPrice));
    if (params.maxPrice) urlParams.set("maxPrice", String(params.maxPrice));

    dynamicFilterEntries.forEach(([key, value]) => {
      toArray(value).forEach((v) => urlParams.append(key, v));
    });

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
    <main className="mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium mb-6">
        Repuestos en venta ({totalSpareParts})
      </h1>
      <section className="flex items-start gap-6">
        <SparePartFiltersWrapper />

        <div className="w-full lg:w-3/4">
          {spareParts.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl bg-neutral-50/50">
              <p className="text-slate-500 font-medium">
                No se encontraron repuestos con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {spareParts.map((sparePart) => (
                <SparePartCard
                  key={sparePart.id}
                  id={sparePart.id}
                  title={sparePart.title}
                  price={sparePart.price ? Number(sparePart.price) : null}
                  category={sparePart.category}
                  city={sparePart.city}
                  province={sparePart.province}
                  imageUrl={sparePart.images[0]?.url ?? "/placeholder.png"}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 border-t pt-4 flex-wrap">
              {hasPrevPage ? (
                <Link
                  href={createPageUrl(currentPage - 1)}
                  className="px-3 py-2 border rounded-md hover:bg-neutral-100 text-sm font-medium transition-colors"
                >
                  Anterior
                </Link>
              ) : (
                <span className="px-3 py-2 border rounded-md text-neutral-400 text-sm font-medium cursor-not-allowed bg-neutral-50">
                  Anterior
                </span>
              )}

              {getPageNumbers().map((page, index) => {
                if (page === "...") {
                  return (
                    <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-neutral-400 font-medium">
                      ...
                    </span>
                  );
                }

                const isCurrent = page === currentPage;

                return (
                  <Link
                    key={`page-${page}`}
                    href={createPageUrl(Number(page))}
                    className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      isCurrent
                        ? "bg-neutral-900 text-white border-neutral-900 pointer-events-none"
                        : "hover:bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {page}
                  </Link>
                );
              })}

              {hasNextPage ? (
                <Link
                  href={createPageUrl(currentPage + 1)}
                  className="px-3 py-2 border rounded-md hover:bg-neutral-100 text-sm font-medium transition-colors"
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