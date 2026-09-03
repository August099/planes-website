"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { FilterType } from "@prisma/client";

async function verifyAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("UNAUTHORIZED");
  }
}

// ==========================================
// AERONAVES: Categorías
// ==========================================

export async function createAircraftCategoryAction(name: string) {
  await verifyAdmin();
  if (!name.trim()) throw new Error("Nombre requerido");

  await prisma.aircraftCategory.create({
    data: { name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function updateAircraftCategoryAction(id: string, name: string) {
  await verifyAdmin();
  if (!id || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftCategory.update({
    where: { id },
    data: { name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function deleteAircraftCategoryAction(id: string) {
  await verifyAdmin();
  await prisma.aircraftCategory.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
  return { success: true };
}

// ==========================================
// AERONAVES: Marcas, Modelos y Variantes
// ==========================================

export async function createAircraftBrandAction(name: string) {
  await verifyAdmin();
  if (!name.trim()) throw new Error("Nombre requerido");

  await prisma.aircraftBrand.create({
    data: { name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function updateAircraftBrandAction(id: string, name: string) {
  await verifyAdmin();
  if (!id || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftBrand.update({
    where: { id },
    data: { name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function deleteAircraftBrandAction(id: string) {
  await verifyAdmin();
  await prisma.aircraftBrand.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function createAircraftModelAction(brandId: string, name: string) {
  await verifyAdmin();
  if (!brandId || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftModel.create({
    data: { brandId, name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function updateAircraftModelAction(id: string, name: string) {
  await verifyAdmin();
  if (!id || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftModel.update({
    where: { id },
    data: { name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function deleteAircraftModelAction(id: string) {
  await verifyAdmin();
  await prisma.aircraftModel.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function createAircraftSubModelAction(modelId: string, name: string) {
  await verifyAdmin();
  if (!modelId || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftSubModel.create({
    data: { modelId, name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function updateAircraftSubModelAction(id: string, name: string) {
  await verifyAdmin();
  if (!id || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftSubModel.update({
    where: { id },
    data: { name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function deleteAircraftSubModelAction(id: string) {
  await verifyAdmin();
  await prisma.aircraftSubModel.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
  return { success: true };
}

// ==========================================
// REPUESTOS: Categorías
// ==========================================

export async function createSparePartCategoryAction(name: string, parentId?: string, icon?: string) {
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
      icon: !parentId && icon ? icon.trim() : null,
    },
  });

  revalidatePath("/admin/taxonomy");
  return { success: true };
}

export async function updateSparePartCategoryAction(id: string, name: string, icon?: string) {
  await verifyAdmin();
  if (!id || !name.trim()) throw new Error("Datos incompletos");

  await prisma.category.update({
    where: { id },
    data: {
      name: name.trim(),
      icon: icon ? icon.trim() : null,
    },
  });

  revalidatePath("/admin/taxonomy");
  revalidatePath("/"); // <-- Limpia la caché de la Home para que se actualice el carrusel
  return { success: true };
}

export async function deleteSparePartCategoryAction(id: string) {
  await verifyAdmin();

  // Buscamos si HAY productos en esta categoría o en cualquiera de sus descendientes
  const allCategories = await prisma.category.findMany({ select: { id: true, parentId: true } });
  function getDescendantIds(catId: string): string[] {
    const children = allCategories.filter((c) => c.parentId === catId);
    return [catId, ...children.flatMap((c) => getDescendantIds(c.id))];
  }
  const affectedIds = getDescendantIds(id);

  const productCount = await prisma.sparePart.count({
    where: { categoryId: { in: affectedIds } },
  });

  if (productCount > 0) {
    throw new Error(
      `No se puede eliminar: hay ${productCount} repuesto(s) publicado(s) en esta rama de categorías.`
    );
  }

  await prisma.category.delete({ where: { id } }); // acá sí, borra toda la rama de categorías vacías
  revalidatePath("/admin/taxonomy");
  return { success: true };
}

// ==========================================
// REPUESTOS: Grupos de filtros
// ==========================================

export async function createFilterGroupAction(name: string, categoryIds: string[]) {
  const slug = name.toLowerCase().trim().replace(/\s+/g, "-");
  await prisma.filterGroup.create({
    data: { name, slug, categories: { connect: categoryIds.map((id) => ({ id })) } },
  });
  revalidatePath("/admin/taxonomy");
}

export async function updateFilterGroupAction(id: string, name: string, categoryIds: string[]) {
  await prisma.filterGroup.update({
    where: { id },
    data: { name, categories: { set: categoryIds.map((id) => ({ id })) } },
  });
  revalidatePath("/admin/taxonomy");
}

export async function deleteFilterGroupAction(id: string) {
  await prisma.filterGroup.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
}

// ==========================================
// REPUESTOS: Filtros
// ==========================================

export async function createFilterAction(
  groupId: string,
  name: string,
  type: FilterType,
  options: string[],
  parentId?: string,
  triggerOptionValue?: string
) {
  const slug = name.toLowerCase().trim().replace(/\s+/g, "-");
  await prisma.filter.create({
    data: {
      groupId,
      name,
      slug,
      type,
      parentId: parentId || undefined,
      config: parentId && triggerOptionValue ? { triggerOptionValue } : undefined,
      ...((type === "SELECT" || type === "MULTI_SELECT") && {
        options: {
          create: options
            .filter((o) => o.trim())
            .map((label, i) => ({
              label,
              value: label.toLowerCase().trim().replace(/\s+/g, "-"),
              order: i,
            })),
        },
      }),
    },
  });
  revalidatePath("/admin/taxonomy");
}

export async function deleteFilterAction(id: string) {
  await prisma.filter.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
}