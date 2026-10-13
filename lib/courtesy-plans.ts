import "server-only";
import { prisma } from "@/lib/prisma";

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
    prisma.plan.findUnique({ where: { id: input.planId }, select: { billingType: true, archivedAt: true, featuredPerMonth: true } }),
    prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } }),
    prisma.subscription.findUnique({ where: { userId: input.userId }, select: { source: true, status: true, currentPeriodEnd: true } }),
  ]);
  if (!user) return { ok: false, error: "El usuario no existe." };
  if (!plan || plan.archivedAt || plan.billingType !== "SUBSCRIPTION") {
    return { ok: false, error: "Elegí un plan de suscripción vigente." };
  }
  // Una suscripción paga vigente no se pisa: primero hay que cancelarla.
  if (current && current.source === "MERCADOPAGO" && current.status === "ACTIVE" && current.currentPeriodEnd > now) {
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
    featuredCredits: plan.featuredPerMonth,
  };
  await prisma.subscription.upsert({ where: { userId: input.userId }, create: { userId: input.userId, ...data }, update: data });
  return { ok: true };
}

/** Quita una cortesía (solo las MANUAL): queda cancelada desde ahora. */
export async function revokeCourtesyPlan(userId: string): Promise<CourtesyResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId }, select: { source: true } });
  if (!sub || sub.source !== "MANUAL") return { ok: false, error: "No tiene un plan de cortesía." };
  await prisma.subscription.update({ where: { userId }, data: { status: "CANCELLED", currentPeriodEnd: new Date() } });
  return { ok: true };
}
