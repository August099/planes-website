import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { SparePartCard } from "@/components/ui/SparePartCard";
import { SparePartFiltersWrapper } from "@/components/ui/SparePartFiltersWrapper";
import Link from "next/link";
import { Prisma } from "@prisma/client";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function SparePartsPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const itemsPerPage = 20;
  const skip = (currentPage - 1) * itemsPerPage;

  const user = await getCurrentUser();

  // ==========================================
  // Leer TODOS los params que el sidebar actual manda
  // ==========================================
  const categoryParam = toArray(params.category);
  const conditionParam = toArray(params.condition);
  const currency = params.currency === "ARS" ? "ARS" : "USD";
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;

  function isDescendantOf(
    categories: { id: string; parentId: string | null }[],
    candidateId: string,
    ancestorId: string
  ): boolean {
    let current = categories.find((c) => c.id === candidateId);
    while (current?.parentId) {
      if (current.parentId === ancestorId) return true;
      current = categories.find((c) => c.id === current!.parentId);
    }
    return false;
  }

  // De todos los ids tildados, nos quedamos solo con los que NO tienen
  // ningún otro tildado como descendiente — es decir, el más específico por rama
  function getLeafSelectedIds(
    categories: { id: string; parentId: string | null }[],
    selectedIds: string[]
  ): string[] {
    return selectedIds.filter((id) => {
      const hasSelectedDescendant = selectedIds.some(
        (otherId) => otherId !== id && isDescendantOf(categories, otherId, id)
      );
      return !hasSelectedDescendant;
    });
  }

  // ==========================================
  // Armar el where
  // ==========================================
  const where: Prisma.SparePartWhereInput = {
    status: "ACTIVE",
    inPesos: currency === "ARS", // moneda: filtro real, siempre aplicado
  };

  // Precio
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined && !isNaN(minPrice)) where.price.gte = minPrice;
    if (maxPrice !== undefined && !isNaN(maxPrice)) where.price.lte = maxPrice;
  }

  // Condición
  if (conditionParam.length > 0) {
    where.condition = { in: conditionParam as any };
  }

  if (categoryParam.length > 0) {
    const allCategories = await prisma.category.findMany({
      select: { id: true, parentId: true },
    });

    function getDescendantIds(id: string): string[] {
      const children = allCategories.filter((c) => c.parentId === id);
      return [id, ...children.flatMap((c) => getDescendantIds(c.id))];
    }

    // Primero filtramos a solo los ids "hoja" de la selección
    const leafSelectedIds = getLeafSelectedIds(allCategories, categoryParam);

    // Y recién sobre esos armamos la lista final (con sus propios descendientes, si tuvieran)
    const allTargetCategoryIds = Array.from(
      new Set(leafSelectedIds.flatMap((id) => getDescendantIds(id)))
    );

    where.categoryId = { in: allTargetCategoryIds };
  }

  // ==========================================
  // Ejecución paralela: listado + total + favoritos
  // ==========================================
  const [spareParts, totalSpareParts, userFavorites] = await Promise.all([
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
    user
      ? prisma.favorite.findMany({
          where: { userId: user.id, sparePartId: { not: null } },
          select: { sparePartId: true },
        })
      : Promise.resolve([]),
  ]);

  const userFavIds = new Set(userFavorites.map((f) => f.sparePartId));

  const totalPages = Math.ceil(totalSpareParts / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Helper de paginación, preservando TODOS los filtros reales
  const createPageUrl = (pageNumber: number) => {
    const urlParams = new URLSearchParams();

    categoryParam.forEach((c) => urlParams.append("category", c));
    conditionParam.forEach((c) => urlParams.append("condition", c));
    urlParams.set("currency", currency);
    if (params.minPrice) urlParams.set("minPrice", String(params.minPrice));
    if (params.maxPrice) urlParams.set("maxPrice", String(params.maxPrice));

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
                  inPesos={sparePart.inPesos}
                  price={sparePart.price ? Number(sparePart.price) : null}
                  category={sparePart.category}
                  city={sparePart.city}
                  province={sparePart.province}
                  imageUrl={sparePart.images[0]?.url ?? "/placeholder.png"}
                  isFavoriteInitial={userFavIds.has(sparePart.id)}
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
                        : "hover:bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {page}
                  </Link>
                )
              )}

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