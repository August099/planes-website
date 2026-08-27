import { prisma } from "@/lib/prisma";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchResultsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q || "";
  const currentPage = Number(params.page) || 1;
  const itemsPerPage = 20;

  const tokens = query.trim().toLowerCase().split(" ").filter((t) => t.length > 0);

  // El insensitive es la clave pa, algún día nos pasaremos a los GIN pero no ahora
  const aircraftWhere = {
    status: "ACTIVE" as const,
    ...(tokens.length > 0 && {
      AND: tokens.map((token) => ({
        OR: [
          { title: { contains: token, mode: "insensitive" as const } },
          { description: { contains: token, mode: "insensitive" as const } },
          { city: { contains: token, mode: "insensitive" as const } },
          { province: { contains: token, mode: "insensitive" as const } },
          { brand: { name: { contains: token, mode: "insensitive" as const } } },
          { category: { name: { contains: token, mode: "insensitive" as const } } },
          { customBrand: { contains: token, mode: "insensitive" as const } },
          { customModel: { contains: token, mode: "insensitive" as const } },
        ],
      })),
    }),
  };

  const sparePartWhere = {
    status: "ACTIVE" as const,
    ...(tokens.length > 0 && {
      AND: tokens.map((token) => ({
        OR: [
          { title: { contains: token, mode: "insensitive" as const } },
          { description: { contains: token, mode: "insensitive" as const } },
          { partNumber: { contains: token, mode: "insensitive" as const } },
          { city: { contains: token, mode: "insensitive" as const } },
          { province: { contains: token, mode: "insensitive" as const } },
          { category: { name: { contains: token, mode: "insensitive" as const } } },
        ],
      })),
    }),
  };

  const [aircrafts, totalAircrafts, spareParts, totalSpareParts] = await Promise.all([
    prisma.aircraft.findMany({
      where: aircraftWhere,
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aircraft.count({ where: aircraftWhere }),
    prisma.sparePart.findMany({
      where: sparePartWhere,
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sparePart.count({ where: sparePartWhere }),
  ]);

  const allItems = [
    ...aircrafts.map((item) => ({
      ...item,
      itemType: "AERONAVE" as const,
    })),
    ...spareParts.map((item) => ({
      ...item,
      itemType: "REPUESTO" as const,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalItems = totalAircrafts + totalSpareParts;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;
  const paginatedItems = allItems.slice(skip, skip + itemsPerPage);

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium mb-6">
        Resultados para "{query}" ({totalItems})
      </h1>

      <section className="w-full">
        {paginatedItems.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            No encontramos publicaciones que coincidan con tu búsqueda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {paginatedItems.map((item) => {
              if (item.itemType === "AERONAVE") {
                return (
                  <AircraftCard
                    key={`aircraft-${item.id}`}
                    id={item.id}
                    title={item.title}
                    price={item.price ? Number(item.price) : null}
                    year={item.year}
                    category={item.category}
                    totalTimeHours={item.totalTimeHours}
                    city={item.city}
                    province={item.province}
                    imageUrl={item.images[0]?.url ?? "/placeholder.png"}
                  />
                );
              }

              return (
                <SparePartCard
                  key={`sparepart-${item.id}`}
                  id={item.id}
                  title={item.title}
                  price={item.price ? Number(item.price) : null}
                  category={item.category}
                  city={item.city}
                  province={item.province}
                  imageUrl={item.images[0]?.url ?? "/placeholder.png"}
                />
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8 border-t pt-4 flex-wrap">
            {hasPrevPage ? (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&page=${currentPage - 1}`}
                className="px-3 py-2 border rounded-md hover:bg-neutral-100 text-sm font-medium transition-colors"
              >
                Anterior
              </Link>
            ) : (
              <span className="px-3 py-2 border rounded-md text-neutral-400 text-sm font-medium cursor-not-allowed bg-neutral-50">
                Anterior
              </span>
            )}

            {hasNextPage ? (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&page=${currentPage + 1}`}
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
      </section>
    </main>
  );
}