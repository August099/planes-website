import "server-only";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";

// VA-83: "Comparar con similares" en el detalle. Misma categoría y precio parecido (±40 %); si el
// aviso no tiene precio, las más nuevas de la categoría. Solo avisos visibles.
export async function getSimilarAircraft(a: { id: string; categoryId: string | null; price: unknown }, take = 2) {
  if (!a.categoryId) return [];
  const price = a.price != null ? Number(a.price) : null;
  const rows = await prisma.aircraft.findMany({
    where: {
      ...activeListingWhere(),
      id: { not: a.id },
      categoryId: a.categoryId,
      ...(price && price > 0 ? { price: { gte: price * 0.6, lte: price * 1.4 } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      year: true,
      price: true,
      totalTimeHours: true,
      images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
    },
  });
  const sorted = price && price > 0 ? [...rows].sort((x, y) => Math.abs(Number(x.price) - price) - Math.abs(Number(y.price) - price)) : rows;
  return sorted.slice(0, take);
}
