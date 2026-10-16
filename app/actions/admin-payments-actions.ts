"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { settingsData } from "@/lib/admin-payments";
import { processInvoice } from "@/lib/billing/issue";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const settingsSchema = z.object({
  monotributoAnnualCap: z.coerce.number().int("Sin centavos.").min(0).max(10_000_000_000).nullable(),
  alertThresholdPercent: z.coerce.number().int().min(1, "Entre 1 y 100.").max(100, "Entre 1 y 100."),
  dniRequiredFrom: z.coerce.number().int("Sin centavos.").min(0).max(10_000_000_000),
  graceDays: z.coerce.number().int().min(1, "Entre 1 y 60.").max(60, "Entre 1 y 60."),
  maxInvoiceAttempts: z.coerce.number().int().min(1, "Entre 1 y 20.").max(20, "Entre 1 y 20."),
});

// VA-92: configuración de facturación (tope del monotributo y alerta, umbral del DNI, gracia y
// reintentos). Una sola fila.
export async function saveBillingSettingsAction(input: unknown): Promise<Result> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Revisá los campos marcados.", fieldErrors };
  }
  const data = settingsData(parsed.data);
  await prisma.billingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  revalidatePath("/admin/payments");
  return { ok: true };
}

// VA-92: "Reintentar factura" (las que quedaron en ERROR o pendientes). Se procesa en el momento:
// emite, simula o la deja pendiente según canIssueRealInvoice (VA-105).
export async function retryInvoiceAction(invoiceId: string): Promise<Result> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  const moved = await prisma.invoice.updateMany({
    where: { id: invoiceId, status: { in: ["ERROR", "PENDING"] } },
    data: { status: "PENDING", nextAttemptAt: null },
  });
  if (moved.count === 0) return { ok: false, error: "La factura no está pendiente ni en error." };
  const status = await processInvoice(invoiceId);
  revalidatePath("/admin/payments");
  if (status === "PENDING") return { ok: false, error: "Sigue pendiente: la facturación está desactivada (BILLING_ENABLED)." };
  return { ok: true };
}

// VA-105 · 1.1: "Descartar (prueba interna)". La factura pasa a SKIPPED y nunca se emite. Pide escribir
// DESCARTAR y guarda quién y cuándo. Solo pendientes o con error.
export async function discardInvoiceAction(invoiceId: string, confirmText: string): Promise<Result> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  if (confirmText.trim().toUpperCase() !== "DESCARTAR") return { ok: false, error: "Escribí DESCARTAR para confirmar." };
  const moved = await prisma.invoice.updateMany({
    where: { id: invoiceId, status: { in: ["PENDING", "ERROR"] } },
    data: { status: "SKIPPED", skippedAt: new Date(), skippedById: admin.id, nextAttemptAt: null },
  });
  if (moved.count === 0) return { ok: false, error: "Solo se descartan facturas pendientes o con error." };
  revalidatePath("/admin/payments");
  return { ok: true };
}
