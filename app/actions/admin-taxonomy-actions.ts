"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("UNAUTHORIZED");
  }
}

// AVIONES

export async function createAircraftCategoryAction(name: string) {
  await verifyAdmin();
  if (!name.trim()) throw new Error("Nombre requerido");

  await prisma.aircraftCategory.create({
    data: { name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function createAircraftBrandAction(name: string) {
  await verifyAdmin();
  if (!name.trim()) throw new Error("Nombre requerido");

  await prisma.aircraftBrand.create({
    data: { name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function createAircraftModelAction(brandId: string, name: string) {
  await verifyAdmin();
  if (!brandId || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftModel.create({
    data: {
      brandId,
      name: name.trim(),
    },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function createAircraftSubModelAction(modelId: string, name: string) {
  await verifyAdmin();
  if (!modelId || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftSubModel.create({
    data: {
      modelId,
      name: name.trim(),
    },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

// REPUESTOS

export async function createSparePartCategoryAction(name: string, parentId?: string) {
  await verifyAdmin();
  if (!name.trim()) throw new Error("Nombre requerido");

  const slug = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  await prisma.category.create({
    data: {
      name: name.trim(),
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      parentId: parentId || null,
    },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}