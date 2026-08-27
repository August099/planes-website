"use server";

import { prisma } from "@/lib/prisma";

export async function getAircraftCategories() {
  return prisma.aircraftCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
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