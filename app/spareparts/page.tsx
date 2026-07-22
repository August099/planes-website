import { prisma } from "@/lib/prisma";
import { SparePartCard } from "@/components/ui/SparePartCard";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function SparePartsPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const itemsPerPage = 12;
  const skip = (currentPage - 1) * itemsPerPage;

  const [spareParts, totalSpareParts] = await Promise.all([
    prisma.sparePart.findMany({
      where: { status: "ACTIVE" },
      include: { images: { orderBy: { order: "asc" }, take: 1 } }, // 👈 Cambiado 'images' a 'SparePartImage'
      orderBy: { createdAt: "desc" },
      take: itemsPerPage,
      skip: skip,
    }),
    prisma.sparePart.count({
      where: { status: "ACTIVE" },
    }),
  ]);

  const totalPages = Math.ceil(totalSpareParts / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

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
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium mb-6">
        Repuestos en venta ({totalSpareParts})
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {spareParts.map((sparePart) => (
          <SparePartCard
            key={sparePart.id}
            id={sparePart.id}
            title={sparePart.title}
            price={sparePart.price ? Number(sparePart.price) : null}
            priceOnRequest={sparePart.priceOnRequest}
            category={sparePart.category}
            condition={sparePart.condition}
            city={sparePart.city}
            province={sparePart.province}
            imageUrl={sparePart.images[0]?.url ?? "/placeholder.png"} // 👈 Cambiado 'images' a 'SparePartImage'
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