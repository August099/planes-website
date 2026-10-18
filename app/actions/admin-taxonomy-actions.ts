"use server";

import { prisma } from "@/lib/prisma";
import { parseCategoryIconName } from "@/lib/category-icon-names";
import { getCurrentUser } from "@/lib/auth-helpers";
import { validateImage } from "@/lib/upload-validation";
import { revalidatePath, updateTag } from "next/cache";
import { AIRCRAFT_TAXONOMY_TAG, SPAREPART_CATEGORIES_TAG } from "@/lib/cached-data";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
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
  updateTag(AIRCRAFT_TAXONOMY_TAG);
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
  updateTag(AIRCRAFT_TAXONOMY_TAG);
  return { success: true };
}

export async function deleteAircraftCategoryAction(id: string) {
  await verifyAdmin();
  await prisma.aircraftCategory.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
  updateTag(AIRCRAFT_TAXONOMY_TAG);
  return { success: true };
}

// ==========================================
// AERONAVES: Marcas, Modelos y Variantes
// ==========================================

// ==========================================
// AERONAVES: Marcas, Modelos y Variantes
// ==========================================

export async function createAircraftBrandAction(name: string, logoUrl?: string) {
  await verifyAdmin();
  if (!name.trim()) throw new Error("Nombre requerido");

  await prisma.aircraftBrand.create({
    data: { 
      name: name.trim(),
      logoUrl: logoUrl ? logoUrl.trim() : null,
    },
  });

  revalidatePath("/admin/taxonomy");
  updateTag(AIRCRAFT_TAXONOMY_TAG);
  revalidatePath("/"); // Limpia caché de la Home para actualizar marcas destacadas
  return { success: true };
}

export async function updateAircraftBrandAction(id: string, name: string, logoUrl?: string) {
  await verifyAdmin();
  if (!id || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftBrand.update({
    where: { id },
    data: { 
      name: name.trim(),
      logoUrl: logoUrl ? logoUrl.trim() : null,
    },
  });

  revalidatePath("/admin/taxonomy");
  updateTag(AIRCRAFT_TAXONOMY_TAG);
  revalidatePath("/"); // Limpia caché de la Home
  return { success: true };
}

export async function deleteAircraftBrandAction(id: string) {
  await verifyAdmin();
  await prisma.aircraftBrand.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
  updateTag(AIRCRAFT_TAXONOMY_TAG);
  return { success: true };
}

export async function createAircraftModelAction(brandId: string, name: string) {
  await verifyAdmin();
  if (!brandId || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftModel.create({
    data: { brandId, name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  updateTag(AIRCRAFT_TAXONOMY_TAG);
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
  updateTag(AIRCRAFT_TAXONOMY_TAG);
  return { success: true };
}

// VA-153: la categoría del modelo (la heredan sus submodelos). null: sin categoría, el vendedor la elige.
export async function setAircraftModelCategoryAction(id: string, categoryId: string | null) {
  await verifyAdmin();
  if (!id) throw new Error("Datos incompletos");
  if (categoryId && !(await prisma.aircraftCategory.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    throw new Error("Categoría inexistente");
  }

  await prisma.aircraftModel.update({ where: { id }, data: { defaultCategoryId: categoryId } });

  revalidatePath("/admin/taxonomy");
  updateTag(AIRCRAFT_TAXONOMY_TAG);
  return { success: true };
}

export async function deleteAircraftModelAction(id: string) {
  await verifyAdmin();
  await prisma.aircraftModel.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
  updateTag(AIRCRAFT_TAXONOMY_TAG);
  return { success: true };
}

export async function createAircraftSubModelAction(modelId: string, name: string) {
  await verifyAdmin();
  if (!modelId || !name.trim()) throw new Error("Datos incompletos");

  await prisma.aircraftSubModel.create({
    data: { modelId, name: name.trim() },
  });

  revalidatePath("/admin/taxonomy");
  updateTag(AIRCRAFT_TAXONOMY_TAG);
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
  updateTag(AIRCRAFT_TAXONOMY_TAG);
  return { success: true };
}

export async function deleteAircraftSubModelAction(id: string) {
  await verifyAdmin();
  await prisma.aircraftSubModel.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
  updateTag(AIRCRAFT_TAXONOMY_TAG);
  return { success: true };
}

// ==========================================
// REPUESTOS: Categorías
// ==========================================

export async function createSparePartCategoryAction(name: string, parentId?: string, icon?: string) {
  await verifyAdmin();
  if (!name.trim()) throw new Error("Nombre requerido");
  // VA-148: solo uno de los 14 íconos propios (o ninguno).
  if (icon?.trim() && !parseCategoryIconName(icon)) throw new Error("Ícono inválido");

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
      icon: !parentId ? parseCategoryIconName(icon) : null,
    },
  });

  revalidatePath("/admin/taxonomy");
  updateTag(SPAREPART_CATEGORIES_TAG);
  return { success: true };
}

export async function updateSparePartCategoryAction(id: string, name: string, icon?: string) {
  await verifyAdmin();
  if (!id || !name.trim()) throw new Error("Datos incompletos");
  if (icon?.trim() && !parseCategoryIconName(icon)) throw new Error("Ícono inválido");

  await prisma.category.update({
    where: { id },
    data: {
      name: name.trim(),
      icon: parseCategoryIconName(icon),
    },
  });

  revalidatePath("/admin/taxonomy");
  updateTag(SPAREPART_CATEGORIES_TAG);
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
  updateTag(SPAREPART_CATEGORIES_TAG);
  return { success: true };
}

export async function uploadBrandLogoAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) throw new Error("UNAUTHORIZED");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("NO_FILE");

  const validation = await validateImage(file);
  if (!validation.ok) throw new Error(validation.error);

  const fileName = `brand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${validation.file.ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Subir imagen al bucket 'brands' (asegúrate de que el bucket sea Público)
  const { error } = await supabase.storage
    .from("brands")
    .upload(fileName, buffer, {
      contentType: validation.file.contentType,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data: publicUrlData } = supabase.storage
    .from("brands")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}
// ==========================================
// REPUESTOS: Grupos de filtros
// ==========================================

export async function createFilterGroupAction(name: string, categoryIds: string[]) {
  await verifyAdmin();
  const slug = name.toLowerCase().trim().replace(/\s+/g, "-");
  await prisma.filterGroup.create({
    data: { name, slug, categories: { connect: categoryIds.map((id) => ({ id })) } },
  });
  revalidatePath("/admin/taxonomy");
}

export async function updateFilterGroupAction(id: string, name: string, categoryIds: string[]) {
  await verifyAdmin();
  await prisma.filterGroup.update({
    where: { id },
    data: { name, categories: { set: categoryIds.map((id) => ({ id })) } },
  });
  revalidatePath("/admin/taxonomy");
}

export async function deleteFilterGroupAction(id: string) {
  await verifyAdmin();
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
  await verifyAdmin();
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
  await verifyAdmin();
  await prisma.filter.delete({ where: { id } });
  revalidatePath("/admin/taxonomy");
}