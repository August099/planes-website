import { prisma } from "@/lib/prisma";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { PlanesFiltersSidebar } from "@/components/ui/PlanesFiltersSidebar";
// Te lo borré de momento shad
import Link from "next/link";
import Image from "next/image";

interface Props {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    model?: string;
    price?: string;
    page?: string;
  }>;
}

export default async function AvionesPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const itemsPerPage = 20;
  const skip = (currentPage - 1) * itemsPerPage;

  // Construcción dinámica de filtros para la BD
  const whereClause: any = {
    status: "ACTIVE",
  };

  if (params.category) whereClause.categoryId = params.category;
  if (params.brand) whereClause.brandId = params.brand;
  if (params.model) whereClause.modelId = params.model;

  if (params.price) {
    if (params.price === "0-100k") {
      whereClause.price = { lte: 100000 };
    } else if (params.price === "100k-300k") {
      whereClause.price = { gte: 100000, lte: 300000 };
    } else if (params.price === "300k+") {
      whereClause.price = { gte: 300000 };
    }
  }

  const [aircrafts, totalAircrafts] = await Promise.all([
    prisma.aircraft.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: itemsPerPage,
    }),
    prisma.aircraft.count({
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(totalAircrafts / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Helper para preservar parametros en los links de paginación
  const createPageUrl = (pageNumber: number) => {
    const urlParams = new URLSearchParams();
    if (params.category) urlParams.set("category", params.category);
    if (params.brand) urlParams.set("brand", params.brand);
    if (params.model) urlParams.set("model", params.model);
    if (params.price) urlParams.set("price", params.price);
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
    <main className="relative isolate overflow-hidden min-h-screen -mb-16 container mx-auto px-4 py-8">
      <Image
        src="/bkg-forms.png"
        alt="Fondo Formularios"
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <h1 className="text-2xl font-medium mb-6">
        Aviones en venta ({totalAircrafts})
      </h1>

      <section className="flex items-start gap-6">

        <div className="w-full">
          {aircrafts.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200">
              No se encontraron aeronaves con los criterios de búsqueda seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
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

              {getPageNumbers().map((page, index) => {
                if (page === "...") {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-3 py-2 text-sm text-neutral-400 font-medium"
                    >
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
                        : "hover:bg-neutral-100 text-neutral-700 bg-white/80"
                    }`}
                  >
                    {page}
                  </Link>
                );
              })}

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