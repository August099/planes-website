import "server-only";
import { prisma } from "@/lib/prisma";

// VA-92: configuración de facturación (una fila, id "default", editable desde el admin). Si todavía
// no se guardó, valen los valores por defecto del schema.
export async function getBillingSettings() {
  const s = await prisma.billingSettings.findUnique({ where: { id: "default" } });
  return {
    dniRequiredFrom: s ? Number(s.dniRequiredFrom) : 10_000_000,
    graceDays: s?.graceDays ?? 7,
    maxInvoiceAttempts: s?.maxInvoiceAttempts ?? 5,
    monotributoAnnualCap: s?.monotributoAnnualCap != null ? Number(s.monotributoAnnualCap) : null,
    alertThresholdPercent: s?.alertThresholdPercent ?? 80,
    lastCapAlertAt: s?.lastCapAlertAt ?? null,
    // VA-105: renovar un aviso vencido cuesta este porcentaje del precio suelto.
    renewalPercent: s?.renewalPercent ?? 70,
  };
}
