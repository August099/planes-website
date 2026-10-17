import "server-only";
import { Prisma, type ListingKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BALANCE_FIELD } from "@/lib/balances";

// VA-150: ÚNICO camino para retirar lo obtenido con un pago reembolsado. Lo usan el botón de
// arrepentimiento, un reembolso hecho a mano desde el panel de Mercado Pago y un contracargo (los
// dos últimos llegan por el webhook). Todo en una transacción e idempotente: cada consumo se marca
// revertido una sola vez (revertedAt) y los lotes una sola vez (revokedAt), así un reenvío del
// webhook, un doble clic o el webhook y el botón a la vez nunca revierten dos veces.
//
// Qué se retira (spec VA-150, tabla 2):
// - Publicación pagada con ese pago (suelto, pack o suscripción) → "pendiente de pago" (no se borra).
// - Renovación → vuelve al vencimiento que tenía antes (si ya pasó, queda vencido).
// - Destacado → se quita (featuredUntil = ahora).
// - Pack → se descuentan los créditos que no se usaron.
// - Cupón usado en ese pago → se libera el uso.
// Lo vendido o borrado no se toca. Lo pagado con el saldo de lanzamiento, de antes de VA-150 o de
// otro pago queda como estaba.

type Tx = Prisma.TransactionClient;
type ListingRef = { kind: ListingKind; id: string; title: string };

export type ReversalSummary = {
  toPending: ListingRef[];
  renewalsReverted: ListingRef[];
  featuredRemoved: ListingRef[];
  creditsRemoved: Partial<Record<ListingKind, number>>;
  couponReleased: boolean;
};

const EMPTY: ReversalSummary = { toPending: [], renewalsReverted: [], featuredRemoved: [], creditsRemoved: {}, couponReleased: false };

/** Qué consumos alcanza el reembolso: los de la compra, o los de la suscripción desde ese cobro. */
type Target = { purchaseId: string } | { subscriptionId: string; since: Date };

function fundingWhere(t: Target): Prisma.ListingFundingWhereInput {
  return "purchaseId" in t
    ? { purchaseId: t.purchaseId, revertedAt: null }
    : { subscriptionId: t.subscriptionId, createdAt: { gte: t.since }, revertedAt: null };
}

function model(tx: Tx | typeof prisma, kind: ListingKind) {
  return (kind === "AIRCRAFT" ? tx.aircraft : kind === "SPARE_PART" ? tx.sparePart : tx.hangar) as unknown as typeof tx.aircraft;
}

async function listing(db: Tx | typeof prisma, kind: ListingKind, id: string) {
  return model(db, kind).findUnique({ where: { id }, select: { id: true, title: true, status: true } });
}

/** Lo que se va a retirar, sin cambiar nada (para el diálogo de confirmación). */
export async function previewReversal(t: Target, db: Tx | typeof prisma = prisma): Promise<ReversalSummary> {
  const summary: ReversalSummary = { ...EMPTY, toPending: [], renewalsReverted: [], featuredRemoved: [], creditsRemoved: {} };
  const fundings = await db.listingFunding.findMany({ where: fundingWhere(t), orderBy: { createdAt: "asc" } });
  for (const f of fundings) {
    const l = await listing(db, f.listingKind, f.listingId);
    if (!l || l.status === "SOLD") continue;
    const ref = { kind: f.listingKind, id: l.id, title: l.title };
    if (f.reason === "PUBLISH" && l.status !== "PENDING_PAYMENT") summary.toPending.push(ref);
    if (f.reason === "RENEWAL") summary.renewalsReverted.push(ref);
    if (f.reason === "FEATURED") summary.featuredRemoved.push(ref);
  }
  if ("purchaseId" in t) {
    // Avisos sueltos pagados con esta compra (Purchase ↔ aviso), aunque no tengan consumo registrado.
    for (const kind of ["AIRCRAFT", "SPARE_PART", "HANGAR"] as const) {
      const rows = await model(db, kind).findMany({ where: { purchaseId: t.purchaseId, status: { notIn: ["SOLD", "PENDING_PAYMENT"] } }, select: { id: true, title: true } });
      for (const r of rows) if (!summary.toPending.some((x) => x.id === r.id)) summary.toPending.push({ kind, id: r.id, title: r.title });
    }
    const lots = await db.creditLot.findMany({ where: { purchaseId: t.purchaseId, revokedAt: null, remaining: { gt: 0 } } });
    for (const lot of lots) summary.creditsRemoved[lot.kind] = (summary.creditsRemoved[lot.kind] ?? 0) + lot.remaining;
    summary.couponReleased = (await db.couponUsage.count({ where: { purchaseId: t.purchaseId } })) > 0;
  }
  return summary;
}

