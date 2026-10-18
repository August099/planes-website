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

// Beneficios del plan (VA-87, VA-151). VA-152: solo el Empresarial los incluye (interruptores del
// plan), y los admins los tienen siempre (mismos atributos que una cuenta Empresarial). Si la
// suscripción termina, el perfil vuelve al diseño común sin borrar los datos cargados.
type PlanFlag = "includesCustomPage" | "includesSellerMetrics" | "includesVerifiedBadge";
async function hasPlanFlag(userId: string, flag: PlanFlag): Promise<boolean> {
  const [user, sub] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
    prisma.subscription.findFirst({ where: { ...currentSubscriptionWhere(userId), plan: { [flag]: true } }, select: { id: true } }),
  ]);
  return !!user?.isAdmin || !!sub;
}

/** "Página VA" en /profile/[id]. */
export async function hasCustomPage(userId: string): Promise<boolean> {
  return hasPlanFlag(userId, "includesCustomPage");
}

/** VA-151: panel de métricas de vendedor. */
export async function hasSellerMetrics(userId: string): Promise<boolean> {
  return hasPlanFlag(userId, "includesSellerMetrics");
}

/** VA-105 (14/10): "Cuenta verificada" sale del plan (includesVerifiedBadge), no de la Página VA. */
export async function hasVerifiedBadge(userId: string): Promise<boolean> {
  return hasPlanFlag(userId, "includesVerifiedBadge");
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
