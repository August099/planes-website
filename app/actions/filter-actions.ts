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

export async function getBrands() {
  return prisma.aircraftBrand.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getModelsByBrand(brandId: string) {
  if (!brandId) return [];

  return prisma.aircraftModel.findMany({
    where: { brandId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}