/** Aplica la reversión dentro de la transacción recibida. Devuelve lo que efectivamente retiró. */
export async function applyReversal(tx: Tx, t: Target, paymentId: string | null): Promise<ReversalSummary> {
  const summary = await previewReversal(t, tx);
  const now = new Date();
  const fundings = await tx.listingFunding.findMany({ where: fundingWhere(t) });

  for (const f of fundings) {
    // Se marca revertido primero y de forma condicionada: si otro proceso ya lo hizo, no se repite.
    const claimed = await tx.listingFunding.updateMany({ where: { id: f.id, revertedAt: null }, data: { revertedAt: now, revertedPaymentId: paymentId } });
    if (claimed.count === 0) continue;
    const m = model(tx, f.listingKind);
    const notSold = { id: f.listingId, status: { not: "SOLD" as const } };
    if (f.reason === "PUBLISH") {
      await m.updateMany({ where: { ...notSold, status: { notIn: ["SOLD", "PENDING_PAYMENT"] } }, data: { status: "PENDING_PAYMENT" } });
    } else if (f.reason === "RENEWAL") {
      await m.updateMany({ where: notSold, data: { listingExpiresAt: f.previousExpiresAt } });
    } else if (f.reason === "FEATURED") {
      await m.updateMany({ where: notSold, data: { featuredUntil: now } as never });
    }
  }

  if ("purchaseId" in t) {
    // Avisos sueltos de la compra (también los anteriores a VA-150, que no tienen consumo).
    for (const kind of ["AIRCRAFT", "SPARE_PART", "HANGAR"] as const) {
      await model(tx, kind).updateMany({ where: { purchaseId: t.purchaseId, status: { notIn: ["SOLD", "PENDING_PAYMENT"] } }, data: { status: "PENDING_PAYMENT" } });
    }
    // Pack: se quitan los créditos que no se usaron (los usados ya volvieron a pendiente arriba).
    const lots = await tx.creditLot.findMany({ where: { purchaseId: t.purchaseId, revokedAt: null } });
    for (const lot of lots) {
      const revoked = await tx.creditLot.updateMany({ where: { id: lot.id, revokedAt: null }, data: { revokedAt: now, remaining: 0 } });
      if (revoked.count === 0 || lot.remaining <= 0) continue;
      const field = BALANCE_FIELD[lot.kind];
      const user = await tx.user.findUniqueOrThrow({ where: { id: lot.userId }, select: { [field]: true } as never });
      const current = Number((user as Record<string, number>)[field] ?? 0);
      await tx.user.update({ where: { id: lot.userId }, data: { [field]: Math.max(0, current - lot.remaining) } });
    }
    // Cupón: se libera el uso.
    const usage = await tx.couponUsage.findFirst({ where: { purchaseId: t.purchaseId }, select: { id: true, couponId: true } });
    if (usage) {
      await tx.couponUsage.delete({ where: { id: usage.id } });
      await tx.coupon.updateMany({ where: { id: usage.couponId, currentUses: { gt: 0 } }, data: { currentUses: { decrement: 1 } } });
    }
  }
  return summary;
}

/** Texto para el usuario (diálogo y mail). */
export function describeReversal(s: ReversalSummary, extra: { subscriptionEnds?: boolean } = {}): string[] {
  const lines: string[] = [];
  const titles = (l: ListingRef[]) => l.map((x) => `“${x.title}”`).join(", ");
  if (extra.subscriptionEnds) lines.push("Se cancela tu suscripción en el momento (también el débito en Mercado Pago).");
  if (s.toPending.length) lines.push(`${s.toPending.length === 1 ? "Este aviso vuelve" : `Estos ${s.toPending.length} avisos vuelven`} a “pendiente de pago” y deja${s.toPending.length === 1 ? "" : "n"} de verse: ${titles(s.toPending)}.`);
  if (s.renewalsReverted.length) lines.push(`Se deshace la renovación de ${titles(s.renewalsReverted)}: vuelve${s.renewalsReverted.length === 1 ? "" : "n"} al vencimiento anterior.`);
  if (s.featuredRemoved.length) lines.push(`Se quita el destacado de ${titles(s.featuredRemoved)}.`);
  const credits = Object.entries(s.creditsRemoved).filter(([, n]) => (n ?? 0) > 0);
  if (credits.length) {
    const label: Record<string, string> = { AIRCRAFT: "de avión", SPARE_PART: "de repuesto", HANGAR: "de hangar" };
    lines.push(`Se descuentan del saldo los créditos sin usar: ${credits.map(([k, n]) => `${n} ${label[k]}`).join(" y ")}.`);
  }
  if (s.couponReleased) lines.push("El cupón que usaste queda libre para volver a usarlo.");
  return lines;
}
