import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasNoExpiryPlan } from "@/lib/subscriptions";

// VA-92: entrega de lo comprado y su reversión. Idempotente: Purchase.activatedAt se marca con un
// updateMany condicionado (activatedAt IS NULL) dentro de la misma transacción que acredita el
// saldo o activa los avisos; si dos webhooks del mismo pago llegan a la vez, solo uno gana.

export const LISTING_DAYS = 45;

type Tx = Prisma.TransactionClient;

/** Activa una compra (pago aprobado o cupón del 100%). Devuelve false si ya estaba activada. */
export async function activatePurchase(purchaseId: string, approvedAt = new Date()): Promise<boolean> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    select: { userId: true },
  });
  if (!purchase) throw new Error(`No existe la compra ${purchaseId}`);
  // Fuera de la transacción: solo lee la suscripción (no cambia con esta compra).
  const noExpiry = await hasNoExpiryPlan(purchase.userId);

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.purchase.updateMany({
      where: { id: purchaseId, activatedAt: null },
      data: { activatedAt: new Date(), approvedAt, paymentStatus: "APPROVED" },
    });
    if (claimed.count === 0) return false;

    const p = await tx.purchase.findUniqueOrThrow({
      where: { id: purchaseId },
      include: { plan: true, couponUsage: { select: { id: true } } },
    });

    // 1) Packs: acreditan saldo de publicaciones.
    if (p.plan && p.plan.billingType === "ONE_TIME") {
      await tx.user.update({
        where: { id: p.userId },
        data: {
          aircraftListingsBalance: { increment: p.plan.aircraftListingsCount },
          sparePartsListingsBalance: { increment: p.plan.sparePartsListingsCount },
          hangarListingsBalance: { increment: p.plan.hangarListingsCount },
        },
      });
    }

    // 2) Publicación suelta: el aviso "pendiente de pago" de esta compra se activa.
    await activateListings(tx, purchaseId, noExpiry);

    // 3) Banners: pasan a revisión del admin.
    await tx.adBanner.updateMany({
      where: { purchaseId, status: "PENDING_PAYMENT" },
      data: { status: "PENDING_REVIEW" },
    });

    // 4) Cupón: el uso se registra recién cuando la compra se concreta. Si el usuario lo había
    //    reclamado desde su perfil (uso sin compra), se consume ese en vez de crear otro.
    if (p.couponId && !p.couponUsage) {
      const claimed = await tx.couponUsage.findFirst({
        where: { couponId: p.couponId, userId: p.userId, purchaseId: null },
        select: { id: true },
      });
      if (claimed) await tx.couponUsage.update({ where: { id: claimed.id }, data: { purchaseId, usedAt: new Date() } });
      else await tx.couponUsage.create({ data: { couponId: p.couponId, userId: p.userId, purchaseId } });
      await tx.coupon.update({ where: { id: p.couponId }, data: { currentUses: { increment: 1 } } });
    }
    return true;
  });
}

export const BALANCE_FIELD = {
  AIRCRAFT: "aircraftListingsBalance",
  SPARE_PART: "sparePartsListingsBalance",
  HANGAR: "hangarListingsBalance",
} as const;

/** Activa los avisos "pendiente de pago" de la compra. Devuelve cuántos activó. */
async function activateListings(tx: Tx, purchaseId: string, noExpiry: boolean): Promise<number> {
  const now = new Date();
  const expiresAt = noExpiry ? null : new Date(now.getTime() + LISTING_DAYS * 24 * 60 * 60 * 1000);
  const data = { status: "ACTIVE" as const, listingStartsAt: now, listingExpiresAt: expiresAt };
  const where = { purchaseId, status: "PENDING_PAYMENT" as const };
  const counts = await Promise.all([
    tx.aircraft.updateMany({ where, data }),
    tx.sparePart.updateMany({ where, data }),
    tx.hangar.updateMany({ where, data }),
  ]);
  return counts.reduce((n, c) => n + c.count, 0);
}

/**
 * Reembolso total o contracargo: se retira lo comprado una sola vez (la transición de estado a
 * REFUNDED es la marca). El saldo no queda negativo: se descuenta lo que quede.
 */
export async function revokePurchase(purchaseId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.purchase.updateMany({
      where: { id: purchaseId, paymentStatus: { not: "REFUNDED" }, activatedAt: { not: null } },
      data: { paymentStatus: "REFUNDED" },
    });
    if (claimed.count === 0) return false;

    const p = await tx.purchase.findUniqueOrThrow({ where: { id: purchaseId }, include: { plan: true } });
    if (p.plan && p.plan.billingType === "ONE_TIME") {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: p.userId },
        select: { aircraftListingsBalance: true, sparePartsListingsBalance: true, hangarListingsBalance: true },
      });
      await tx.user.update({
        where: { id: p.userId },
        data: {
          aircraftListingsBalance: Math.max(0, user.aircraftListingsBalance - p.plan.aircraftListingsCount),
          sparePartsListingsBalance: Math.max(0, user.sparePartsListingsBalance - p.plan.sparePartsListingsCount),
          hangarListingsBalance: Math.max(0, user.hangarListingsBalance - p.plan.hangarListingsCount),
        },
      });
    }
    // Avisos pagados con esta compra: vuelven a "pendiente de pago" (no se ven en el sitio).
    const where = { purchaseId, status: "ACTIVE" as const };
    const data = { status: "PENDING_PAYMENT" as const };
    await Promise.all([
      tx.aircraft.updateMany({ where, data }),
      tx.sparePart.updateMany({ where, data }),
      tx.hangar.updateMany({ where, data }),
    ]);
    await tx.adBanner.updateMany({
      where: { purchaseId, status: { in: ["PENDING_REVIEW", "ACTIVE"] } },
      data: { status: "REJECTED" },
    });
    return true;
  });
}
