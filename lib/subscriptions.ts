import "server-only";
import { prisma } from "@/lib/prisma";

// Regla única de "suscripción vigente" (VA-80 / VA-92): ACTIVE con el período pagado sin terminar
// (si se pidió cancelar, sigue vigente hasta currentPeriodEnd), o PAST_DUE (cobro rechazado) mientras
// dure la gracia. La usan los beneficios (página personalizada, avisos sin vencimiento, saldo de
// publicaciones) y la cortesía.
export function currentSubscriptionWhere(userId: string, now = new Date()) {
  return {
    userId,
    OR: [
      { status: "ACTIVE" as const, currentPeriodEnd: { gt: now } },
      { status: "PAST_DUE" as const, graceUntil: { gt: now } },
    ],
  };
}

export function isSubscriptionCurrent(
  s: { status: string; currentPeriodEnd: Date; graceUntil: Date | null },
  now = new Date()
): boolean {
  if (s.status === "ACTIVE") return s.currentPeriodEnd > now;
  if (s.status === "PAST_DUE") return !!s.graceUntil && s.graceUntil > now;
  return false;
}

// Beneficios de suscripción (VA-87): "Página personalizada" con un plan que la incluye. Si vence, el
// perfil vuelve al diseño común sin borrar los datos cargados.
export async function hasCustomPage(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { ...currentSubscriptionWhere(userId), plan: { includesCustomPage: true } },
    select: { id: true },
  });
  return !!sub;
}

/** VA-105 (14/10): "Cuenta verificada" sale del plan (includesVerifiedBadge), no de la Página VA. */
export async function hasVerifiedBadge(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { ...currentSubscriptionWhere(userId), plan: { includesVerifiedBadge: true } },
    select: { id: true },
  });
  return !!sub;
}

export type ListingKind = "AIRCRAFT" | "SPARE_PART" | "HANGAR";
const LISTING_DAYS_MS = 45 * 24 * 60 * 60 * 1000;

/**
 * VA-80 / VA-105 (14/10): tipos de aviso que no vencen con el plan vigente. "Sin vencimiento" vale
 * solo para lo que el plan tiene ilimitado: el Plan Repuestos no frena el vencimiento de los aviones.
 */
export async function noExpiryKinds(userId: string, now = new Date()): Promise<Set<ListingKind>> {
  const sub = await prisma.subscription.findFirst({
    where: { ...currentSubscriptionWhere(userId, now), plan: { noExpiry: true } },
    select: { plan: { select: { isUnlimitedAircraft: true, isUnlimitedSpareParts: true, isUnlimitedHangars: true } } },
  });
  const kinds = new Set<ListingKind>();
  if (sub?.plan.isUnlimitedAircraft) kinds.add("AIRCRAFT");
  if (sub?.plan.isUnlimitedSpareParts) kinds.add("SPARE_PART");
  if (sub?.plan.isUnlimitedHangars) kinds.add("HANGAR");
  return kinds;
}

/** El plan vigente hace que los avisos de este tipo no venzan (ni haya que renovarlos). */
export async function hasNoExpiryPlan(userId: string, kind: ListingKind): Promise<boolean> {
  return (await noExpiryKinds(userId)).has(kind);
}

/**
 * VA-105: alinea las fechas de vencimiento con el plan vigente. Lo cubierto queda sin fecha (también
 * lo vencido que seguía ACTIVE: no hace falta renovarlo); lo no cubierto que no tenía fecha vuelve a
 * vencer en 45 días. Se llama al activar, cambiar o terminar una suscripción o cortesía.
 */
export async function syncListingExpiry(userId: string, now = new Date()) {
  const kinds = await noExpiryKinds(userId, now);
  const restoreAt = new Date(now.getTime() + LISTING_DAYS_MS);
  const base = { sellerId: userId, status: "ACTIVE" as const };
  // VA-150: lo que la suscripción deja sin vencimiento queda registrado con su vencimiento anterior:
  // si se arrepiente de ese cobro, vuelve a él (y no a 45 días desde ese momento).
  const sub = kinds.size ? await prisma.subscription.findFirst({ where: currentSubscriptionWhere(userId, now), select: { id: true } }) : null;
  const models = { AIRCRAFT: prisma.aircraft, SPARE_PART: prisma.sparePart, HANGAR: prisma.hangar } as unknown as Record<ListingKind, typeof prisma.aircraft>;
  for (const kind of ["AIRCRAFT", "SPARE_PART", "HANGAR"] as const) {
    const model = models[kind];
    if (kinds.has(kind)) {
      const dated = await model.findMany({ where: { ...base, listingExpiresAt: { not: null } }, select: { id: true, listingExpiresAt: true } });
      if (!dated.length) continue;
      if (sub) {
        await prisma.listingFunding.createMany({
          data: dated.map((l) => ({ userId, listingKind: kind, listingId: l.id, reason: "RENEWAL" as const, source: "SUBSCRIPTION" as const, subscriptionId: sub.id, previousExpiresAt: l.listingExpiresAt })),
        });
      }
      await model.updateMany({ where: { id: { in: dated.map((l) => l.id) } }, data: { listingExpiresAt: null } });
    } else {
      await model.updateMany({ where: { ...base, listingExpiresAt: null }, data: { listingExpiresAt: restoreAt } });
    }
  }
}

/** VA-80: suscripción del usuario (vigente o no) para mostrar en su perfil. */
export async function getSubscriptionSummary(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      source: true,
      graceUntil: true,
      mpSubscriptionId: true,
      planId: true,
      plan: { select: { name: true, price: true, billingInterval: true, noExpiry: true, isUnlimitedAircraft: true, isUnlimitedSpareParts: true } },
    },
  });
  if (!sub) return null;
  // VA-105: qué avisos no vencen (solo lo que el plan tiene ilimitado).
  const { isUnlimitedAircraft: a, isUnlimitedSpareParts: r } = sub.plan;
  const noExpiry = sub.plan.noExpiry && (a || r);
  const noExpiryLabel = a && r ? "tus avisos" : a ? "tus avisos de aviones" : "tus avisos de repuestos";
  return {
    planName: sub.plan.name,
    price: Number(sub.plan.price),
    interval: sub.plan.billingInterval,
    noExpiry,
    noExpiryLabel,
    status: sub.status,
    active: isSubscriptionCurrent(sub),
    // VA-92: cobro rechazado, en gracia hasta esta fecha (sigue con los beneficios).
    graceUntil: sub.status === "PAST_DUE" && sub.graceUntil ? sub.graceUntil.toISOString() : null,
    planId: sub.planId,
    hasMercadoPago: !!sub.mpSubscriptionId,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    // VA-92: plan de cortesía asignado por un admin (no se cobra, no se renueva ni se cancela).
    courtesy: sub.source === "MANUAL",
  };
}
export type SubscriptionSummary = NonNullable<Awaited<ReturnType<typeof getSubscriptionSummary>>>;
