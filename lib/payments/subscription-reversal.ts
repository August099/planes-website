import "server-only";
import { PreApproval } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";
import { enforceQuota, excessFor, limitsWithoutPlan, type QuotaKind } from "@/lib/quota";

// Reembolso de un cobro de suscripción (botón de arrepentimiento, reembolso a mano en Mercado Pago o
// contracargo). La suscripción termina en el momento y se cancela el débito. VA-152: con cupos fijos
// no hay nada que "devolver" aviso por aviso: la cuenta vuelve al cupo Gratis y, si tiene más avisos
// activos, se pausan los más nuevos (lib/quota.ts).

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

/** Qué se pausaría al terminar la suscripción de este cobro (no cambia nada). */
export async function previewSubscriptionReversal(paymentId: string): Promise<Record<QuotaKind, number> | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { subscription: { select: { userId: true } } } });
  if (!payment?.subscription) return null;
  const userId = payment.subscription.userId;
  return excessFor(userId, await limitsWithoutPlan(userId));
}

/** Termina la suscripción del cobro reembolsado. Idempotente. Devuelve lo que se pausó. */
export async function revertSubscriptionCharge(paymentId: string): Promise<Record<QuotaKind, number> | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { subscriptionId: true, raw: true } });
  if (!payment?.subscriptionId) return null;
  const sub = await prisma.subscription.findUnique({ where: { id: payment.subscriptionId }, select: { id: true, userId: true, mpSubscriptionId: true, mpStatus: true, status: true } });
  if (!sub) return null;
  // Un reembolso de un débito anterior (ya reemplazado por otro, VA-121) no termina el plan de hoy.
  const preapproval = preapprovalOf(payment.raw);
  if (preapproval && sub.mpSubscriptionId && preapproval !== sub.mpSubscriptionId) {
    console.warn(`[suscripciones] reembolso del débito ${preapproval}, que ya no es el vigente (${sub.mpSubscriptionId}): no se termina el plan`);
    return null;
  }
  return endSubscriptionNow(sub);
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
    },
  });
  // VA-152: vuelve al cupo Gratis; lo que sobra se pausa (los más nuevos).
  return enforceQuota(sub.userId);
}
