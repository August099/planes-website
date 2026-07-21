import { prisma } from "@/lib/prisma";
import { AircraftCard } from "@/components/ui/AircraftCard";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AvionesPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const itemsPerPage = 12;
  const skip = (currentPage - 1) * itemsPerPage;

  const [aircrafts, totalAircrafts] = await Promise.all([
    prisma.aircraft.findMany({
      where: { status: "ACTIVE" },
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: itemsPerPage,
      skip: skip,
    }),
    prisma.aircraft.count({
      where: { status: "ACTIVE" },
    }),
  ]);

  const totalPages = Math.ceil(totalAircrafts / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Lógica para calcular qué números de página mostrar
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5; 

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Siempre incluir la primera página
      pages.push(1);

      if (currentPage > 3) pages.push("...");

      // Calcular el rango alrededor de la página actual
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");

      // Siempre incluir la última página
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium mb-6">
        Aviones en venta ({totalAircrafts})
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {aircrafts.map((aircraft) => (
          <AircraftCard
            key={aircraft.id}
            id={aircraft.id}
            title={aircraft.title}
            price={Number(aircraft.price)}
            year={aircraft.year}
            category={aircraft.category}
            totalTimeHours={aircraft.totalTimeHours}
            location={aircraft.location}
            imageUrl={aircraft.images[0]?.url ?? "/placeholder.png"}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8 border-t pt-4 flex-wrap">
          {hasPrevPage ? (
            <Link
              href={`?page=${currentPage - 1}`}
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
                href={`?page=${page}`}
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
              href={`?page=${currentPage + 1}`}
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
    </main>
  );
}
