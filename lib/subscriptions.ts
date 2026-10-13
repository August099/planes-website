import "server-only";
import { prisma } from "@/lib/prisma";

// Beneficios de suscripción (VA-87). Regla única para "Página personalizada": suscripción ACTIVE,
// período vigente (currentPeriodEnd en el futuro) y un plan con includesCustomPage. Si vence, el
// perfil vuelve al diseño común sin borrar los datos cargados.
export async function hasCustomPage(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      currentPeriodEnd: { gt: new Date() },
      plan: { includesCustomPage: true },
    },
    select: { id: true },
  });
  return !!sub;
}

// VA-80: suscripción vigente = ACTIVE y período pagado sin terminar. Si se pidió cancelar
// (cancelAtPeriodEnd), sigue vigente hasta currentPeriodEnd.
function currentSubscriptionWhere(userId: string) {
  return { userId, status: "ACTIVE" as const, currentPeriodEnd: { gt: new Date() } };
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
    active: sub.status === "ACTIVE" && sub.currentPeriodEnd > new Date(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };
}
export type SubscriptionSummary = NonNullable<Awaited<ReturnType<typeof getSubscriptionSummary>>>;
