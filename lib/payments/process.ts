import "server-only";
import { Payment as MpPayment } from "mercadopago";
import { Prisma, type PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";
import { activatePurchase, revokePurchase } from "@/lib/payments/activation";
import { queueInvoice } from "@/lib/payments/invoices";
import { processInvoice } from "@/lib/billing/issue";
import { isTestPayment } from "@/lib/billing/guard";
import { mpAccountIsTest } from "@/lib/payments/mp-account";
import { handleSubscriptionTopic } from "@/lib/payments/subscriptions";
import { trackEvent } from "@/lib/track-event";
import { revertSubscriptionCharge } from "@/lib/payments/subscription-reversal";

// VA-92 · Etapa 3: procesamiento de un WebhookEvent ya guardado. Nunca se confía en el payload:
// con el id recibido se consulta el pago a la API de Mercado Pago y se actúa según lo que devuelve.
// Todo es idempotente (Payment.mpPaymentId único, Purchase.activatedAt, Invoice.invoicedPaymentId
// único): procesar el mismo evento o el mismo pago dos veces no activa ni factura dos veces.

type Outcome = { status: "PROCESSED" | "IGNORED"; note?: string };

/** Procesa un evento y deja el resultado en WebhookEvent (status, error, attempts). */
export async function processWebhookEvent(eventId: string): Promise<void> {
  const event = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
  if (!event || !event.signatureValid || event.status === "PROCESSED") return;
  try {
    const outcome = await handle(event.topic, event.externalId);
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: outcome.status, error: outcome.note ?? null, processedAt: new Date(), attempts: { increment: 1 } },
    });
  } catch (error) {
    console.error(`[webhook MP] error al procesar ${eventId}:`, error);
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: "ERROR", error: errorText(error), attempts: { increment: 1 } },
    });
  }
}

async function handle(topic: string, externalId: string | null): Promise<Outcome> {
  if (!externalId) return { status: "IGNORED", note: "Sin id del recurso" };
  switch (topic) {
    case "payment":
      return handlePayment(externalId);
    case "subscription_preapproval":
    case "subscription_authorized_payment":
    case "subscription_preapproval_plan":
      return handleSubscriptionTopic(topic, externalId);
    default:
      return { status: "IGNORED", note: `Tópico no manejado: ${topic}` };
  }
}

/** Estado de MP → estado de la compra. */
export function purchaseStatusFor(mpStatus: string, refunded: number, amount: number): PaymentStatus {
  switch (mpStatus) {
    case "approved":
      return refunded > 0 && refunded < amount ? "PARTIALLY_REFUNDED" : "APPROVED";
    case "authorized":
    case "in_process":
    case "in_mediation":
      return "IN_PROCESS";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    default:
      return "PENDING";
  }
}

