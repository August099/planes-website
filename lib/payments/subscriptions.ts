import "server-only";
import { randomUUID } from "node:crypto";
import { PreApproval, Payment as MpPayment } from "mercadopago";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appUrl, mpClient } from "@/lib/mercadopago";
import { billingSnapshot, parseBilling } from "@/lib/billing-rules";
import { getBillingSettings } from "@/lib/billing-settings";
import { queueInvoice, receiverFromProfile } from "@/lib/payments/invoices";
import { isSubscriptionCurrent } from "@/lib/subscriptions";
import { sendSubscriptionPaymentFailedEmail } from "@/lib/mail";
import { LISTING_DAYS } from "@/lib/payments/activation";
import { processInvoice } from "@/lib/billing/issue";
import { isTestPayment } from "@/lib/billing/guard";
import { mpAccountIsTest } from "@/lib/payments/mp-account";

// VA-92 · Etapa 2: suscripciones mensuales con la API de Suscripciones de Mercado Pago (preapproval).
// Se crean por API, sin "Planes de suscripción" del panel: el precio y los beneficios salen de nuestro
// admin (Plan), y así un cambio de precio no obliga a tocar el panel de Mercado Pago.
// - Alta: Subscription en PENDING + preapproval "pending" → el usuario autoriza el débito en MP.
// - Cada cobro aprobado (subscription_authorized_payment) extiende el período, repone los
//   destacados del mes y deja la factura pendiente. Idempotente por Payment.mpPaymentId.
// - Cobro rechazado: PAST_DUE con gracia (BillingSettings.graceDays) y mail; vencida, EXPIRED.
// - Cancelar desde el perfil = pausar el débito en MP y cancelAtPeriodEnd; al terminar el período se
//   cancela del todo. "Seguir suscripto" lo reactiva mientras el período siga vigente.

type Outcome = { status: "PROCESSED" | "IGNORED"; note?: string };
type Result = { ok: true; redirectTo: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

function addPeriod(from: Date, interval: string | null): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + (interval === "YEARLY" ? 12 : 1));
  return d;
}

// --------------------------------------------------------------------------- Alta

export async function startSubscription(input: { userId: string; planId: string; billing: unknown; payerEmail?: string }): Promise<Result> {
  const plan = await prisma.plan.findFirst({ where: { id: input.planId, isActive: true, archivedAt: null, billingType: "SUBSCRIPTION" } });
  if (!plan) return { ok: false, error: "Ese plan no está disponible." };
  const price = Number(plan.price);
  if (price <= 0) return { ok: false, error: "Este plan no tiene precio configurado." };

  const current = await prisma.subscription.findUnique({ where: { userId: input.userId } });
  if (current && isSubscriptionCurrent(current)) {
    return {
      ok: false,
      error:
        current.source === "MANUAL"
          ? "Ya tenés un plan de cortesía vigente."
          : "Ya tenés una suscripción vigente. Para cambiar de plan, cancelala y suscribite de nuevo al terminar el período.",
    };
  }

  const settings = await getBillingSettings();
  const billing = parseBilling(input.billing, price, settings.dniRequiredFrom);
  if (!billing.ok) return { ok: false, error: "Revisá los datos de facturación.", fieldErrors: billing.fieldErrors };
  const snap = billingSnapshot(billing.data);
  await prisma.billingProfile.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, kind: billing.data.kind, name: snap.name, docType: snap.docType, docNumber: snap.docNumber, ivaCondition: snap.ivaCondition, email: snap.email, address: snap.address },
    update: { kind: billing.data.kind, name: snap.name, docType: snap.docType, docNumber: snap.docNumber, ivaCondition: snap.ivaCondition, email: snap.email, address: snap.address },
  });

  // Mercado Pago ata la suscripción al email de la cuenta que paga: se pide aparte (puede no ser
  // el de la factura). En pruebas tiene que ser el de la cuenta compradora de prueba.
  const payerEmail = String(input.payerEmail ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
    return { ok: false, error: "Ingresá el email de tu cuenta de Mercado Pago.", fieldErrors: { payerEmail: "Ingresá el email de tu cuenta de Mercado Pago." } };
  }

  // Una fila por usuario (userId único): se reutiliza la vencida o cancelada. Primero se crea en
  // Mercado Pago (con el id que va a tener la fila) y recién después se guarda: si MP rechaza el
  // alta, no queda una suscripción pendiente colgada.
  const subId = current?.id ?? randomUUID();
  const preapproval = await new PreApproval(mpClient()).create({
    body: {
      reason: `Plan ${plan.name} – Ventas Aeronáuticas`,
      external_reference: subId,
      payer_email: payerEmail,
      back_url: `${appUrl()}/payment/status?subscription=${subId}`,
      status: "pending",
      auto_recurring: {
        frequency: plan.billingInterval === "YEARLY" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: price,
        currency_id: "ARS",
      },
    },
  });
  if (!preapproval.id || !preapproval.init_point) throw new Error("Mercado Pago no devolvió la suscripción.");

  const now = new Date();
  const fields = {
    planId: plan.id,
    status: "PENDING" as const,
    source: "MERCADOPAGO" as const,
    mpSubscriptionId: preapproval.id,
    mpStatus: preapproval.status ?? "pending",
    currentPeriodStart: now,
    currentPeriodEnd: now,
    cancelAtPeriodEnd: false,
    graceUntil: null,
    grantedById: null,
    note: null,
    featuredCredits: 0,
  };
  await prisma.subscription.upsert({ where: { userId: input.userId }, create: { id: subId, userId: input.userId, ...fields }, update: fields });
  return { ok: true, redirectTo: preapproval.init_point };
}

