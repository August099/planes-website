import "server-only";
import type { ListingKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getListingPrices } from "@/lib/listing-prices";
import { currentSubscriptionWhere } from "@/lib/subscriptions";

// VA-94: datos para los CTA de planes (discretos, sin pop-ups): qué cubre lo que ya tiene el usuario
// y cuánto ahorra con un pack frente a la publicación suelta.

export type PackSaving = { planId: string; name: string; count: number; perListing: number; single: number; savingPercent: number };

const COUNT_FIELD = { AIRCRAFT: "aircraftListingsCount", SPARE_PART: "sparePartsListingsCount", HANGAR: "hangarListingsCount" } as const;
const PACK_TYPE = { AIRCRAFT: "AIRCRAFT_PACK", SPARE_PART: "SPARE_PART_PACK", HANGAR: "HANGAR_PACK" } as const;

/** El pack activo con el menor precio por aviso, si ahorra frente a la publicación suelta. */
export async function bestPackSaving(kind: ListingKind): Promise<PackSaving | null> {
  const [prices, packs] = await Promise.all([
    getListingPrices(),
    prisma.plan.findMany({ where: { type: PACK_TYPE[kind], isActive: true, archivedAt: null } }),
  ]);
  const single = prices[kind].amount;
  if (single <= 0) return null;
  let best: PackSaving | null = null;
  for (const p of packs) {
    const count = p[COUNT_FIELD[kind]];
    if (count < 2) continue;
    const perListing = Number(p.price) / count;
    const savingPercent = Math.round((1 - perListing / single) * 100);
    if (savingPercent <= 0) continue;
    if (!best || perListing < best.perListing) best = { planId: p.id, name: p.name, count, perListing, single, savingPercent };
  }
  return best;
}

/** ¿Tiene una suscripción vigente (o en gracia)? */
export async function hasCurrentSubscription(userId: string): Promise<boolean> {
  return !!(await prisma.subscription.findFirst({ where: currentSubscriptionWhere(userId), select: { id: true } }));
}

/**
 * CTA "al publicar el 2.º aviso sin plan": solo si no tiene suscripción ni saldo para ese tipo, ya
 * publicó al menos uno de ese tipo y hay un pack que ahorra.
 */
export async function secondListingHint(userId: string, kind: "AIRCRAFT" | "SPARE_PART"): Promise<PackSaving | null> {
  if (await hasCurrentSubscription(userId)) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { aircraftListingsBalance: true, sparePartsListingsBalance: true } });
  const balance = kind === "AIRCRAFT" ? user?.aircraftListingsBalance : user?.sparePartsListingsBalance;
  if ((balance ?? 0) > 0) return null;
  const listings = kind === "AIRCRAFT" ? await prisma.aircraft.count({ where: { sellerId: userId } }) : await prisma.sparePart.count({ where: { sellerId: userId } });
  if (listings < 1) return null;
  return bestPackSaving(kind);
}
