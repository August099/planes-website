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

// Beneficios del plan (VA-87, VA-151). VA-166: salen de lib/plan-benefits.ts (Pro: Página VA "banner",
// métricas Pro y verificado; Broker y admins: todo). Si la suscripción termina, el perfil vuelve al
// diseño común sin borrar los datos cargados.

/** "Página VA" en /profile/[id] (la del Pro o la completa del Broker). */
export async function hasCustomPage(userId: string): Promise<boolean> {
  const { getAccountPlan } = await import("@/lib/plan-benefits");
  return (await getAccountPlan(userId)).vaPage !== "NONE";
}

/** VA-151: panel de métricas de vendedor (desde el nivel Pro). */
export async function hasSellerMetrics(userId: string): Promise<boolean> {
  const { getAccountPlan } = await import("@/lib/plan-benefits");
  return (await getAccountPlan(userId)).metrics !== "BASIC";
}

/** VA-105 (14/10): "Cuenta verificada" sale del plan (automático con Pro o Broker vigente). */
export async function hasVerifiedBadge(userId: string): Promise<boolean> {
  const { getAccountPlan } = await import("@/lib/plan-benefits");
  return (await getAccountPlan(userId)).verified;
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
      plan: { select: { name: true, price: true, billingInterval: true, tier: true } },
    },
  });
  if (!sub) return null;
  return {
    planName: sub.plan.name,
    price: Number(sub.plan.price),
    interval: sub.plan.billingInterval,
    tier: sub.plan.tier,
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
