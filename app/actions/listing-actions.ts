"use server";

import { revalidatePath, updateTag } from "next/cache";
import { RECOMMENDATIONS_TAG } from "@/lib/recommendations";
import { renewalPrice, renewedExpiry } from "@/lib/renewal";
import { recordFunding } from "@/lib/balances";
import { currentSubscriptionWhere } from "@/lib/subscriptions";
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
export async function renewListingAction(
  id: string,
  type: "aircraft" | "sparepart"
): Promise<{ success: true } | { success: false; error?: string; checkoutUrl?: string }> {
  try {
    await assertListingOwner(id, type);
    const kind = type === "aircraft" ? "AIRCRAFT" : "SPARE_PART";
    const select = { listingExpiresAt: true, status: true, sellerId: true } as const;
    const current = type === "aircraft" ? await prisma.aircraft.findUnique({ where: { id }, select }) : await prisma.sparePart.findUnique({ where: { id }, select });
    if (!current) return { success: false, error: "La publicación no existe." };
    if (current.status === "SOLD" || current.status === "PENDING_PAYMENT") return { success: false, error: "Esta publicación no se puede renovar." };

    // VA-105 (14/10): sin cargo si el plan vigente deja este tipo sin vencimiento (queda sin fecha) o
    // si el porcentaje de renovación es 0; si no, se paga en el checkout y se renueva al aprobarse.
    const price = await renewalPrice(current.sellerId, kind);
    if (!price.covered && price.amount > 0) {
      return { success: false, checkoutUrl: `/checkout?renew=${type === "aircraft" ? "aircraft" : "parts"}:${id}` };
    }
    const data = { status: "ACTIVE" as const, listingExpiresAt: price.covered ? null : renewedExpiry(current.listingExpiresAt) };
    if (type === "aircraft") await prisma.aircraft.update({ where: { id }, data });
    else await prisma.sparePart.update({ where: { id }, data });
    // VA-150: renovación gracias a la suscripción: se guarda el vencimiento anterior (si se arrepiente
    // de ese cobro, vuelve a él).
    if (price.covered) {
      const sub = await prisma.subscription.findFirst({ where: currentSubscriptionWhere(current.sellerId), select: { id: true } });
      if (sub) {
        await recordFunding(prisma, { userId: current.sellerId, kind, listingId: id, reason: "RENEWAL", funding: { source: "SUBSCRIPTION", subscriptionId: sub.id }, previousExpiresAt: current.listingExpiresAt });
      }
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
