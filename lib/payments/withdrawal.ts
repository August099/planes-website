import "server-only";
import { PaymentRefund, Payment as MpPayment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";
import { handleRefunds } from "@/lib/payments/process";
import { isLaterSubscriptionCharge, previewSubscriptionReversal, revertSubscriptionCharge } from "@/lib/payments/subscription-reversal";
import { sendWithdrawalEmail } from "@/lib/mail";
import { describePaused, type QuotaKind } from "@/lib/quota";

// VA-125: botón de arrepentimiento (Ley 24.240 y Resolución 424/2020). Dentro de los 10 días corridos
// desde el pago, el usuario pide la devolución desde "Mis compras": se reembolsa el total por Mercado
// Pago en el momento. VA-152: solo para suscripciones (no se venden avisos sueltos ni packs). La
// suscripción termina, se cancela el débito y la cuenta vuelve al cupo Gratis: si tiene más avisos
// activos, se pausan los más nuevos (lib/payments/subscription-reversal.ts, el mismo camino que un
// reembolso a mano o un contracargo).

export const WITHDRAWAL_DAYS = 10;

/**
 * VA-150 · decisión abierta (17/10): ¿el arrepentimiento de una suscripción aplica solo al primer
 * cobro (el alta, o el primero del plan nuevo en un cambio de plan) o a cada cobro mensual dentro de
 * sus 10 días? Hasta que lo confirmen (contador o abogado): solo al primero. Para cambiarlo, poner
 * "EVERY_CHARGE".
 */
export const WITHDRAWAL_SUBSCRIPTION_SCOPE: "FIRST_CHARGE" | "EVERY_CHARGE" = "FIRST_CHARGE";

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
export function withdrawalUntil(p: Eligible, now = new Date(), opts: { laterSubscriptionCharge?: boolean } = {}): Date | null {
  if (p.status !== "approved" || !p.approvedAt || p.withdrawalRequestedAt) return null;
  if (Number(p.amount) <= 0 || Number(p.refundedAmount) > 0) return null;
  if (opts.laterSubscriptionCharge && WITHDRAWAL_SUBSCRIPTION_SCOPE === "FIRST_CHARGE") return null;
  const until = withdrawalDeadline(p.approvedAt);
  return until > now ? until : null;
}

export type WithdrawalResult = { ok: true } | { ok: false; error: string };

async function loadOwnedPayment(userId: string, paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      purchase: { select: { id: true, userId: true, description: true } },
      subscription: { select: { id: true, userId: true, mpSubscriptionId: true, mpStatus: true, plan: { select: { name: true } } } },
    },
  });
  // VA-152: solo cobros de suscripción.
  if (!payment?.subscription || payment.subscription.userId !== userId) return null;
  const later = payment.subscription ? await isLaterSubscriptionCharge(payment) : false;
  return { payment, later };
}

/** VA-150: lo que se va a retirar, para el diálogo de confirmación (no cambia nada). */
export async function withdrawalPreview(userId: string, paymentId: string): Promise<{ ok: true; amount: number; lines: string[] } | { ok: false; error: string }> {
  const loaded = await loadOwnedPayment(userId, paymentId);
  if (!loaded) return { ok: false, error: "No encontramos ese pago." };
  const { payment, later } = loaded;
  if (!withdrawalUntil(payment, new Date(), { laterSubscriptionCharge: later })) return { ok: false, error: "Este pago ya no se puede devolver con el botón de arrepentimiento." };
  const lines = withdrawalLines(await previewSubscriptionReversal(payment.id));
  return { ok: true, amount: Number(payment.amount), lines };
}

/** Qué pasa al arrepentirse, en el diálogo y en el mail. */
function withdrawalLines(paused: Record<QuotaKind, number> | null): string[] {
  const lines = ["Tu suscripción termina en el momento y se cancela el débito automático. Volvés al plan Base."];
  const p = paused && describePaused(paused);
  if (p) lines.push(p);
  return lines;
}

export async function requestWithdrawal(userId: string, paymentId: string): Promise<WithdrawalResult> {
  const loaded = await loadOwnedPayment(userId, paymentId);
  if (!loaded) return { ok: false, error: "No encontramos ese pago." };
  const { payment, later } = loaded;
  if (!withdrawalUntil(payment, new Date(), { laterSubscriptionCharge: later })) {
    return { ok: false, error: `Este pago ya no se puede devolver con el botón de arrepentimiento (son ${WITHDRAWAL_DAYS} días desde el pago).` };
  }
  // Lo que se va a retirar, para el mail (se calcula antes de aplicarlo).
  const preview = await previewSubscriptionReversal(payment.id);

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
    await revertSubscriptionCharge(payment.id);
    const mp = await new MpPayment(mpClient()).get({ id: payment.mpPaymentId });
    const amount = Number(mp.transaction_amount ?? payment.amount);
    const refunded = Number(mp.transaction_amount_refunded ?? amount);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: mp.status ?? "refunded", refundedAmount: refunded } });
    await handleRefunds(payment.id, mp.refunds ?? [], amount, refunded);
  } catch (error) {
    console.error(`[arrepentimiento] reembolso hecho, pero no se pudo reflejar en la base (${payment.id}):`, error);
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user?.email) {
      await sendWithdrawalEmail({
        to: user.email,
        name: user.name,
        amount: Number(payment.amount),
        description: `Suscripción – Plan ${payment.subscription?.plan.name ?? ""}`,
        lines: withdrawalLines(preview),
      });
    }
  } catch (error) {
    console.error(`[arrepentimiento] no se pudo mandar el mail de confirmación (${payment.id}):`, error);
  }
  return { ok: true };
}
