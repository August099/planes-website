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

/** VA-80: el plan vigente del usuario hace que sus publicaciones no venzan. */
export async function hasNoExpiryPlan(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { ...currentSubscriptionWhere(userId), plan: { noExpiry: true } },
    select: { id: true },
  });
  return !!sub;
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
      plan: { select: { name: true, price: true, billingInterval: true, noExpiry: true } },
    },
  });
  if (!sub) return null;
  return {
    planName: sub.plan.name,
    price: Number(sub.plan.price),
    interval: sub.plan.billingInterval,
    noExpiry: sub.plan.noExpiry,
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
