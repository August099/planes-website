import "server-only";
import type { InvoiceStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

function invoiceCell(invoice: { id: string; status: InvoiceStatus; pdfPath: string | null } | undefined): PurchaseRow["invoice"] {
  if (!invoice) return null;
  if (invoice.status === "ISSUED") return { label: "Emitida", downloadHref: invoice.pdfPath ? `/api/invoices/${invoice.id}/pdf` : null };
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
        payments: {
          where: { status: "approved" },
          select: { invoices: { where: { kind: "FACTURA_C" }, select: { id: true, status: true, pdfPath: true } } },
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
      payment: amount === 0 && p.activatedAt ? { key: "FREE", label: "Sin cargo", tone: "ok" } : PAYMENT[p.paymentStatus],
      invoice: amount > 0 && p.paymentStatus === "APPROVED" ? invoiceCell(invoice) ?? { label: "En preparación", downloadHref: null } : null,
      href: `/payment/status?purchase=${p.id}`,
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
      payment: approved ? PAYMENT.APPROVED : pay.status === "rejected" ? PAYMENT.REJECTED : PAYMENT.IN_PROCESS,
      invoice: approved ? invoiceCell(pay.invoices[0]) ?? { label: "En preparación", downloadHref: null } : null,
      href: null,
    });
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}
