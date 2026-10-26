"use server";

import { prisma } from "@/lib/prisma";
import { sortAircraftCategories } from "@/lib/aircraft-categories";
import { activeListingWhere } from "@/lib/listing-filters";

export async function getAircraftCategories() {
  // VA-149: mismo orden que en todo el sitio.
  return sortAircraftCategories(
    await prisma.aircraftCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  );
}

// VA-165: con una categoría, solo las marcas y los modelos que tienen avisos activos de esa categoría (la
// elegida por el vendedor, no la recomendada del modelo). Sin categoría, todos.
const withListingsIn = (categoryId?: string) =>
  categoryId ? { aircrafts: { some: { ...activeListingWhere(), categoryId } } } : {};

export async function getBrands(categoryId?: string) {
  return prisma.aircraftBrand.findMany({
    where: { hidden: false, ...withListingsIn(categoryId) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getModelsByBrand(brandId: string, categoryId?: string) {
  if (!brandId) return [];

  return prisma.aircraftModel.findMany({
    where: { brandId, hidden: false, ...withListingsIn(categoryId) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