/** VA-125: también se usa al pedir el arrepentimiento, para reflejar el reembolso sin esperar al webhook. */
export async function handlePayment(mpPaymentId: string): Promise<Outcome> {
  const mp = await new MpPayment(mpClient()).get({ id: mpPaymentId });
  const amount = Number(mp.transaction_amount ?? 0);
  const refunded = Number(mp.transaction_amount_refunded ?? 0);
  const status = mp.status ?? "pending";
  const approvedAt = mp.date_approved ? new Date(mp.date_approved) : null;
  // VA-105: live_mode según la API (no el payload) y si es un pago de prueba.
  const liveMode = typeof mp.live_mode === "boolean" ? mp.live_mode : null;
  const isTest = isTestPayment({ liveMode, mpAccountIsTest: await mpAccountIsTest() });

  // La compra se identifica por external_reference = purchase.id (Checkout Pro).
  const purchase = mp.external_reference
    ? await prisma.purchase.findUnique({ where: { id: mp.external_reference } })
    : null;

  const data = {
    status,
    statusDetail: mp.status_detail ?? null,
    amount: new Prisma.Decimal(amount),
    refundedAmount: new Prisma.Decimal(refunded),
    currency: mp.currency_id ?? "ARS",
    method: mp.payment_method_id ?? null,
    paymentType: mp.payment_type_id ?? null,
    approvedAt,
    purchaseId: purchase?.id ?? null,
    liveMode,
    isTest,
    raw: JSON.parse(JSON.stringify(mp)) as Prisma.InputJsonValue,
  };
  // VA-150: un cobro de suscripción guarda en raw el authorized_payment (con el preapproval, que
  // distingue el primer cobro de los siguientes): no se pisa, se le suma el pago.
  const existing = await prisma.payment.findUnique({ where: { mpPaymentId: String(mp.id ?? mpPaymentId) }, select: { subscriptionId: true, raw: true } });
  if (existing?.subscriptionId && existing.raw && typeof existing.raw === "object") {
    data.raw = { ...(existing.raw as Record<string, unknown>), payment: JSON.parse(JSON.stringify(mp)) } as Prisma.InputJsonValue;
  }
  const payment = await upsertPayment(String(mp.id ?? mpPaymentId), data);

  if (!purchase) {
    // VA-150: reembolso a mano desde el panel de Mercado Pago o contracargo de un cobro de suscripción:
    // el mismo camino que el botón de arrepentimiento (idempotente).
    if (payment.subscriptionId && (status === "refunded" || status === "charged_back")) {
      const summary = await revertSubscriptionCharge(payment.id);
      const note = await handleRefunds(payment.id, mp.refunds ?? [], amount, refunded || amount);
      const ended = summary ? `suscripción terminada, ${summary.AIRCRAFT} aviones y ${summary.SPARE_PART} repuestos pausados` : "suscripción sin cambios (débito anterior o inexistente)";
      return { status: "PROCESSED", note: `Cobro de suscripción ${mpPaymentId} reembolsado: ${ended}; ${note}` };
    }
    return { status: "IGNORED", note: `Pago ${mpPaymentId} sin compra asociada (external_reference: ${mp.external_reference ?? "—"})` };
  }

  // El monto cobrado tiene que ser el de la compra: si no coincide, no se entrega nada.
  const expected = Number(purchase.finalPrice);
  if (status === "approved" && (Math.abs(amount - expected) > 0.01 || (mp.currency_id && mp.currency_id !== purchase.currency))) {
    throw new Error(`Monto o moneda no coinciden: cobrado ${mp.currency_id} ${amount}, esperado ${purchase.currency} ${expected}. No se activa.`);
  }

  const purchaseStatus = purchaseStatusFor(status, refunded, amount);
  const notes: string[] = [`Pago ${mpPaymentId}: ${status}${mp.status_detail ? ` (${mp.status_detail})` : ""}`];

  if (status === "approved") {
    const activated = await activatePurchase(purchase.id, approvedAt ?? new Date());
    await trackEvent("PAYMENT_COMPLETED", { userId: purchase.userId, metadata: { purchaseId: purchase.id, mpPaymentId: String(mp.id ?? mpPaymentId), amount, isTest } }, { onceKey: `mp:${mp.id ?? mpPaymentId}` });
    notes.push(activated ? "compra activada" : "la compra ya estaba activada");
    if (purchaseStatus === "PARTIALLY_REFUNDED") {
      await prisma.purchase.update({ where: { id: purchase.id }, data: { paymentStatus: "PARTIALLY_REFUNDED" } });
    }
    const paidAt = approvedAt ?? new Date();
    // VA-105 1.2: la factura es por lo efectivamente cobrado; $0 no se factura (queueInvoice lo omite).
    await queueInvoice({ paymentId: payment.id, amount, description: purchase.description, receiver: purchase.billingSnapshot, periodFrom: paidAt, periodTo: paidAt });
    notes.push(await invoiceNote(payment.id));
    if (refunded > 0) notes.push(await handleRefunds(payment.id, mp.refunds ?? [], amount, refunded));
  } else if (purchaseStatus === "REFUNDED") {
    await trackEvent("REFUND_ISSUED", { userId: purchase.userId, metadata: { purchaseId: purchase.id, mpPaymentId: String(mp.id ?? mpPaymentId), amount: refunded || amount, isTest } }, { onceKey: `mp:${mp.id ?? mpPaymentId}` });
    const revoked = await revokePurchase(purchase.id);
    notes.push(revoked ? "compra revertida" : "la compra ya estaba revertida o no se había activado");
    if (!revoked) await setStatusIfNotActivated(purchase.id, "REFUNDED");
    notes.push(await handleRefunds(payment.id, mp.refunds ?? [], amount, refunded || amount));
  } else {
    // Pendiente, en proceso, rechazado o cancelado: solo se informa (permite reintentar el pago).
    if (status === "rejected" || status === "cancelled") {
      await trackEvent("PAYMENT_FAILED", { userId: purchase.userId, metadata: { purchaseId: purchase.id, mpPaymentId: String(mp.id ?? mpPaymentId), status, statusDetail: mp.status_detail ?? null, isTest } }, { onceKey: `mp:${mp.id ?? mpPaymentId}` });
    }
    await setStatusIfNotActivated(purchase.id, purchaseStatus);
  }
  return { status: "PROCESSED", note: notes.join("; ") };
}