// --------------------------------------------------------------------------- Webhooks

export async function handleSubscriptionTopic(topic: string, externalId: string): Promise<Outcome> {
  if (topic === "subscription_preapproval") return handlePreapproval(externalId);
  if (topic === "subscription_authorized_payment") return handleAuthorizedPayment(externalId);
  return { status: "IGNORED", note: `Tópico de suscripción no usado: ${topic}` };
}

/** Cambio de estado del preapproval (autorizado, pausado, cancelado). */
async function handlePreapproval(preapprovalId: string): Promise<Outcome> {
  const pre = await new PreApproval(mpClient()).get({ id: preapprovalId });
  const sub = await prisma.subscription.findFirst({
    where: { OR: [{ mpSubscriptionId: preapprovalId }, ...(pre.external_reference ? [{ id: pre.external_reference }] : [])] },
  });
  if (!sub) return { status: "IGNORED", note: `Suscripción ${preapprovalId} sin registro asociado` };

  const status = pre.status ?? "pending";
  const data: Prisma.SubscriptionUpdateInput = { mpStatus: status, mpSubscriptionId: preapprovalId };
  if (status === "cancelled") {
    // Cancelada en MP (desde el perfil al terminar el período, desde la cuenta de MP o por MP):
    // conserva lo que ya pagó hasta el fin del período y no se renueva.
    if (isSubscriptionCurrent(sub)) data.cancelAtPeriodEnd = true;
    else data.status = "CANCELLED";
  }
  await prisma.subscription.update({ where: { id: sub.id }, data });
  return { status: "PROCESSED", note: `Preapproval ${preapprovalId}: ${status}` };
}

type AuthorizedPayment = {
  id: number | string;
  preapproval_id?: string;
  status?: string; // scheduled, processed, recycling, cancelled
  transaction_amount?: number;
  currency_id?: string;
  debit_date?: string;
  payment?: { id?: number | string; status?: string; status_detail?: string };
};

