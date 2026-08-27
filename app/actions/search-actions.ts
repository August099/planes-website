"use server";

import { prisma } from "@/lib/prisma";
import { AnalyticsEventType } from "@prisma/client";

export interface SearchResultItem {
  id: string;
  title: string;
  type: "Aeronave" | "Repuesto";
  subtitle: string;
  url: string;
}

export async function searchGlobal(query: string, anonymousId?: string): Promise<SearchResultItem[]> {
  const cleanQuery = query.trim().toLowerCase();
  
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  // Tokenización (separar la frase en palabras)
  const tokens = cleanQuery.split(" ").filter((t) => t.length > 0);

  // Consulta paralela en aviones y repuestos
  const [aircrafts, spareParts] = await Promise.all([
    // Búsqueda en aviones
    prisma.aircraft.findMany({
      where: {
        status: "ACTIVE",
        AND: tokens.map((token) => ({
          OR: [
            { title: { contains: token, mode: "insensitive" } },
            { description: { contains: token, mode: "insensitive" } },
            { city: { contains: token, mode: "insensitive" } },
            { province: { contains: token, mode: "insensitive" } },
            { brand: { name: { contains: token, mode: "insensitive" } } },
            { customBrand: { contains: token, mode: "insensitive" } },
            { customModel: { contains: token, mode: "insensitive" } },
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
    }),

    // Búsqueda en repuestos
    prisma.sparePart.findMany({
      where: {
        status: "ACTIVE",
        AND: tokens.map((token) => ({
          OR: [
            { title: { contains: token, mode: "insensitive" } },
            { description: { contains: token, mode: "insensitive" } },
            { partNumber: { contains: token, mode: "insensitive" } },
            { city: { contains: token, mode: "insensitive" } },
            { province: { contains: token, mode: "insensitive" } },
            { category: { name: { contains: token, mode: "insensitive" } } },
          ],
        })),
      },
      select: {
        id: true,
        title: true,
        price: true,
        city: true,
      },
      take: 5,
    }),
  ]);

  // Consolidar resultados
  const results: SearchResultItem[] = [
    ...aircrafts.map((a) => ({
      id: a.id,
      title: a.title,
      type: "Aeronave" as const,
      subtitle: `${a.city}, ${a.province} • ${a.price ? `USD $${Number(a.price).toLocaleString()}` : "A Consultar"}`,
      url: `/planes/plane-details/${a.id}`,
    })),
    ...spareParts.map((s) => ({
      id: s.id,
      title: s.title,
      type: "Repuesto" as const,
      subtitle: `${s.city} • ${s.price ? `USD $${Number(s.price).toLocaleString()}` : "A Consultar"}`,
      url: `/spareparts/sparepart-details/${s.id}`,
    })),
  ];

  // Registro en AnalyticsEvent para alimentar el panel del admin
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: AnalyticsEventType.SEARCH,
        anonymousId: anonymousId || null,
        metadata: {
          query: cleanQuery,
          resultsCount: results.length,
          origin: "HEADER_NAVBAR",
        },
      },
    });
  } catch (err) {
    console.error("Error al registrar AnalyticsEvent de búsqueda:", err);
  }

  return results;
}