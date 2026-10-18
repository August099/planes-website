"use server";

import { prisma } from "@/lib/prisma";
import { sortAircraftCategories } from "@/lib/aircraft-categories";

export async function getAircraftCategories() {
  // VA-149: mismo orden que en todo el sitio.
  return sortAircraftCategories(
    await prisma.aircraftCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  );
}

// VA-153: un modelo es de una categoría por la suya o por la de alguno de sus submodelos (igual que
// lib/aircraft-taxonomy.ts). Sin categoría, todos.
const modelInCategory = (categoryId?: string) =>
  categoryId
    ? { OR: [{ defaultCategoryId: categoryId }, { variants: { some: { categoryOverride: categoryId } } }] }
    : {};

export async function getBrands(categoryId?: string) {
  return prisma.aircraftBrand.findMany({
    where: categoryId ? { models: { some: modelInCategory(categoryId) } } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getModelsByBrand(brandId: string, categoryId?: string) {
  if (!brandId) return [];

  return prisma.aircraftModel.findMany({
    where: { brandId, ...modelInCategory(categoryId) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
