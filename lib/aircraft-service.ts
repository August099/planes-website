/*import { prisma } from "@/lib/prisma";
import { Prisma, EngineType, AircraftCondition, UserType } from "@prisma/client";

export interface AircraftFilterParams {
  categoryIds?: string[];
  brandIds?: string[];
  customBrandQuery?: string; // Por si el usuario escribe en la barra
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  engineType?: EngineType;
  condition?: AircraftCondition;
  sellerType?: UserType;
  trade?: boolean;
  financing?: boolean;
  page?: number;
  limit?: number;
}

export async function getFilteredAircrafts(filters: AircraftFilterParams) {
  const {
    categoryIds,
    brandIds,
    customBrandQuery,
    minYear,
    maxYear,
    minPrice,
    maxPrice,
    engineType,
    condition,
    sellerType,
    trade,
    financing,
    page = 1,
    limit = 12,
  } = filters;

  const where: Prisma.AircraftWhereInput = {
    status: "ACTIVE",
  };

  // 1. Categoría
  if (categoryIds && categoryIds.length > 0) {
    where.categoryId = { in: categoryIds };
  }

  // 2. Filtro Multimarca (Combina IDs seleccionados y texto libre custom)
  if ((brandIds && brandIds.length > 0) || customBrandQuery) {
    const brandConditions: Prisma.AircraftWhereInput[] = [];

    if (brandIds && brandIds.length > 0) {
      brandConditions.push({ brandId: { in: brandIds } });
    }

    if (customBrandQuery) {
      brandConditions.push({
        customBrand: { contains: customBrandQuery, mode: "insensitive" },
      });
    }

    where.OR = brandConditions;
  }

  // 3. Rango de Año
  if (minYear || maxYear) {
    where.year = {
      ...(minYear ? { gte: minYear } : {}),
      ...(maxYear ? { lte: maxYear } : {}),
    };
  }

  // 4. Rango de Precio
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: minPrice } : {}),
      ...(maxPrice ? { lte: maxPrice } : {}),
    };
  }

  // 5. Motorización y Estado
  if (engineType) where.engineType = engineType;
  if (condition) where.condition = condition;

  // 6. Comercialización
  if (trade !== undefined) where.trade = trade;
  if (financing !== undefined) where.financing = financing;

  // 7. Tipo de Publicante
  if (sellerType) {
    where.seller = { userType: sellerType };
  }

  const skip = (page - 1) * limit;

  // Ejecución concurrente en el servidor (1 solo viaje a la BD)
  const [items, totalCount] = await Promise.all([
    prisma.aircraft.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        category: true,
        brand: true,
        model: true,
        seller: { select: { userType: true, name: true } },
      },
    }),
    prisma.aircraft.count({ where }),
  ]);

  return {
    items,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
}*/