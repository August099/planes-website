import "server-only";
import { Prisma, type InvoiceStatus, type PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// VA-92 · Etapa 5: admin "Pagos y facturas". Una fila por compra (pago único) o por cobro de una
// suscripción; filtros por estado del pago, de la factura y fechas; indicador del tope del monotributo.

export type AdminPaymentFilters = {
  payment?: string; // PaymentStatus de la compra o "approved"/"rejected"… del cobro
  invoice?: InvoiceStatus | "NONE";
  from?: Date;
  to?: Date;
};

export type AdminPaymentRow = {
  key: string; // "p:<purchaseId>" o "s:<paymentId>"
  date: Date;
  user: { id: string; name: string | null; email: string };
  kind: "Pago único" | "Suscripción";
  description: string;
  amount: number;
  paymentLabel: string;
  paymentTone: "ok" | "wait" | "bad" | "muted";
  mpPaymentId: string | null;
  invoiceStatus: InvoiceStatus | null;
};

const PURCHASE_LABEL: Record<PaymentStatus, [string, AdminPaymentRow["paymentTone"]]> = {
  APPROVED: ["Aprobado", "ok"],
  PENDING: ["Pendiente", "wait"],
  IN_PROCESS: ["En proceso", "wait"],
  REJECTED: ["Rechazado", "bad"],
  CANCELLED: ["Cancelado", "muted"],
  REFUNDED: ["Reintegrado", "muted"],
  PARTIALLY_REFUNDED: ["Reintegro parcial", "muted"],
};

export const PAYMENT_FILTERS: { value: string; label: string }[] = [
  { value: "APPROVED", label: "Aprobado" },
  { value: "PENDING", label: "Pendiente" },
  { value: "IN_PROCESS", label: "En proceso" },
  { value: "REJECTED", label: "Rechazado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "REFUNDED", label: "Reintegrado" },
  { value: "PARTIALLY_REFUNDED", label: "Reintegro parcial" },
];

const MP_TO_PURCHASE: Record<string, PaymentStatus> = {
  approved: "APPROVED",
  pending: "PENDING",
  in_process: "IN_PROCESS",
  authorized: "IN_PROCESS",
  rejected: "REJECTED",
  recycling: "REJECTED",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
  charged_back: "REFUNDED",
};

export async function listAdminPayments(f: AdminPaymentFilters, take = 200): Promise<AdminPaymentRow[]> {
  const created = f.from || f.to ? { ...(f.from && { gte: f.from }), ...(f.to && { lte: f.to }) } : undefined;
  const paymentStatus = PAYMENT_FILTERS.some((o) => o.value === f.payment) ? (f.payment as PaymentStatus) : undefined;
  const invoiceWhere =
    f.invoice === "NONE"
      ? { none: { kind: "FACTURA_C" as const } }
      : f.invoice
        ? { some: { kind: "FACTURA_C" as const, status: f.invoice } }
        : undefined;

  const [purchases, subPayments] = await Promise.all([
    prisma.purchase.findMany({
      where: {
        ...(created && { createdAt: created }),
        ...(paymentStatus && { paymentStatus }),
        ...(invoiceWhere && { payments: f.invoice === "NONE" ? { none: { invoices: { some: { kind: "FACTURA_C" } } } } : { some: { invoices: invoiceWhere } } }),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        createdAt: true,
        description: true,
        finalPrice: true,
        paymentStatus: true,
        activatedAt: true,
        user: { select: { id: true, name: true, email: true } },
        payments: { orderBy: { createdAt: "desc" }, select: { mpPaymentId: true, invoices: { where: { kind: "FACTURA_C" }, select: { status: true } } } },
      },
    }),
    prisma.payment.findMany({
      where: {
        subscriptionId: { not: null },
        ...(created && { createdAt: created }),
        ...(paymentStatus && { status: { in: Object.entries(MP_TO_PURCHASE).filter(([, v]) => v === paymentStatus).map(([k]) => k) } }),
        ...(invoiceWhere && { invoices: invoiceWhere }),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        createdAt: true,
        status: true,
        amount: true,
        mpPaymentId: true,
        subscription: { select: { plan: { select: { name: true } }, user: { select: { id: true, name: true, email: true } } } },
        invoices: { where: { kind: "FACTURA_C" }, select: { status: true } },
      },
    }),
  ]);

  const rows: AdminPaymentRow[] = purchases.map((p) => {
    const amount = Number(p.finalPrice);
    const [label, tone] = amount === 0 && p.activatedAt ? (["Sin cargo (cupón)", "ok"] as const) : PURCHASE_LABEL[p.paymentStatus];
    const lastPayment = p.payments[0];
    return {
      key: `p:${p.id}`,
      date: p.createdAt,
      user: p.user,
      kind: "Pago único",
      description: p.description || "Compra",
      amount,
      paymentLabel: label,
      paymentTone: tone,
      mpPaymentId: lastPayment?.mpPaymentId ?? null,
      invoiceStatus: p.payments.flatMap((x) => x.invoices)[0]?.status ?? null,
    };
  });
  for (const s of subPayments) {
    const [label, tone] = PURCHASE_LABEL[MP_TO_PURCHASE[s.status] ?? "PENDING"];
    rows.push({
      key: `s:${s.id}`,
      date: s.createdAt,
      user: s.subscription!.user,
      kind: "Suscripción",
      description: `Suscripción – Plan ${s.subscription!.plan.name}`,
      amount: Number(s.amount),
      paymentLabel: label,
      paymentTone: tone,
      mpPaymentId: s.mpPaymentId,
      invoiceStatus: s.invoices[0]?.status ?? null,
    });
  }
  return rows.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, take);
}

/** Total facturado de los últimos 12 meses: facturas emitidas menos notas de crédito. */
export async function invoicedLast12Months(now = new Date()) {
  const since = new Date(now);
  since.setFullYear(since.getFullYear() - 1);
  const sums = await prisma.invoice.groupBy({
    by: ["kind"],
    where: { status: "ISSUED", issuedAt: { gte: since } },
    _sum: { total: true },
  });
  const sum = (kind: string) => Number(sums.find((s) => s.kind === kind)?._sum.total ?? 0);
  return sum("FACTURA_C") - sum("NOTA_CREDITO_C");
}

export async function invoiceCounts() {
  const rows = await prisma.invoice.groupBy({ by: ["status"], _count: { _all: true } });
  const c = (s: InvoiceStatus) => rows.find((r) => r.status === s)?._count._all ?? 0;
  return { pending: c("PENDING"), issued: c("ISSUED"), error: c("ERROR") };
}

/** Detalle de una fila: compra o cobro de suscripción, con sus pagos, facturas y eventos del webhook. */
export async function getAdminPaymentDetail(key: string) {
  const [type, id] = key.split(":");
  if (type === "p") {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true } },
        coupon: { select: { code: true } },
        payments: { orderBy: { createdAt: "asc" }, include: { invoices: { orderBy: { createdAt: "asc" } } } },
        aircrafts: { select: { id: true, title: true } },
        spareParts: { select: { id: true, title: true } },
      },
    });
    if (!purchase) return null;
    const events = await eventsFor(purchase.payments.map((p) => p.mpPaymentId));
    return { type: "purchase" as const, purchase, payments: purchase.payments, events };
  }
  if (type === "s") {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoices: { orderBy: { createdAt: "asc" } },
        subscription: { include: { plan: { select: { name: true } }, user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!payment) return null;
    const events = await eventsFor([payment.mpPaymentId, payment.subscription?.mpSubscriptionId ?? ""].filter(Boolean));
    return { type: "subscription" as const, payment, payments: [payment], events };
  }
  return null;
}

