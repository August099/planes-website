import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { provinceBySlug } from "@/lib/provinces";
import { getSparePartCategories } from "@/lib/cached-data";
import { getCurrentUser } from "@/lib/auth-helpers";
import { SparePartCard } from "@/components/ui/SparePartCard";
import { SparePartFiltersWrapper } from "@/components/ui/SparePartFiltersWrapper";
import { SortDropdown } from "@/components/ui/SortDropdown";
import Link from "next/link";
import { Prisma, SparepartCondition } from "@prisma/client";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { featuredFirstPage, getFeaturedSellerIds } from "@/lib/featured";
import { PageHeader } from "@/components/ui/PageHeader";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// Canonical: los filtros no generan URLs indexables propias (apuntan a /spareparts);
// sin filtros, cada página del listado es su propia URL (/spareparts?page=N).
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const hasFilters = Object.keys(params).some((key) => key !== "page");
  const canonical = !hasFilters && page > 1 ? `/spareparts?page=${page}` : "/spareparts";

  return {
    title: "Repuestos aeronáuticos en venta",
    description: "Repuestos, motores, hélices, aviónica y accesorios aeronáuticos en venta en Argentina. Buscá por categoría o número de parte.",
    alternates: { canonical },
  };
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
  // Solo valores del enum: antes "?condition=X" llegaba a Prisma y la página daba error 500.
  const conditionParam = toArray(params.condition).filter((c): c is SparepartCondition =>
    (Object.values(SparepartCondition) as string[]).includes(c)
  );
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  // Moneda (VA-77): sin "currency" se ven todas (así los conteos por provincia de la Home coinciden
  // con el listado). Con rango de precio hace falta una moneda: si no viene, USD.
  const currencyParam = params.currency === "ARS" ? "ARS" : params.currency === "USD" ? "USD" : null;
  const currency = currencyParam ?? (minPrice !== undefined || maxPrice !== undefined ? "USD" : null);
  const province = provinceBySlug(typeof params.province === "string" ? params.province : null);

  // Orden (VA-45): mismas opciones que /aircraft (SortDropdown).
  const sort = typeof params.sort === "string" ? params.sort : "recent";
  const orderByMap: Record<string, Prisma.SparePartOrderByWithRelationInput> = {
    price_desc: { price: "desc" },
    price_asc: { price: "asc" },
    recent: { lastPublishedAt: "desc" }, // VA-167: alta o republicación
    oldest: { createdAt: "asc" },
    az: { title: "asc" },
    za: { title: "desc" },
  };
  const orderBy = orderByMap[sort] ?? orderByMap.recent;

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

  const where: Prisma.SparePartWhereInput = {
    ...activeListingWhere(),
    ...(currency && { inPesos: currency === "ARS" }),
    ...(province && { province: province.name }),
  };

  // Precio
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined && !isNaN(minPrice)) where.price.gte = minPrice;
    if (maxPrice !== undefined && !isNaN(maxPrice)) where.price.lte = maxPrice;
  }

  // Condición
  if (conditionParam.length > 0) {
    where.condition = { in: conditionParam };
  }

  if (categoryParam.length > 0) {
    const allCategories = await getSparePartCategories();

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
  // VA-168: en el orden por defecto, primero los avisos de cuentas con destacadas (Pro, Broker y admins);
  // con otro orden, se respeta ese orden sin mezclar.
  const featuredIds = sort === "recent" ? await getFeaturedSellerIds() : [];
  const findPage = (sellerId: { in: string[] } | { notIn: string[] }, pageSkip: number, pageTake: number) =>
    prisma.sparePart.findMany({
      where: { ...where, sellerId },
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        category: true,
      },
      orderBy,
      skip: pageSkip,
      take: pageTake,
    });
  const [spareParts, totalSpareParts, userFavorites] = await Promise.all([
    featuredFirstPage(featuredIds, skip, itemsPerPage, findPage, () => prisma.sparePart.count({ where: { ...where, sellerId: { in: featuredIds } } })),
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
    if (currency) urlParams.set("currency", currency);
    if (province) urlParams.set("province", province.slug);
    if (params.minPrice) urlParams.set("minPrice", String(params.minPrice));
    if (params.maxPrice) urlParams.set("maxPrice", String(params.maxPrice));

    if (sort !== "recent") urlParams.set("sort", sort);
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
      <PageBackground page="spareparts" />
      <Breadcrumbs items={[{ label: "Repuestos" }]} className="-mt-4 mb-2" />
      {/* Misma disposición que /aircraft (VA-45): en celular, "Filtros" (panel lateral) y "Ordenar"
          lado a lado; desde lg, barra lateral + grilla. */}
      <PageHeader compact variant="desktop-banner" routeId="va-route-spareparts" title="Repuestos en venta" count={totalSpareParts} className="mb-6" aside={<div className="hidden lg:block"><SortDropdown /></div>} />
      <section className="flex flex-col lg:flex-row items-start gap-6">
        {/* 26/10: en celular la barra Filtros | Ordenar queda pegada arriba (debajo del header cuando aparece). */}
        <div className="va-list-toolbar w-full flex lg:block items-center gap-3 lg:w-auto shrink-0">
          <div className="flex-1 lg:flex-none lg:w-72">
            <SparePartFiltersWrapper />
          </div>
          <div className="flex-1 lg:hidden w-full *:w-full">
            <SortDropdown />
          </div>
        </div>

        <div className="w-full flex-1 min-w-0">
          {spareParts.length === 0 ? (
            <div className="va-plate p-12 text-center">
              <p className="text-slate-500 font-medium">
                No se encontraron repuestos con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
                  imageUrl={sparePart.images[0]?.url ?? PLACEHOLDER_IMAGE}
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