async function getAuthorizedPayment(id: string): Promise<AuthorizedPayment> {
  const token = process.env.MP_ACCESS_TOKEN ?? "";
  const res = await fetch(`https://api.mercadopago.com/authorized_payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status} al consultar el cobro ${id}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as AuthorizedPayment;
}

/** Un cobro de la suscripción: aprobado extiende el período; rechazado abre la gracia. */
async function handleAuthorizedPayment(authorizedPaymentId: string): Promise<Outcome> {
  const ap = await getAuthorizedPayment(authorizedPaymentId);
  if (!ap.preapproval_id) return { status: "IGNORED", note: `Cobro ${authorizedPaymentId} sin preapproval` };
  const sub = await prisma.subscription.findUnique({ where: { mpSubscriptionId: ap.preapproval_id }, include: { plan: true, user: { select: { email: true, name: true } } } });
  if (!sub) return { status: "IGNORED", note: `Cobro ${authorizedPaymentId}: suscripción ${ap.preapproval_id} desconocida` };

  const mpPaymentId = ap.payment?.id != null ? String(ap.payment.id) : null;
  const paymentStatus = ap.payment?.status ?? null;

  if (mpPaymentId && paymentStatus === "approved") {
    // El pago se consulta a la API (monto, fecha, medio): nunca solo con el resumen del cobro.
    const mp = await new MpPayment(mpClient()).get({ id: mpPaymentId });
    if (mp.status !== "approved") return { status: "PROCESSED", note: `Cobro ${authorizedPaymentId}: el pago ${mpPaymentId} figura ${mp.status}` };
    const amount = Number(mp.transaction_amount ?? ap.transaction_amount ?? 0);
    const approvedAt = mp.date_approved ? new Date(mp.date_approved) : new Date();
    const liveMode = typeof mp.live_mode === "boolean" ? mp.live_mode : null;
    const isTest = isTestPayment({ liveMode, mpAccountIsTest: await mpAccountIsTest() });

    // Idempotencia: solo el primero que registra el pago como aprobado extiende el período.
    const claimed = await claimApprovedPayment(mpPaymentId, {
      status: "approved",
      statusDetail: mp.status_detail ?? null,
      amount: new Prisma.Decimal(amount),
      refundedAmount: new Prisma.Decimal(Number(mp.transaction_amount_refunded ?? 0)),
      currency: mp.currency_id ?? "ARS",
      method: mp.payment_method_id ?? null,
      paymentType: mp.payment_type_id ?? null,
      approvedAt,
      subscriptionId: sub.id,
      liveMode,
      isTest,
      raw: JSON.parse(JSON.stringify({ authorizedPayment: ap, payment: mp })) as Prisma.InputJsonValue,
    });
    if (!claimed) return { status: "PROCESSED", note: `Cobro ${authorizedPaymentId}: el pago ${mpPaymentId} ya estaba registrado` };

    // Nuevo período: desde el fin del anterior si todavía no terminó (pago anticipado), si no desde hoy.
    const now = new Date();
    const start = sub.status === "ACTIVE" && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
    const end = addPeriod(start, sub.plan.billingInterval);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        graceUntil: null,
        lastPaymentAt: approvedAt,
        // Los destacados del plan se reponen cada período y no se acumulan (VA-95).
        featuredCredits: sub.plan.featuredPerMonth,
      },
    });
    await queueInvoice({
      paymentId: claimed.id,
      amount,
      description: `Suscripción ${sub.plan.billingInterval === "YEARLY" ? "anual" : "mensual"} – Plan ${sub.plan.name}`,
      receiver: await receiverFromProfile(sub.userId),
      periodFrom: start,
      periodTo: end,
    });
    // VA-105: emite, simula o deja pendiente según canIssueRealInvoice (un cobro de $0 no se factura).
    const invoice = await prisma.invoice.findUnique({ where: { invoicedPaymentId: claimed.id }, select: { id: true } });
    const invoiceStatus = invoice ? await processInvoice(invoice.id) : "sin factura ($0)";
    return { status: "PROCESSED", note: `Cobro ${authorizedPaymentId}: aprobado, período hasta ${end.toISOString().slice(0, 10)}; factura: ${invoiceStatus ?? "en proceso"}` };
  }

  const rejected = paymentStatus === "rejected" || ap.status === "recycling" || ap.status === "cancelled";
  if (rejected) {
    if (mpPaymentId) await recordPaymentStatus(mpPaymentId, sub.id, paymentStatus ?? ap.status ?? "rejected", ap);
    return openGrace(sub);
  }
  return { status: "PROCESSED", note: `Cobro ${authorizedPaymentId}: ${ap.status ?? "?"} / pago ${paymentStatus ?? "sin pago"}` };
}

async function claimApprovedPayment(mpPaymentId: string, data: Omit<Prisma.PaymentUncheckedCreateInput, "mpPaymentId">) {
  const existing = await prisma.payment.findUnique({ where: { mpPaymentId }, select: { id: true, status: true } });
  if (existing?.status === "approved") return null;
  if (existing) {
    const updated = await prisma.payment.updateMany({ where: { id: existing.id, status: { not: "approved" } }, data });
    return updated.count === 1 ? { id: existing.id } : null;
  }
  try {
    return await prisma.payment.create({ data: { mpPaymentId, ...data }, select: { id: true } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    throw error;
  }
}

async function recordPaymentStatus(mpPaymentId: string, subscriptionId: string, status: string, ap: AuthorizedPayment) {
  const data = {
    status,
    statusDetail: ap.payment?.status_detail ?? null,
    amount: new Prisma.Decimal(Number(ap.transaction_amount ?? 0)),
    currency: ap.currency_id ?? "ARS",
    subscriptionId,
    raw: JSON.parse(JSON.stringify({ authorizedPayment: ap })) as Prisma.InputJsonValue,
  };
  // No pisa un pago que ya figura aprobado.
  await prisma.payment.upsert({ where: { mpPaymentId }, create: { mpPaymentId, ...data }, update: {} });
  await prisma.payment.updateMany({ where: { mpPaymentId, status: { not: "approved" } }, data: { status, statusDetail: data.statusDetail } });
}

/** Cobro rechazado: gracia de N días (una sola vez por período) y aviso por mail. */
async function openGrace(sub: { id: string; status: string; userId: string; plan: { name: string }; user: { email: string; name: string | null } }): Promise<Outcome> {
  if (sub.status === "PAST_DUE") return { status: "PROCESSED", note: "Cobro rechazado: ya estaba en gracia" };
  if (sub.status !== "ACTIVE") return { status: "PROCESSED", note: `Cobro rechazado con la suscripción en ${sub.status}` };
  const { graceDays } = await getBillingSettings();
  const graceUntil = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);
  const moved = await prisma.subscription.updateMany({ where: { id: sub.id, status: "ACTIVE" }, data: { status: "PAST_DUE", graceUntil } });
  if (moved.count === 0) return { status: "PROCESSED", note: "Cobro rechazado: ya estaba en gracia" };
  try {
    await sendSubscriptionPaymentFailedEmail({
      to: sub.user.email,
      name: sub.user.name,
      planName: sub.plan.name,
      graceUntil,
      profileUrl: `${appUrl()}/profile/${sub.userId}`,
    });
  } catch (error) {
    console.error("[suscripciones] no se pudo mandar el aviso de cobro rechazado:", error);
  }
  return { status: "PROCESSED", note: `Cobro rechazado: en gracia hasta ${graceUntil.toISOString().slice(0, 10)}` };
}

// --------------------------------------------------------------------------- Perfil

/** "Cancelar suscripción": pausa el débito en MP y queda vigente hasta el fin del período. */
export async function cancelAtPeriodEnd(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || !isSubscriptionCurrent(sub)) return { ok: false, error: "No tenés una suscripción activa." };
  if (sub.source === "MANUAL") return { ok: false, error: "Es un plan de cortesía: no tiene cobros que cancelar." };
  if (sub.cancelAtPeriodEnd) return { ok: true };
  if (sub.mpSubscriptionId) await new PreApproval(mpClient()).update({ id: sub.mpSubscriptionId, body: { status: "paused" } });
  await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true, mpStatus: sub.mpSubscriptionId ? "paused" : sub.mpStatus } });
  return { ok: true };
}

/** "Seguir suscripto": reactiva el débito mientras el período siga vigente. */
export async function resumeSubscription(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || !isSubscriptionCurrent(sub)) return { ok: false, error: "La suscripción ya terminó: elegí un plan de nuevo." };
  if (sub.mpSubscriptionId) {
    if (sub.mpStatus === "cancelled") return { ok: false, error: "La suscripción se canceló en Mercado Pago: al terminar el período, suscribite de nuevo." };
    await new PreApproval(mpClient()).update({ id: sub.mpSubscriptionId, body: { status: "authorized" } });
  }
  await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: false, mpStatus: sub.mpSubscriptionId ? "authorized" : sub.mpStatus } });
  return { ok: true };
}

// --------------------------------------------------------------------------- Mantenimiento diario

/**
 * Cron diario (app/api/cron/subscriptions): cierra lo que venció.
 * - PAST_DUE con la gracia vencida → EXPIRED (y se cancela el débito en MP).
 * - ACTIVE con cancelAtPeriodEnd y el período terminado → CANCELLED (y se cancela en MP).
 * - ACTIVE con el período terminado sin cobro nuevo (cortesía vencida, cobro que no llegó) → EXPIRED.
 * - Los avisos sin vencimiento de quien ya no tiene un plan "sin vencimiento" vuelven a vencer en 45 días.
 */
export async function runSubscriptionMaintenance(now = new Date()) {
  const ended = await prisma.subscription.findMany({
    where: {
      OR: [
        { status: "PAST_DUE", graceUntil: { lte: now } },
        { status: "ACTIVE", currentPeriodEnd: { lte: now } },
      ],
    },
    select: { id: true, userId: true, status: true, cancelAtPeriodEnd: true, mpSubscriptionId: true, mpStatus: true, source: true },
  });

  let expired = 0;
  let cancelled = 0;
  for (const s of ended) {
    const finalStatus = s.status === "ACTIVE" && s.cancelAtPeriodEnd ? "CANCELLED" : "EXPIRED";
    if (s.mpSubscriptionId && s.mpStatus !== "cancelled") {
      try {
        await new PreApproval(mpClient()).update({ id: s.mpSubscriptionId, body: { status: "cancelled" } });
      } catch (error) {
        console.error(`[suscripciones] no se pudo cancelar ${s.mpSubscriptionId} en MP:`, error);
        continue; // se reintenta mañana; mientras tanto no se cierra
      }
    }
    const moved = await prisma.subscription.updateMany({
      where: { id: s.id, status: s.status },
      data: { status: finalStatus, mpStatus: s.mpSubscriptionId ? "cancelled" : null, graceUntil: null },
    });
    if (moved.count === 1) {
      if (finalStatus === "CANCELLED") cancelled++;
      else expired++;
      await restoreListingExpiry(s.userId, now);
    }
  }
  return { expired, cancelled };
}

/** Sin plan "sin vencimiento", los avisos activos sin fecha vuelven a vencer en 45 días. */
async function restoreListingExpiry(userId: string, now: Date) {
  const still = await prisma.subscription.findFirst({
    where: {
      userId,
      plan: { noExpiry: true },
      OR: [
        { status: "ACTIVE", currentPeriodEnd: { gt: now } },
        { status: "PAST_DUE", graceUntil: { gt: now } },
      ],
    },
    select: { id: true },
  });
  if (still) return;
  const listingExpiresAt = new Date(now.getTime() + LISTING_DAYS * 24 * 60 * 60 * 1000);
  const where = { sellerId: userId, status: "ACTIVE" as const, listingExpiresAt: null };
  await prisma.aircraft.updateMany({ where, data: { listingExpiresAt } });
  await prisma.sparePart.updateMany({ where, data: { listingExpiresAt } });
  await prisma.hangar.updateMany({ where, data: { listingExpiresAt } });
}
