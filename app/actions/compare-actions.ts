"use server";

import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { formatPrice } from "@/lib/format";

export type CompareSearchResult = { id: string; title: string; image: string | null; subtitle: string };

// VA-83: buscador de "+ Agregar aeronave" en /planes/compare. Solo avisos visibles (mismo
// criterio que /planes), por título, marca o modelo.
export async function searchAircraftForCompare(query: string, excludeIds: string[] = []): Promise<CompareSearchResult[]> {
  const q = typeof query === "string" ? query.trim().slice(0, 60) : "";
  if (q.length < 2) return [];
  const exclude = Array.isArray(excludeIds) ? excludeIds.filter((x) => typeof x === "string").slice(0, 3) : [];

  const rows = await prisma.aircraft.findMany({
    where: {
      ...activeListingWhere(),
      id: { notIn: exclude },
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { customBrand: { contains: q, mode: "insensitive" } },
        { customModel: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { model: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      title: true,
      year: true,
      price: true,
      images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    image: r.images[0]?.url ?? null,
    subtitle: `${r.year} · ${formatPrice(r.price, { fallback: "Precio a consultar" })}`,
  }));
}
