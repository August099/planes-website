"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { settingsData } from "@/lib/admin-payments";

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

// VA-92: "Reintentar factura" (las que quedaron en ERROR). Vuelve a la cola; la emite el proceso de
// facturación cuando BILLING_ENABLED=true.
export async function retryInvoiceAction(invoiceId: string): Promise<Result> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  const moved = await prisma.invoice.updateMany({
    where: { id: invoiceId, status: "ERROR" },
    data: { status: "PENDING", nextAttemptAt: new Date() },
  });
  if (moved.count === 0) return { ok: false, error: "La factura no está en error." };
  revalidatePath("/admin/payments");
  return { ok: true };
}