/** Emite (o simula, o deja pendiente) la factura del pago y devuelve una nota para el evento. */
async function invoiceNote(paymentId: string): Promise<string> {
  const invoice = await prisma.invoice.findUnique({ where: { invoicedPaymentId: paymentId }, select: { id: true } });
  if (!invoice) return "sin factura (monto $0)";
  const status = await processInvoice(invoice.id);
  return `factura: ${status ?? "en proceso"}`;
}

/**
 * Reembolsos (totales o parciales): una nota de crédito C por reembolso de MP (refundRef único). Si la
 * factura todavía no se emitió (BILLING_ENABLED=false o en error), no hace falta nota de crédito:
 * total → la factura se descarta; parcial → se factura solo lo que quedó cobrado.
 */
export async function handleRefunds(paymentId: string, refunds: Array<{ id?: number | string; amount?: number }>, amount: number, refundedTotal: number): Promise<string> {
  const original = await prisma.invoice.findUnique({ where: { invoicedPaymentId: paymentId } });
  if (!original) return "reembolso sin factura";
  if (original.status === "PENDING" || original.status === "ERROR") {
    const remaining = Math.max(0, Math.round((amount - refundedTotal) * 100) / 100);
    await prisma.invoice.update({
      where: { id: original.id },
      data:
        remaining <= 0
          ? { status: "SKIPPED", skippedAt: new Date(), errors: "Reembolsado antes de facturar: no corresponde factura." }
          : { total: new Prisma.Decimal(remaining) },
    });
    return remaining <= 0 ? "factura descartada (reembolso total antes de emitir)" : `factura ajustada a ${remaining} (reembolso parcial)`;
  }
  // VA-150: una factura simulada (pruebas) no lleva nota de crédito: se descarta.
  if (original.status === "ISSUED_SIMULATED" && refundedTotal >= amount) {
    await prisma.invoice.update({ where: { id: original.id }, data: { status: "SKIPPED", skippedAt: new Date(), errors: "Reembolsada: la factura simulada se descarta (no hay nota de crédito)." } });
    return "factura simulada descartada (reembolso total)";
  }
  if (original.status !== "ISSUED" && original.status !== "ISSUED_SIMULATED") return `reembolso: factura ${original.status}`;
  let created = 0;
  for (const r of refunds) {
    const refundAmount = Number(r.amount ?? 0);
    if (!r.id || refundAmount <= 0) continue;
    const res = await prisma.invoice.createMany({
      data: [
        {
          kind: "NOTA_CREDITO_C",
          paymentId,
          refundRef: `mp-refund-${r.id}`,
          originalInvoiceId: original.id,
          total: new Prisma.Decimal(refundAmount),
          periodFrom: original.periodFrom,
          periodTo: original.periodTo,
          description: `Anulación ${refundAmount < amount ? "parcial " : ""}– ${original.description}`.slice(0, 250),
          receiver: original.receiver as Prisma.InputJsonValue,
        },
      ],
      skipDuplicates: true,
    });
    created += res.count;
  }
  const notes = await prisma.invoice.findMany({ where: { originalInvoiceId: original.id, status: { in: ["PENDING", "ERROR"] } }, select: { id: true } });
  for (const n of notes) await processInvoice(n.id);
  return `notas de crédito nuevas: ${created}`;
}

/** Un pago que llega tarde (por ejemplo rechazado después de uno aprobado) no pisa una compra activa. */
async function setStatusIfNotActivated(purchaseId: string, paymentStatus: PaymentStatus) {
  await prisma.purchase.updateMany({ where: { id: purchaseId, activatedAt: null }, data: { paymentStatus } });
}

async function upsertPayment(mpPaymentId: string, data: Omit<Prisma.PaymentUncheckedCreateInput, "mpPaymentId">) {
  try {
    return await prisma.payment.upsert({ where: { mpPaymentId }, create: { mpPaymentId, ...data }, update: data });
  } catch (error) {
    // Dos notificaciones del mismo pago a la vez: la segunda choca con el índice único y actualiza.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.payment.update({ where: { mpPaymentId }, data });
    }
    throw error;
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 4000);
  // El SDK de Mercado Pago rechaza con un objeto plano ({ message, error, status, cause }).
  try {
    return JSON.stringify(error).slice(0, 4000);
  } catch {
    return String(error).slice(0, 4000);
  }
}
