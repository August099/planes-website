import "server-only";
import { prisma } from "@/lib/prisma";
import { isSubscriptionCurrent } from "@/lib/subscriptions";
import { enforceQuota } from "@/lib/quota";

// VA-92: plan de cortesía (suscripción MANUAL). Lo asigna un admin a un usuario hasta una fecha:
// sin Mercado Pago (mpSubscriptionId vacío), no se cobra ni se renueva, y no cuenta en ingresos ni
// en los KPIs de cobertura (VA-102). Al vencer, el usuario pierde los beneficios como cualquier otra
// suscripción (currentPeriodEnd).

export type CourtesyResult = { ok: true } | { ok: false; error: string };

const MAX_YEARS = 5;

export async function grantCourtesyPlan(input: {
  adminId: string;
  userId: string;
  planId: string;
  until: Date;
  note?: string;
}): Promise<CourtesyResult> {
  const now = new Date();
  if (!(input.until instanceof Date) || Number.isNaN(input.until.getTime()) || input.until <= now) {
    return { ok: false, error: "Elegí una fecha de vencimiento futura." };
  }
  const max = new Date(now);
  max.setFullYear(max.getFullYear() + MAX_YEARS);
  if (input.until > max) return { ok: false, error: `Hasta ${MAX_YEARS} años.` };

  const [plan, user, current] = await Promise.all([
    prisma.plan.findUnique({ where: { id: input.planId }, select: { billingType: true, archivedAt: true, tier: true } }),
    prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, isAdmin: true } }),
    prisma.subscription.findUnique({ where: { userId: input.userId }, select: { source: true, status: true, currentPeriodEnd: true, graceUntil: true } }),
  ]);
  if (!user) return { ok: false, error: "El usuario no existe." };
  // VA-174: los admins ya tienen el Broker completo, sin suscripción ni cortesía.
  if (user.isAdmin) return { ok: false, error: "Los admins ya tienen todo lo del Broker incluido." };
  if (!plan || plan.archivedAt || plan.billingType !== "SUBSCRIPTION" || plan.tier === "BASE") {
    return { ok: false, error: "Elegí un plan de suscripción vigente." };
  }
  // Una suscripción paga vigente no se pisa: primero hay que cancelarla.
  if (current && current.source === "MERCADOPAGO" && (isSubscriptionCurrent(current, now) || current.status === "PENDING")) {
    return { ok: false, error: "El usuario tiene una suscripción paga vigente." };
  }

  const data = {
    planId: input.planId,
    status: "ACTIVE" as const,
    source: "MANUAL" as const,
    mpSubscriptionId: null,
    mpStatus: null,
    currentPeriodStart: now,
    currentPeriodEnd: input.until,
    cancelAtPeriodEnd: false,
    graceUntil: null,
    grantedById: input.adminId,
    note: input.note?.trim().slice(0, 200) || null,
  };
  await prisma.subscription.upsert({ where: { userId: input.userId }, create: { userId: input.userId, ...data }, update: data });
  await enforceQuota(input.userId); // VA-152: si el plan nuevo tiene menos cupo, se pausan los más nuevos
  return { ok: true };
}

/** Quita una cortesía (solo las MANUAL): queda cancelada desde ahora. */
export async function revokeCourtesyPlan(userId: string): Promise<CourtesyResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId }, select: { source: true } });
  if (!sub || sub.source !== "MANUAL") return { ok: false, error: "No tiene un plan bonificado." };
  await prisma.subscription.update({ where: { userId }, data: { status: "CANCELLED", currentPeriodEnd: new Date() } });
  await enforceQuota(userId); // VA-152: si el plan nuevo tiene menos cupo, se pausan los más nuevos
  return { ok: true };
}
