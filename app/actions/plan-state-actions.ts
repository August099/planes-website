"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isSubscriptionCurrent } from "@/lib/subscriptions";

export type MyPlanState = {
  planId: string;
  courtesy: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  pendingPlanId: string | null;
} | null;

/** VA-166: quién mira /plans (visitante, cuenta o admin) y su suscripción vigente. */
export type PlansViewer = { loggedIn: boolean; isAdmin: boolean; plan: MyPlanState };

// VA-121: /plans es estática; los botones de quien tiene una suscripción vigente se arman en el
// navegador con esto (plan actual, cancelación programada y cambio de plan pendiente de pago).
export async function getMyPlanStateAction(): Promise<MyPlanState> {
  return (await getPlansViewerAction()).plan;
}

export async function getPlansViewerAction(): Promise<PlansViewer> {
  const user = await getCurrentUser();
  if (!user?.id) return { loggedIn: false, isAdmin: false, plan: null };
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { planId: true, status: true, source: true, cancelAtPeriodEnd: true, currentPeriodEnd: true, graceUntil: true, pendingPlanId: true },
  });
  const plan =
    sub && isSubscriptionCurrent(sub)
      ? {
          planId: sub.planId,
          courtesy: sub.source === "MANUAL",
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
          pendingPlanId: sub.pendingPlanId,
        }
      : null;
  return { loggedIn: true, isAdmin: !!user.isAdmin, plan };
}
