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
// VA-137: el buscador del celular no tiene selector de tipo: busca en los dos.
type SearchScope = SearchType | "Todos";

// Sugerencias del buscador del header (se llama mientras se escribe). No registra analytics: la
// búsqueda se registra recién cuando la persona la envía o elige un resultado (logSearch, VA-15).
export async function searchGlobal(
  query: string,
  searchType: SearchScope = "Aeronave"
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
  if (searchType === "Aeronave" || searchType === "Todos") {
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

    results = results.concat(aircrafts.map((a): SearchResultItem => ({
      id: a.id,
      title: a.title,
      type: "Aeronave",
      subtitle: `${a.city ?? "Ubicación no especificada"}${
        a.province ? `, ${a.province}` : ""
      } • ${
        formatPrice(a.price)
      }`,
      url: `/aircraft/${a.id}`,
    })));
  }

  // ============================================================
  // BÚSQUEDA DE REPUESTOS
  // ============================================================
  if (searchType === "Repuesto" || searchType === "Todos") {
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

    results = results.concat(spareParts.map((s): SearchResultItem => ({
      id: s.id,
      title: s.title,
      type: "Repuesto",
      subtitle: `${s.city ?? "Ubicación no especificada"} • ${
        formatPrice(s.price, { inPesos: s.inPesos })
      }`,
      url: `/spareparts/sparepart-details/${s.id}`,
    })));
  }

  return results;
}
// ============================================================
// VA-172: VENDEDORES (Brokers y admins con Página VA publicada)
// ============================================================
export interface SellerResult {
  id: string;
  name: string;
  logoUrl: string | null;
  listings: number;
  url: string;
}

/**
 * Brokers por nombre comercial (o nombre). Sin cuentas Base ni Pro: solo las que tienen la Página VA
 * completa (suscripción vigente a un plan con vaPageLevel FULL, o admins con su página publicada). El
 * filtro por plan acota a pocas cuentas antes de buscar el texto; se llama con el mismo debounce de hoy.
 */
export async function searchSellers(query: string, take = 4): Promise<SellerResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const now = new Date();
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { isAdmin: true, profilePage: { publishedAt: { not: null } } },
        {
          Subscription: {
            plan: { vaPageLevel: "FULL" },
            OR: [
              { status: "ACTIVE", currentPeriodEnd: { gt: now } },
              { status: "PAST_DUE", graceUntil: { gt: now } },
            ],
          },
        },
      ],
      AND: [{ OR: [{ businessName: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }],
    },
    select: {
      id: true,
      name: true,
      businessName: true,
      logoUrl: true,
      _count: { select: { aircrafts: { where: activeListingWhere() }, spareParts: { where: activeListingWhere() } } },
    },
    take: Math.min(Math.max(1, take), 20),
  });
  return users.map((u) => ({
    id: u.id,
    name: u.businessName || u.name || "Vendedor",
    logoUrl: u.logoUrl,
    listings: u._count.aircrafts + u._count.spareParts,
    url: `/profile/${u.id}`,
  }));
}
