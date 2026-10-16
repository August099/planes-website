import "server-only";
import type { ListingKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BALANCE_FIELD } from "@/lib/payments/activation";
import { currentSubscriptionWhere } from "@/lib/subscriptions";

// VA-92 (decisión del socio, 12/10): al publicar, primero cubre la suscripción vigente; si no, se
// descuenta 1 del saldo (packs); sin ninguna de las dos, el aviso queda "pendiente de pago" y va a
// /checkout. La promoción de lanzamiento es un cupón del 100% (administrable en /admin/coupons).

export type AllowanceSource = "subscription" | "balance" | null;

const UNLIMITED = { AIRCRAFT: "isUnlimitedAircraft", SPARE_PART: "isUnlimitedSpareParts", HANGAR: "isUnlimitedHangars" } as const;
const INCLUDED = { AIRCRAFT: "aircraftListingsCount", SPARE_PART: "sparePartsListingsCount", HANGAR: "hangarListingsCount" } as const;

/** ¿La suscripción vigente cubre un aviso más de este tipo? */
async function subscriptionCovers(userId: string, kind: ListingKind): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({ where: currentSubscriptionWhere(userId), select: { plan: true } });
  if (!sub) return false;
  if (sub.plan[UNLIMITED[kind]]) return true;
  const included = sub.plan[INCLUDED[kind]];
  if (included <= 0) return false;
  const where = { sellerId: userId, status: "ACTIVE" as const };
  const active =
    kind === "AIRCRAFT"
      ? await prisma.aircraft.count({ where })
      : kind === "SPARE_PART"
        ? await prisma.sparePart.count({ where })
        : await prisma.hangar.count({ where });
  return active < included;
}

/** Reserva el permiso para publicar un aviso. Con saldo, lo descuenta de forma atómica. */
export async function consumeListingAllowance(userId: string, kind: ListingKind): Promise<AllowanceSource> {
  if (await subscriptionCovers(userId, kind)) return "subscription";
  const field = BALANCE_FIELD[kind];
  const taken = await prisma.user.updateMany({
    where: { id: userId, [field]: { gt: 0 } },
    data: { [field]: { decrement: 1 } },
  });
  return taken.count === 1 ? "balance" : null;
}

/** Si la publicación no se pudo crear, devuelve el crédito descontado. */
export async function refundListingAllowance(userId: string, kind: ListingKind, source: AllowanceSource) {
  if (source !== "balance") return;
  await prisma.user.update({ where: { id: userId }, data: { [BALANCE_FIELD[kind]]: { increment: 1 } } });
}
