"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertListingOwner } from "@/lib/listing-auth";
import { pathFromPublicUrl, removeUploads } from "@/lib/listing-uploads";

// Alta y edición de publicaciones: app/publish/actions.ts (createListing / updateListing).
// Acá quedan solo renovar y eliminar, desde el perfil.

// Traduce los errores de assertListingOwner a un mensaje para el usuario.
function listingAuthError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return "Tenés que iniciar sesión.";
  if (message === "FORBIDDEN") return "No tenés permiso para modificar esta publicación.";
  if (message === "NOT_FOUND") return "La publicación no existe.";
  return null;
}

// ==========================================
// 1. RENOVAR / EXTENDER PUBLICACIÓN (+45 DÍAS)
// ==========================================
export async function renewListingAction(id: string, type: "aircraft" | "sparepart") {
  try {
    await assertListingOwner(id, type);

    const now = new Date();

    if (type === "aircraft") {
      const current = await prisma.aircraft.findUnique({
        where: { id },
        select: { listingExpiresAt: true },
      });

      const baseDate = current?.listingExpiresAt && new Date(current.listingExpiresAt) > now
        ? new Date(current.listingExpiresAt)
        : now;

      const newExpiration = new Date(baseDate);
      newExpiration.setDate(baseDate.getDate() + 45);

      await prisma.aircraft.update({
        where: { id },
        data: {
          status: "ACTIVE",
          listingStartsAt: now,
          listingExpiresAt: newExpiration,
        },
      });

      revalidatePath("/planes");
      revalidatePath(`/planes/plane-details/${id}`);
    } else {
      const current = await prisma.sparePart.findUnique({
        where: { id },
        select: { listingExpiresAt: true },
      });

      const baseDate = current?.listingExpiresAt && new Date(current.listingExpiresAt) > now
        ? new Date(current.listingExpiresAt)
        : now;

      const newExpiration = new Date(baseDate);
      newExpiration.setDate(baseDate.getDate() + 45);

      await prisma.sparePart.update({
        where: { id },
        data: {
          status: "ACTIVE",
          listingStartsAt: now,
          listingExpiresAt: newExpiration,
        },
      });

      revalidatePath("/spareparts");
      revalidatePath(`/spareparts/sparepart-details/${id}`);
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    const authError = listingAuthError(error);
    if (authError) return { success: false, error: authError };
    console.error("Error al renovar publicación:", error);
    return { success: false, error: "No se pudo renovar la publicación." };
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

    revalidatePath("/profile");
    revalidatePath("/planes");
    revalidatePath("/spareparts");

    return { success: true };
  } catch (error) {
    const authError = listingAuthError(error);
    if (authError) return { success: false, error: authError };
    console.error("Error al eliminar publicación:", error);
    return { success: false, error: "No se pudo eliminar la publicación." };
  }
}
