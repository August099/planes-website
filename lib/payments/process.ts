import "server-only";
import { Payment as MpPayment } from "mercadopago";
import { Prisma, type PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";
import { activatePurchase, revokePurchase } from "@/lib/payments/activation";

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
      // Etapa 4 (suscripciones): se registran y se procesan cuando esté implementada.
      return { status: "IGNORED", note: "Suscripciones: pendiente (etapa 4)" };
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

async function handlePayment(mpPaymentId: string): Promise<Outcome> {
  const mp = await new MpPayment(mpClient()).get({ id: mpPaymentId });
  const amount = Number(mp.transaction_amount ?? 0);
  const refunded = Number(mp.transaction_amount_refunded ?? 0);
  const status = mp.status ?? "pending";
  const approvedAt = mp.date_approved ? new Date(mp.date_approved) : null;

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
    raw: JSON.parse(JSON.stringify(mp)) as Prisma.InputJsonValue,
  };
  const payment = await upsertPayment(String(mp.id ?? mpPaymentId), data);

  if (!purchase) {
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
    notes.push(activated ? "compra activada" : "la compra ya estaba activada");
    if (purchaseStatus === "PARTIALLY_REFUNDED") {
      await prisma.purchase.update({ where: { id: purchase.id }, data: { paymentStatus: "PARTIALLY_REFUNDED" } });
    }
    await queueInvoice(payment.id, purchase, approvedAt ?? new Date(), amount);
  } else if (purchaseStatus === "REFUNDED") {
    const revoked = await revokePurchase(purchase.id);
    notes.push(revoked ? "compra revertida" : "la compra ya estaba revertida o no se había activado");
    if (!revoked) await setStatusIfNotActivated(purchase.id, "REFUNDED");
  } else {
    // Pendiente, en proceso, rechazado o cancelado: solo se informa (permite reintentar el pago).
    await setStatusIfNotActivated(purchase.id, purchaseStatus);
  }
  return { status: "PROCESSED", note: notes.join("; ") };
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

/**
 * Deja la factura C en PENDING (una por pago: índice único invoicedPaymentId). La emite la etapa 4
 * (TusFacturas) cuando BILLING_ENABLED=true; mientras tanto queda pendiente.
 */
async function queueInvoice(
  paymentId: string,
  purchase: { description: string; billingSnapshot: Prisma.JsonValue },
  paidAt: Date,
  amount: number
) {
  if (amount <= 0) return;
  await prisma.invoice.createMany({
    data: [
      {
        kind: "FACTURA_C",
        paymentId,
        invoicedPaymentId: paymentId,
        total: new Prisma.Decimal(amount),
        periodFrom: paidAt,
        periodTo: paidAt,
        description: purchase.description || "Servicio de publicación en Ventas Aeronáuticas",
        receiver: (purchase.billingSnapshot ?? {}) as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });
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
