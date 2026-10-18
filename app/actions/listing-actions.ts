"use server";

import { revalidatePath, updateTag } from "next/cache";
import { RECOMMENDATIONS_TAG } from "@/lib/recommendations";
import { lockAndCheckRoom, QUOTA_KIND_TEXT } from "@/lib/quota";
import { prisma } from "@/lib/prisma";
import { assertListingOwner } from "@/lib/listing-auth";
import { pathFromPublicUrl, removeUploads } from "@/lib/listing-uploads";

// Alta y edición de publicaciones: app/publish/actions.ts (createListing / updateListing).
// Acá quedan cambiar el estado (pausar, activar, vendido) y eliminar, desde el perfil.

// Traduce los errores de assertListingOwner a un mensaje para el usuario.
function listingAuthError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return "Tenés que iniciar sesión.";
  if (message === "FORBIDDEN") return "No tenés permiso para modificar esta publicación.";
  if (message === "NOT_FOUND") return "La publicación no existe.";
  return null;
}

// ==========================================
// 1. PAUSAR, ACTIVAR Y MARCAR VENDIDO (VA-152)
// ==========================================
export type ListingStatusTarget = "ACTIVE" | "PAUSED" | "SOLD";

/**
 * VA-152: el dueño (o un admin) cambia el estado de su aviso. Activar necesita cupo libre del mismo
 * tipo en la cuenta del dueño; se mira y se cambia en la misma transacción (lib/quota.ts).
 */
export async function setListingStatusAction(
  id: string,
  type: "aircraft" | "sparepart",
  to: ListingStatusTarget
): Promise<{ success: true } | { success: false; error: string; quotaFull?: boolean }> {
  try {
    if (!["ACTIVE", "PAUSED", "SOLD"].includes(to)) return { success: false, error: "Estado inválido." };
    await assertListingOwner(id, type);
    const kind = type === "aircraft" ? "AIRCRAFT" : "SPARE_PART";
    const select = { status: true, sellerId: true, listingStartsAt: true } as const;
    const current = type === "aircraft" ? await prisma.aircraft.findUnique({ where: { id }, select }) : await prisma.sparePart.findUnique({ where: { id }, select });
    if (!current) return { success: false, error: "La publicación no existe." };
    if (current.status === to) return { success: true };

    const result = await prisma.$transaction(async (tx) => {
      if (to === "ACTIVE" && !(await lockAndCheckRoom(tx, current.sellerId, kind))) return "FULL" as const;
      const data = to === "ACTIVE" ? { status: to, listingStartsAt: current.listingStartsAt ?? new Date() } : { status: to };
      if (type === "aircraft") await tx.aircraft.update({ where: { id }, data });
      else await tx.sparePart.update({ where: { id }, data });
      return "OK" as const;
    });
    if (result === "FULL") {
      const text = QUOTA_KIND_TEXT[kind];
      return { success: false, quotaFull: true, error: `No te queda cupo de ${text.many}: pausá otro aviso o pasate a un plan con más cupo.` };
    }

    revalidatePath(type === "aircraft" ? "/aircraft" : "/spareparts");
    revalidatePath(type === "aircraft" ? `/aircraft/${id}` : `/spareparts/sparepart-details/${id}`);
    revalidatePath("/profile/[id]", "page"); // "/profile" no existe: se revalidan los perfiles
    revalidatePath("/"); // VA-76: la Home es estática
    updateTag(RECOMMENDATIONS_TAG); // VA-88
    return { success: true };
  } catch (error) {
    const authError = listingAuthError(error);
    if (authError) return { success: false, error: authError };
    console.error("Error al cambiar el estado de la publicación:", error);
    return { success: false, error: "No se pudo cambiar el estado de la publicación." };
  }
}

// ==========================================
// 2. ELIMINAR PUBLICACIÓN
// ==========================================
export async function deleteListingAction(id: string, type: "AIRCRAFT" | "SPARE_PART") {
  try {
    await assertListingOwner(id, type === "AIRCRAFT" ? "aircraft" : "sparepart");

    // Antes se borraba solo el registro y las fotos/documentos quedaban en Supabase Storage.
    // Se leen las URLs, se borra el aviso y recién después los archivos.
    let sellerId: string;
    let imageUrls: string[];
    let documentUrls: string[] = [];
    if (type === "AIRCRAFT") {
      const aircraft = await prisma.aircraft.delete({
        where: { id },
        select: { sellerId: true, images: { select: { url: true } }, documents: { select: { url: true } } },
      });
      sellerId = aircraft.sellerId;
      imageUrls = aircraft.images.map((i) => i.url);
      documentUrls = aircraft.documents.map((d) => d.url);
    } else {
      const sparePart = await prisma.sparePart.delete({
        where: { id },
        select: { sellerId: true, images: { select: { url: true } } },
      });
      sellerId = sparePart.sellerId;
      imageUrls = sparePart.images.map((i) => i.url);
    }

    // Solo archivos de nuestro bucket y de la carpeta del vendedor (URLs externas se ignoran).
    await removeUploads(
      sellerId,
      type === "AIRCRAFT" ? "aircraft" : "parts",
      imageUrls.map((url) => pathFromPublicUrl("image", url)).filter((p): p is string => !!p),
      documentUrls.map((url) => pathFromPublicUrl("document", url)).filter((p): p is string => !!p)
    );

    revalidatePath("/profile/[id]", "page"); // "/profile" no existe: se revalidan los perfiles
    revalidatePath("/aircraft");
    revalidatePath("/spareparts");
    revalidatePath("/"); // VA-76: la Home es estática
    updateTag(RECOMMENDATIONS_TAG); // VA-88

    return { success: true };
  } catch (error) {
    const authError = listingAuthError(error);
    if (authError) return { success: false, error: authError };
    console.error("Error al eliminar publicación:", error);
    return { success: false, error: "No se pudo eliminar la publicación." };
  }
}
