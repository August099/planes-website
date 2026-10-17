import "server-only";
import type { InvoiceStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withdrawalUntil } from "@/lib/payments/withdrawal";
import { pendingPaymentExpired } from "@/lib/payments/pending";

// VA-92 · Etapa 5: "Mis compras" del perfil. Une las compras de pago único (Purchase) y los cobros de
// la suscripción (Payment con subscriptionId), con el estado del pago y de la factura.

export type PurchaseRow = {
  id: string;
  date: string; // ISO
  description: string;
  amount: number;
  payment: { key: string; label: string; tone: "ok" | "wait" | "bad" | "muted" };
  invoice: { label: string; downloadHref: string | null } | null;
  href: string | null;
  // VA-125: botón de arrepentimiento (pago aprobado, dentro de los 10 días y sin devolución pedida).
  withdrawal: { paymentId: string; until: string } | null;
};

const PAYMENT: Record<PaymentStatus, PurchaseRow["payment"]> = {
  APPROVED: { key: "APPROVED", label: "Pagado", tone: "ok" },
  PENDING: { key: "PENDING", label: "Pendiente de pago", tone: "wait" },
  IN_PROCESS: { key: "IN_PROCESS", label: "En proceso", tone: "wait" },
  REJECTED: { key: "REJECTED", label: "Rechazado", tone: "bad" },
  CANCELLED: { key: "CANCELLED", label: "Cancelado", tone: "muted" },
  REFUNDED: { key: "REFUNDED", label: "Reintegrado", tone: "muted" },
  PARTIALLY_REFUNDED: { key: "PARTIALLY_REFUNDED", label: "Reintegro parcial", tone: "muted" },
};

const NO_INVOICE: PurchaseRow["invoice"] = { label: "No corresponde", downloadHref: null };

function invoiceCell(invoice: { id: string; status: InvoiceStatus; pdfPath: string | null } | undefined): PurchaseRow["invoice"] {
  if (!invoice) return null;
  if (invoice.status === "ISSUED") return { label: "Emitida", downloadHref: invoice.pdfPath ? `/api/invoices/${invoice.id}/pdf` : null };
  // VA-105: descartada (prueba interna o reembolsada antes de emitir) o simulada (Preview / pago de prueba).
  if (invoice.status === "SKIPPED") return NO_INVOICE;
  if (invoice.status === "ISSUED_SIMULATED") return { label: "Simulada (prueba)", downloadHref: null };
  // Mientras la facturación no esté activa (o falle y se reintente), para el usuario es "en preparación".
  return { label: "En preparación", downloadHref: null };
}

export async function getUserPurchases(userId: string): Promise<PurchaseRow[]> {
  const [purchases, subscriptionPayments] = await Promise.all([
    prisma.purchase.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        approvedAt: true,
        description: true,
        finalPrice: true,
        paymentStatus: true,
        activatedAt: true,
        updatedAt: true,
        payments: {
          where: { status: "approved" },
          select: {
            id: true,
            status: true,
            amount: true,
            refundedAmount: true,
            approvedAt: true,
            withdrawalRequestedAt: true,
            invoices: { where: { kind: "FACTURA_C" }, select: { id: true, status: true, pdfPath: true } },
          },
        },
      },
    }),
    prisma.payment.findMany({
      where: { subscription: { userId } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        approvedAt: true,
        status: true,
        amount: true,
        refundedAmount: true,
        withdrawalRequestedAt: true,
        subscription: { select: { id: true, plan: { select: { name: true, billingInterval: true } } } },
        invoices: { where: { kind: "FACTURA_C" }, select: { id: true, status: true, pdfPath: true } },
      },
    }),
  ]);

  const rows: PurchaseRow[] = purchases.map((p) => {
    const amount = Number(p.finalPrice);
    const invoice = p.payments.flatMap((pay) => pay.invoices)[0];
    return {
      id: p.id,
      date: (p.approvedAt ?? p.createdAt).toISOString(),
      description: p.description || "Compra",
      amount,
      // Un cupón del 100% no pasa por Mercado Pago: se muestra como "Sin cargo".
      payment:
        amount === 0 && p.activatedAt
          ? { key: "FREE", label: "Sin cargo", tone: "ok" }
          : pendingPaymentExpired(p) // VA-140
            ? { key: "EXPIRED", label: "Cancelado (no se pagó)", tone: "muted" }
            : PAYMENT[p.paymentStatus],
      // VA-105 1.2: sin cargo (cupón del 100%) → no corresponde factura.
      invoice:
        amount === 0 && p.activatedAt
          ? NO_INVOICE
          : amount > 0 && ["APPROVED", "PARTIALLY_REFUNDED"].includes(p.paymentStatus)
            ? invoiceCell(invoice) ?? { label: "En preparación", downloadHref: null }
            : null,
      href: `/payment/status?purchase=${p.id}`,
      withdrawal: withdrawalFor(p.payments[0]),
    };
  });

  for (const pay of subscriptionPayments) {
    const sub = pay.subscription!;
    const approved = pay.status === "approved";
    rows.push({
      id: pay.id,
      date: (pay.approvedAt ?? pay.createdAt).toISOString(),
      description: `Suscripción ${sub.plan.billingInterval === "YEARLY" ? "anual" : "mensual"} – Plan ${sub.plan.name}`,
      amount: Number(pay.amount),
      payment: approved
        ? PAYMENT.APPROVED
        : pay.status === "refunded" || pay.status === "charged_back"
          ? PAYMENT.REFUNDED
          : pay.status === "rejected"
            ? PAYMENT.REJECTED
            : PAYMENT.IN_PROCESS,
      invoice: approved ? invoiceCell(pay.invoices[0]) ?? { label: "En preparación", downloadHref: null } : null,
      href: null,
      withdrawal: withdrawalFor(pay),
    });
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function withdrawalFor(
  pay: { id: string; status: string; amount: unknown; refundedAmount: unknown; approvedAt: Date | null; withdrawalRequestedAt: Date | null } | undefined
): PurchaseRow["withdrawal"] {
  if (!pay) return null;
  const until = withdrawalUntil(pay);
  return until ? { paymentId: pay.id, until: until.toISOString() } : null;
}
