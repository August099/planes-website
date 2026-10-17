import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { noExpiryKinds, type ListingKind } from "@/lib/subscriptions";
import { renewedExpiry } from "@/lib/renewal";
import { grantCreditLot, recordFunding, type Funding } from "@/lib/balances";
import { applyReversal, type ReversalSummary } from "@/lib/payments/reversal";

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
  const noExpiry = await noExpiryKinds(purchase.userId);

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

    // VA-150: con qué se pagó (para el arrepentimiento). Un cupón del 100% no tiene arrepentimiento.
    const paidWith: Funding = { source: Number(p.finalPrice) > 0 ? "SINGLE_PAYMENT" : "COUPON_100", purchaseId };

    // 1) Packs: acreditan saldo de publicaciones, como un lote propio (VA-150).
    if (p.plan && p.plan.billingType === "ONE_TIME") {
      await grantCreditLot(tx, { userId: p.userId, kind: "AIRCRAFT", source: "PACK", amount: p.plan.aircraftListingsCount, purchaseId });
      await grantCreditLot(tx, { userId: p.userId, kind: "SPARE_PART", source: "PACK", amount: p.plan.sparePartsListingsCount, purchaseId });
      await grantCreditLot(tx, { userId: p.userId, kind: "HANGAR", source: "PACK", amount: p.plan.hangarListingsCount, purchaseId });
    }

    // 2) Publicación suelta: el aviso "pendiente de pago" de esta compra se activa.
    const activated = await activateListings(tx, purchaseId, noExpiry);
    for (const l of activated) await recordFunding(tx, { userId: p.userId, kind: l.kind, listingId: l.id, reason: "PUBLISH", funding: paidWith });

    // 2b) VA-105: renovación paga: el aviso vuelve a estar activo 45 días más (sin fecha si el plan
    //     vigente deja ese tipo sin vencimiento).
    if (p.renewalKind && p.renewalListingId) {
      const model = p.renewalKind === "AIRCRAFT" ? tx.aircraft : tx.sparePart;
      const current = await (model as typeof tx.aircraft).findFirst({ where: { id: p.renewalListingId, sellerId: p.userId }, select: { listingExpiresAt: true, status: true } });
      if (current && current.status !== "SOLD") {
        // VA-150: se guarda el vencimiento anterior para poder volver a él si se arrepiente.
        await recordFunding(tx, { userId: p.userId, kind: p.renewalKind, listingId: p.renewalListingId, reason: "RENEWAL", funding: paidWith, previousExpiresAt: current.listingExpiresAt });
        await (model as typeof tx.aircraft).update({
          where: { id: p.renewalListingId },
          data: { status: "ACTIVE", listingExpiresAt: noExpiry.has(p.renewalKind) ? null : renewedExpiry(current.listingExpiresAt) },
        });
      }
    }

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

// VA-150: definido en lib/balances.ts (orden de consumo y lotes).
export { BALANCE_FIELD } from "@/lib/balances";

/** Activa los avisos "pendiente de pago" de la compra. Devuelve cuáles activó. */
async function activateListings(tx: Tx, purchaseId: string, noExpiry: Set<ListingKind>): Promise<{ kind: ListingKind; id: string }[]> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LISTING_DAYS * 24 * 60 * 60 * 1000);
  // VA-105: sin vencimiento solo para los tipos que el plan vigente tiene ilimitados.
  const data = (kind: ListingKind) => ({ status: "ACTIVE" as const, listingStartsAt: now, listingExpiresAt: noExpiry.has(kind) ? null : expiresAt });
  const where = { purchaseId, status: "PENDING_PAYMENT" as const };
  const select = { id: true } as const;
  const [aircraft, parts, hangars] = await Promise.all([tx.aircraft.findMany({ where, select }), tx.sparePart.findMany({ where, select }), tx.hangar.findMany({ where, select })]);
  await Promise.all([
    tx.aircraft.updateMany({ where, data: data("AIRCRAFT") }),
    tx.sparePart.updateMany({ where, data: data("SPARE_PART") }),
    tx.hangar.updateMany({ where, data: data("HANGAR") }),
  ]);
  return [
    ...aircraft.map((a) => ({ kind: "AIRCRAFT" as const, id: a.id })),
    ...parts.map((a) => ({ kind: "SPARE_PART" as const, id: a.id })),
    ...hangars.map((a) => ({ kind: "HANGAR" as const, id: a.id })),
  ];
}

/**
 * Reembolso total o contracargo (botón de arrepentimiento, reembolso a mano en Mercado Pago o
 * contracargo): se retira lo obtenido con esta compra una sola vez (la transición a REFUNDED es la
 * marca). VA-150: el detalle de qué se retira está en lib/payments/reversal.ts.
 */
export async function revokePurchase(purchaseId: string, paymentId: string | null = null): Promise<ReversalSummary | null> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.purchase.updateMany({
      where: { id: purchaseId, paymentStatus: { not: "REFUNDED" }, activatedAt: { not: null } },
      data: { paymentStatus: "REFUNDED" },
    });
    if (claimed.count === 0) return null;
    const summary = await applyReversal(tx, { purchaseId }, paymentId);
    await tx.adBanner.updateMany({
      where: { purchaseId, status: { in: ["PENDING_REVIEW", "ACTIVE"] } },
      data: { status: "REJECTED" },
    });
    return summary;
  });
}
