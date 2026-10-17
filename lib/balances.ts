import "server-only";
import { Prisma, type CreditSource, type FundingReason, type FundingSource, type ListingKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentSubscriptionWhere } from "@/lib/subscriptions";

// VA-150: saldo de publicaciones por lote (CreditLot) y registro de con qué se pagó cada aviso
// (ListingFunding). User.*ListingsBalance sigue siendo el total: se actualiza en la misma transacción
// que el lote, así las pantallas que lo leen no cambian.
//
// ORDEN ÚNICO DE CONSUMO (al publicar):
//   1. la suscripción vigente que cubre ese tipo de aviso;
//   2. el saldo de lanzamiento (LAUNCH) y el que ya existía antes de VA-150 (LEGACY);
//   3. el que dio un admin (ADMIN);
//   4. los packs (PACK), del más viejo al más nuevo.
// Así, al arrepentirse de un pack, se sabe exactamente qué avisos salieron de ese pack.

type Db = Prisma.TransactionClient | typeof prisma;

export const BALANCE_FIELD = {
  AIRCRAFT: "aircraftListingsBalance",
  SPARE_PART: "sparePartsListingsBalance",
  HANGAR: "hangarListingsBalance",
} as const;

const UNLIMITED = { AIRCRAFT: "isUnlimitedAircraft", SPARE_PART: "isUnlimitedSpareParts", HANGAR: "isUnlimitedHangars" } as const;
const INCLUDED = { AIRCRAFT: "aircraftListingsCount", SPARE_PART: "sparePartsListingsCount", HANGAR: "hangarListingsCount" } as const;

const LOT_FUNDING: Record<CreditSource, FundingSource> = {
  LAUNCH: "LAUNCH_BALANCE",
  LEGACY: "LEGACY_BALANCE",
  ADMIN: "ADMIN",
  PACK: "PACK",
};

/** Con qué se paga un aviso. null = no hay saldo ni suscripción: queda "pendiente de pago". */
export type Funding = { source: FundingSource; subscriptionId?: string; creditLotId?: string; purchaseId?: string | null };

/** Saldo disponible (el total de User, que coincide con la suma de los lotes). */
export async function getUserBalances(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aircraftListingsBalance: true, sparePartsListingsBalance: true },
  });
  return { aircraftBalance: user?.aircraftListingsBalance ?? 0, sparePartsBalance: user?.sparePartsListingsBalance ?? 0 };
}

/** ¿La suscripción vigente cubre un aviso más de este tipo? Devuelve su id. */
async function coveringSubscription(userId: string, kind: ListingKind): Promise<string | null> {
  const sub = await prisma.subscription.findFirst({ where: currentSubscriptionWhere(userId), select: { id: true, plan: true } });
  if (!sub) return null;
  if (sub.plan[UNLIMITED[kind]]) return sub.id;
  const included = sub.plan[INCLUDED[kind]];
  if (included <= 0) return null;
  const where = { sellerId: userId, status: "ACTIVE" as const };
  const active =
    kind === "AIRCRAFT" ? await prisma.aircraft.count({ where }) : kind === "SPARE_PART" ? await prisma.sparePart.count({ where }) : await prisma.hangar.count({ where });
  return active < included ? sub.id : null;
}

/**
 * Reserva el permiso para publicar un aviso según el orden único. Con saldo, descuenta 1 del lote
 * que corresponde (fila bloqueada: dos publicaciones a la vez no usan el mismo crédito).
 */
export async function takeListingAllowance(userId: string, kind: ListingKind): Promise<Funding | null> {
  const subscriptionId = await coveringSubscription(userId, kind);
  if (subscriptionId) return { source: "SUBSCRIPTION", subscriptionId };

  return prisma.$transaction(async (tx) => {
    const [lot] = await tx.$queryRaw<{ id: string; source: CreditSource; purchaseId: string | null }[]>`
      SELECT "id", "source", "purchaseId" FROM "CreditLot"
      WHERE "userId" = ${userId} AND "kind" = ${kind}::"ListingKind" AND "remaining" > 0 AND "revokedAt" IS NULL
      ORDER BY CASE "source" WHEN 'LAUNCH' THEN 0 WHEN 'LEGACY' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END, "createdAt", "id"
      LIMIT 1
      FOR UPDATE`;
    if (!lot) return null;
    await tx.creditLot.update({ where: { id: lot.id }, data: { remaining: { decrement: 1 } } });
    await tx.user.update({ where: { id: userId }, data: { [BALANCE_FIELD[kind]]: { decrement: 1 } } });
    return { source: LOT_FUNDING[lot.source], creditLotId: lot.id, purchaseId: lot.purchaseId };
  });
}

/** Si la publicación no se pudo crear, devuelve el crédito al mismo lote. */
export async function returnListingAllowance(userId: string, kind: ListingKind, funding: Funding | null) {
  if (!funding?.creditLotId) return;
  await prisma.$transaction([
    prisma.creditLot.update({ where: { id: funding.creditLotId }, data: { remaining: { increment: 1 } } }),
    prisma.user.update({ where: { id: userId }, data: { [BALANCE_FIELD[kind]]: { increment: 1 } } }),
  ]);
}

/** Suma saldo como un lote nuevo (pack comprado, lanzamiento o admin). */
export async function grantCreditLot(db: Db, input: { userId: string; kind: ListingKind; source: CreditSource; amount: number; purchaseId?: string }) {
  if (input.amount <= 0) return;
  await db.creditLot.create({
    data: { userId: input.userId, kind: input.kind, source: input.source, purchaseId: input.purchaseId ?? null, granted: input.amount, remaining: input.amount },
  });
  await db.user.update({ where: { id: input.userId }, data: { [BALANCE_FIELD[input.kind]]: { increment: input.amount } } });
}

/** Deja asentado con qué se pagó una publicación, renovación o destacado. */
export async function recordFunding(
  db: Db,
  input: {
    userId: string;
    kind: ListingKind;
    listingId: string;
    reason: FundingReason;
    funding: Funding;
    previousExpiresAt?: Date | null;
    previousFeaturedUntil?: Date | null;
  }
) {
  await db.listingFunding.create({
    data: {
      userId: input.userId,
      listingKind: input.kind,
      listingId: input.listingId,
      reason: input.reason,
      source: input.funding.source,
      purchaseId: input.funding.purchaseId ?? null,
      subscriptionId: input.funding.subscriptionId ?? null,
      creditLotId: input.funding.creditLotId ?? null,
      previousExpiresAt: input.previousExpiresAt ?? null,
      previousFeaturedUntil: input.previousFeaturedUntil ?? null,
    },
  });
}
