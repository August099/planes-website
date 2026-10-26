import "server-only";
import { prisma } from "@/lib/prisma";

// VA-92: entrega de lo comprado y su reversión. Idempotente: Purchase.activatedAt se marca con un
// updateMany condicionado (activatedAt IS NULL) dentro de la misma transacción que entrega la compra;
// si dos webhooks del mismo pago llegan a la vez, solo uno gana.
// VA-152: ya no se venden avisos sueltos, packs ni renovaciones (cupos fijos, lib/quota.ts). Queda el
// camino genérico de las compras de pago único (banners, VA-103, y cupones) para cuando se usen.

/** Activa una compra (pago aprobado o cupón del 100%). Devuelve false si ya estaba activada. */
export async function activatePurchase(purchaseId: string, approvedAt = new Date()): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.purchase.updateMany({
      where: { id: purchaseId, activatedAt: null },
      data: { activatedAt: new Date(), approvedAt, paymentStatus: "APPROVED" },
    });
    if (claimed.count === 0) return false;

    const p = await tx.purchase.findUniqueOrThrow({
      where: { id: purchaseId },
      include: { couponUsage: { select: { id: true } } },
    });

    // Banners: pasan a revisión del admin.
    await tx.adBanner.updateMany({
      where: { purchaseId, status: "PENDING_PAYMENT" },
      data: { status: "PENDING_REVIEW" },
    });

    // Cupón: el uso se registra recién cuando la compra se concreta. Si el usuario lo había
    // reclamado desde su perfil (uso sin compra), se consume ese en vez de crear otro.
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

/**
 * Reembolso total o contracargo de una compra de pago único: se marca una sola vez (la transición a
 * REFUNDED es la marca) y los banners de esa compra quedan rechazados. Devuelve false si ya estaba.
 */
export async function revokePurchase(purchaseId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.purchase.updateMany({
      where: { id: purchaseId, paymentStatus: { not: "REFUNDED" }, activatedAt: { not: null } },
      data: { paymentStatus: "REFUNDED" },
    });
    if (claimed.count === 0) return false;
    await tx.adBanner.updateMany({
      where: { purchaseId, status: { in: ["PENDING_REVIEW", "ACTIVE"] } },
      data: { status: "REJECTED" },
    });
    return true;
  });
}
