"use server";

import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import type { ListingKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { LISTING_PRICES_TAG } from "@/lib/listing-prices";
import { isLargePriceChange, LISTING_PRICE_MAX } from "@/lib/listing-price-format";

const KINDS: ListingKind[] = ["AIRCRAFT", "SPARE_PART"];

// VA-59: cambia el precio de publicar un avión o un repuesto y deja el cambio en el historial.
// Las mismas reglas del diálogo se validan acá: el cliente no decide nada.
export async function updateListingPriceAction(input: {
  kind: string;
  amount: unknown;
  confirmText?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };

  const kind = KINDS.find((k) => k === input.kind);
  if (!kind) return { ok: false, error: "Tipo de publicación inválido." };

  const amount = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!Number.isInteger(amount) || amount < 0 || amount > LISTING_PRICE_MAX) {
    return { ok: false, error: `El precio tiene que ser un número entero entre 0 y ${LISTING_PRICE_MAX.toLocaleString("es-AR")}.` };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.listingPrice.findUnique({ where: { kind } });
      const previous = current ? Number(current.amount) : 0;
      if (previous === amount) return { ok: false as const, error: "Es el mismo precio que ya está vigente." };
      if (isLargePriceChange(previous, amount) && input.confirmText?.trim() !== "CONFIRMAR") {
        return { ok: false as const, error: "Es un cambio grande: escribí CONFIRMAR para guardarlo." };
      }
      await tx.listingPrice.upsert({
        where: { kind },
        create: { kind, amount },
        update: { amount },
      });
      await tx.listingPriceChange.create({
        data: { kind, previousAmount: previous, newAmount: amount, adminId: admin.id },
      });
      return { ok: true as const };
    });
    if (!result.ok) return result;
  } catch (error) {
    console.error("Error al cambiar el precio de publicación:", error);
    return { ok: false, error: "No se pudo guardar el precio." };
  }

  updateTag(LISTING_PRICES_TAG);
  revalidatePath("/admin/prices");
  return { ok: true };
}

// VA-105 (14/10): porcentaje del precio suelto que cuesta renovar un aviso vencido.
export async function updateRenewalPercentAction(percent: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  const value = typeof percent === "number" ? percent : Number(percent);
  if (!Number.isInteger(value) || value < 0 || value > 100) return { ok: false, error: "Tiene que ser un número entero entre 0 y 100." };
  await prisma.billingSettings.upsert({ where: { id: "default" }, create: { id: "default", renewalPercent: value }, update: { renewalPercent: value } });
  revalidatePath("/admin/prices");
  return { ok: true };
}
