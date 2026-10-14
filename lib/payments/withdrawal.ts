import "server-only";
import { PaymentRefund, PreApproval, Payment as MpPayment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";
import { handlePayment, handleRefunds } from "@/lib/payments/process";
import { syncListingExpiry } from "@/lib/subscriptions";

// VA-125: botón de arrepentimiento (Ley 24.240 y Resolución 424/2020). Dentro de los 10 días corridos
// desde el pago, el usuario pide la devolución desde "Mis compras": se reembolsa el total por Mercado
// Pago en el momento y se retira lo comprado (decisión del socio, 14/10: aunque ya lo haya usado).
// - Compra única (aviso suelto, pack, renovación, destacado): el reembolso pasa por handlePayment,
//   el mismo camino que el webhook (revokePurchase + nota de crédito o factura descartada).
// - Cobro de una suscripción: se cancela el débito en Mercado Pago y la suscripción termina ya.

export const WITHDRAWAL_DAYS = 10;

export function withdrawalDeadline(approvedAt: Date): Date {
  return new Date(approvedAt.getTime() + WITHDRAWAL_DAYS * 24 * 60 * 60 * 1000);
}

type Eligible = {
  status: string;
  amount: unknown;
  refundedAmount: unknown;
  approvedAt: Date | null;
  withdrawalRequestedAt: Date | null;
};

/** Hasta cuándo se puede pedir el arrepentimiento de este pago, o null si ya no corresponde. */
export function withdrawalUntil(p: Eligible, now = new Date()): Date | null {
  if (p.status !== "approved" || !p.approvedAt || p.withdrawalRequestedAt) return null;
  if (Number(p.amount) <= 0 || Number(p.refundedAmount) > 0) return null;
  const until = withdrawalDeadline(p.approvedAt);
  return until > now ? until : null;
}

export type WithdrawalResult = { ok: true } | { ok: false; error: string };

export async function requestWithdrawal(userId: string, paymentId: string): Promise<WithdrawalResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      purchase: { select: { userId: true } },
      subscription: { select: { id: true, userId: true, mpSubscriptionId: true, mpStatus: true } },
    },
  });
  const ownerId = payment?.purchase?.userId ?? payment?.subscription?.userId;
  if (!payment || ownerId !== userId) return { ok: false, error: "No encontramos ese pago." };
  if (!withdrawalUntil(payment)) {
    return { ok: false, error: `Este pago ya no se puede devolver con el botón de arrepentimiento (son ${WITHDRAWAL_DAYS} días desde el pago).` };
  }

  // Un solo pedido por pago, aunque se aprete dos veces.
  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, withdrawalRequestedAt: null },
    data: { withdrawalRequestedAt: new Date() },
  });
  if (claimed.count === 0) return { ok: false, error: "Ya pediste la devolución de este pago." };

  try {
    await new PaymentRefund(mpClient()).create({
      payment_id: payment.mpPaymentId,
      requestOptions: { idempotencyKey: `withdrawal-${payment.id}` },
    });
  } catch (error) {
    console.error(`[arrepentimiento] Mercado Pago no aceptó el reembolso del pago ${payment.mpPaymentId}:`, error);
    await prisma.payment.update({ where: { id: payment.id }, data: { withdrawalRequestedAt: null } });
    return { ok: false, error: "Mercado Pago no pudo procesar la devolución. Probá de nuevo en unos minutos o escribinos." };
  }

  // El reembolso ya está hecho: lo que sigue refleja el cambio (si falla, lo completa el webhook).
  try {
    if (payment.subscription) {
      await endSubscriptionNow(payment.subscription);
      const mp = await new MpPayment(mpClient()).get({ id: payment.mpPaymentId });
      const amount = Number(mp.transaction_amount ?? payment.amount);
      const refunded = Number(mp.transaction_amount_refunded ?? amount);
      await prisma.payment.update({ where: { id: payment.id }, data: { status: mp.status ?? "refunded", refundedAmount: refunded } });
      await handleRefunds(payment.id, mp.refunds ?? [], amount, refunded);
    } else {
      await handlePayment(payment.mpPaymentId);
    }
  } catch (error) {
    console.error(`[arrepentimiento] reembolso hecho, pero no se pudo reflejar en la base (${payment.id}):`, error);
  }
  return { ok: true };
}

async function endSubscriptionNow(sub: { id: string; userId: string; mpSubscriptionId: string | null; mpStatus: string | null }) {
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
      featuredCredits: 0,
    },
  });
  // Los avisos que no vencían por el plan vuelven a tener vencimiento.
  await syncListingExpiry(sub.userId);
}
