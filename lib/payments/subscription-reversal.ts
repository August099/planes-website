import "server-only";
import { PreApproval } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";
import { syncListingExpiry } from "@/lib/subscriptions";
import { applyReversal, previewReversal, type ReversalSummary } from "@/lib/payments/reversal";

// VA-150: reembolso de un cobro de suscripción (botón de arrepentimiento, reembolso a mano en Mercado
// Pago o contracargo). La suscripción termina en el momento, se cancela el débito y los avisos
// publicados o renovados gracias a la suscripción desde ese cobro pasan a "pendiente de pago" o
// vuelven al vencimiento anterior. Lo que salió de otro origen queda como estaba.

/** Primer cobro del débito al que pertenece (el alta, o el primero del plan nuevo tras un cambio). */
export function preapprovalOf(raw: unknown): string | null {
  const r = raw as { authorizedPayment?: { preapproval_id?: string } } | null;
  return r?.authorizedPayment?.preapproval_id ?? null;
}

/** ¿Es un cobro siguiente (no el primero de su débito)? */
export async function isLaterSubscriptionCharge(payment: { id: string; subscriptionId: string | null; approvedAt: Date | null; raw: unknown }): Promise<boolean> {
  if (!payment.subscriptionId || !payment.approvedAt) return false;
  const preapproval = preapprovalOf(payment.raw);
  const earlier = await prisma.payment.findMany({
    where: { subscriptionId: payment.subscriptionId, id: { not: payment.id }, approvedAt: { lt: payment.approvedAt } },
    select: { raw: true },
  });
  return earlier.some((p) => preapprovalOf(p.raw) === preapproval);
}

export async function previewSubscriptionReversal(paymentId: string): Promise<ReversalSummary | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { subscriptionId: true, approvedAt: true } });
  if (!payment?.subscriptionId || !payment.approvedAt) return null;
  return previewReversal({ subscriptionId: payment.subscriptionId, since: payment.approvedAt });
}

/** Retira lo obtenido con el cobro y termina la suscripción. Idempotente. */
export async function revertSubscriptionCharge(paymentId: string): Promise<ReversalSummary | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true, subscriptionId: true, approvedAt: true } });
  if (!payment?.subscriptionId || !payment.approvedAt) return null;
  const summary = await prisma.$transaction((tx) => applyReversal(tx, { subscriptionId: payment.subscriptionId!, since: payment.approvedAt! }, payment.id));
  const sub = await prisma.subscription.findUnique({ where: { id: payment.subscriptionId }, select: { id: true, userId: true, mpSubscriptionId: true, mpStatus: true, status: true } });
  if (sub) await endSubscriptionNow(sub);
  return summary;
}

export async function endSubscriptionNow(sub: { id: string; userId: string; mpSubscriptionId: string | null; mpStatus: string | null; status?: string }) {
  if (sub.mpSubscriptionId && sub.mpStatus !== "cancelled") {
    try {
      await new PreApproval(mpClient()).update({ id: sub.mpSubscriptionId, body: { status: "cancelled" } });
    } catch (error) {
      console.error(`[arrepentimiento] no se pudo cancelar el débito ${sub.mpSubscriptionId} en MP:`, error);
    }
  }
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "CANCELLED",
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      mpStatus: sub.mpSubscriptionId ? "cancelled" : null,
      pendingPlanId: null,
      pendingMpSubscriptionId: null,
      // Se pierden los destacados incluidos.
      featuredCredits: 0,
    },
  });
  // Los avisos de otro origen que no vencían por el plan vuelven a tener vencimiento.
  await syncListingExpiry(sub.userId);
}
