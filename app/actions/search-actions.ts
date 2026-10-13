"use server";

import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { formatPrice } from "@/lib/format";

export interface SearchResultItem {
  id: string;
  title: string;
  type: "Aeronave" | "Repuesto";
  subtitle: string;
  url: string;
}

export type SearchType = "Aeronave" | "Repuesto";

// Sugerencias del buscador del header (se llama mientras se escribe). No registra analytics: la
// búsqueda se registra recién cuando la persona la envía o elige un resultado (logSearch, VA-15).
export async function searchGlobal(
  query: string,
  searchType: SearchType = "Aeronave"
): Promise<SearchResultItem[]> {
  const cleanQuery = query.trim().toLowerCase();

  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  // Tokenización
  const tokens = cleanQuery
    .split(" ")
    .filter((t) => t.length > 0);

  let results: SearchResultItem[] = [];

  // ============================================================
  // BÚSQUEDA DE AERONAVES
  // ============================================================
  if (searchType === "Aeronave") {
    const aircrafts = await prisma.aircraft.findMany({
      where: {
        ...activeListingWhere(),
        AND: tokens.map((token) => ({
          OR: [
            { title: { contains: token, mode: "insensitive" } },
            { description: { contains: token, mode: "insensitive" } },
            { city: { contains: token, mode: "insensitive" } },
            { province: { contains: token, mode: "insensitive" } },
            {
              brand: {
                name: {
                  contains: token,
                  mode: "insensitive",
                },
              },
            },
            {
              customBrand: {
                contains: token,
                mode: "insensitive",
              },
            },
            {
              customModel: {
                contains: token,
                mode: "insensitive",
              },
            },
          ],
        })),
      },
      select: {
        id: true,
        title: true,
        price: true,
        city: true,
        province: true,
      },
      take: 5,
    });

    results = aircrafts.map((a) => ({
      id: a.id,
      title: a.title,
      type: "Aeronave",
      subtitle: `${a.city ?? "Ubicación no especificada"}${
        a.province ? `, ${a.province}` : ""
      } • ${
        formatPrice(a.price)
      }`,
      url: `/planes/plane-details/${a.id}`,
    }));
  }

  // ============================================================
  // BÚSQUEDA DE REPUESTOS
  // ============================================================
  if (searchType === "Repuesto") {
    const spareParts = await prisma.sparePart.findMany({
      where: {
        ...activeListingWhere(),
        AND: tokens.map((token) => ({
          OR: [
            { title: { contains: token, mode: "insensitive" } },
            { description: { contains: token, mode: "insensitive" } },
            { partNumber: { contains: token, mode: "insensitive" } },
            { city: { contains: token, mode: "insensitive" } },
            { province: { contains: token, mode: "insensitive" } },
            {
              category: {
                name: {
                  contains: token,
                  mode: "insensitive",
                },
              },
            },
          ],
        })),
      },
      select: {
        id: true,
        title: true,
        price: true,
        inPesos: true,
        city: true,
      },
      take: 5,
    });

    results = spareParts.map((s) => ({
      id: s.id,
      title: s.title,
      type: "Repuesto",
      subtitle: `${s.city ?? "Ubicación no especificada"} • ${
        formatPrice(s.price, { inPesos: s.inPesos })
      }`,
      url: `/spareparts/sparepart-details/${s.id}`,
    }));
  }

  return results;
}