async function eventsFor(externalIds: string[]) {
  if (externalIds.length === 0) return [];
  return prisma.webhookEvent.findMany({
    where: { externalId: { in: externalIds } },
    orderBy: { receivedAt: "asc" },
    select: { id: true, receivedAt: true, topic: true, action: true, externalId: true, signatureValid: true, status: true, error: true, attempts: true },
  });
}

/** CSV para el contador: pagos aprobados del período con su factura. */
export async function paymentsCsv(from: Date, to: Date): Promise<string> {
  const payments = await prisma.payment.findMany({
    where: { status: "approved", approvedAt: { gte: from, lte: to } },
    orderBy: { approvedAt: "asc" },
    select: {
      mpPaymentId: true,
      approvedAt: true,
      amount: true,
      refundedAmount: true,
      method: true,
      purchase: { select: { description: true, billingSnapshot: true, user: { select: { email: true } } } },
      subscription: { select: { plan: { select: { name: true } }, user: { select: { email: true } } } },
      invoices: { orderBy: { createdAt: "asc" }, select: { kind: true, status: true, pointOfSale: true, number: true, cae: true, total: true } },
    },
  });
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Fecha", "Pago MP", "Concepto", "Email", "Receptor", "Documento", "Monto", "Reintegrado", "Medio", "Factura", "Estado factura", "CAE"];
  const lines = payments.map((p) => {
    const receiver = (p.purchase?.billingSnapshot ?? {}) as { name?: string; docType?: string; docNumber?: string };
    const invoice = p.invoices.find((i) => i.kind === "FACTURA_C");
    return [
      p.approvedAt?.toISOString().slice(0, 10),
      p.mpPaymentId,
      p.purchase?.description ?? (p.subscription ? `Suscripción – Plan ${p.subscription.plan.name}` : ""),
      p.purchase?.user.email ?? p.subscription?.user.email ?? "",
      receiver.name ?? "",
      receiver.docNumber ? `${receiver.docType ?? ""} ${receiver.docNumber}`.trim() : "",
      Number(p.amount).toFixed(2),
      Number(p.refundedAmount).toFixed(2),
      p.method ?? "",
      invoice?.number != null ? `C ${String(invoice.pointOfSale ?? 0).padStart(5, "0")}-${String(invoice.number).padStart(8, "0")}` : "",
      invoice?.status ?? "",
      invoice?.cae ?? "",
    ].map(esc).join(";");
  });
  // BOM para que Excel abra bien los acentos.
  return "﻿" + [header.join(";"), ...lines].join("\r\n");
}

export type BillingSettingsInput = {
  monotributoAnnualCap: number | null;
  alertThresholdPercent: number;
  dniRequiredFrom: number;
  graceDays: number;
  maxInvoiceAttempts: number;
};

export function settingsData(input: BillingSettingsInput) {
  return {
    monotributoAnnualCap: input.monotributoAnnualCap == null ? null : new Prisma.Decimal(input.monotributoAnnualCap),
    alertThresholdPercent: input.alertThresholdPercent,
    dniRequiredFrom: new Prisma.Decimal(input.dniRequiredFrom),
    graceDays: input.graceDays,
    maxInvoiceAttempts: input.maxInvoiceAttempts,
  };
}
