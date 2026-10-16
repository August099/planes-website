import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBillingSettings } from "@/lib/billing-settings";
import { billingDecision, readBillingEnv } from "@/lib/billing/guard";
import { buildInvoicePayload, type Receiver } from "@/lib/billing/payload";
import { mpAccountIsTest } from "@/lib/payments/mp-account";
import { EMAIL_FROM, getSupportEmail } from "@/lib/mail";
import { Resend } from "resend";

// VA-92 etapa 4 + VA-105: emisión de facturas C y notas de crédito C con TusFacturasAPP.
// - BILLING_ENABLED=false → no se procesa: queda PENDING (así se hace el pago real de prueba).
// - Sin las cinco condiciones de canIssueRealInvoice → se SIMULA: ISSUED_SIMULATED con el JSON que se
//   habría enviado, sin llamar a TusFacturas (las credenciales cargadas son de producción).
// - Real: POST /facturacion/nuevo. 429 → reintento; error "S" → ERROR con backoff hasta N intentos y
//   mail al admin; OK → ISSUED con CAE, número y PDF guardado en el bucket privado.
// Idempotencia: una factura por pago (índice único) y un "claim" optimista antes de llamar, así dos
// procesos no emiten la misma factura.

const ENDPOINT = "https://www.tusfacturas.app/app/api/v2/facturacion/nuevo";
export const INVOICES_BUCKET = process.env.INVOICES_BUCKET?.trim() || "invoices";

type TfResponse = {
  error?: "S" | "N";
  errores?: string[];
  rta?: string;
  cae?: string;
  vencimiento_cae?: string;
  comprobante_nro?: string | number;
  comprobante_pdf_url?: string;
  observaciones?: unknown;
  mantenimiento?: number;
};

const parseTfDate = (s: string | undefined) => {
  const m = s?.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00-03:00`) : null;
};

function backoff(attempt: number): Date {
  const minutes = [5, 30, 180, 720, 1440][Math.min(attempt - 1, 4)];
  return new Date(Date.now() + minutes * 60_000);
}

/** Procesa una factura PENDING o en ERROR. Devuelve el estado final (o null si otro proceso la tomó). */
export async function processInvoice(invoiceId: string): Promise<string | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payment: {
        select: {
          id: true,
          mpPaymentId: true,
          liveMode: true,
          isTest: true,
          purchase: { select: { userId: true, user: { select: { province: true } } } },
          subscription: { select: { userId: true, user: { select: { province: true } } } },
        },
      },
      originalInvoice: { select: { pointOfSale: true, number: true, issuedAt: true, status: true } },
    },
  });
  if (!invoice || !["PENDING", "ERROR"].includes(invoice.status)) return invoice?.status ?? null;
  if (Number(invoice.total) <= 0) return invoice.status; // VA-105 1.2: nunca se factura $0

  const env = readBillingEnv();
  const decision = billingDecision(env, { liveMode: invoice.payment.liveMode, mpAccountIsTest: await mpAccountIsTest() });
  if (decision.action === "skip") return invoice.status;

  const owner = invoice.payment.purchase ?? invoice.payment.subscription;
  const pointOfSale = Number(process.env.TUSFACTURAS_PUNTO_VENTA) || 0;
  if (invoice.kind === "NOTA_CREDITO_C" && (!invoice.originalInvoice || invoice.originalInvoice.status !== "ISSUED")) {
    // La nota de crédito espera a que la factura original esté emitida (y la simulada no se anula).
    return invoice.status;
  }
  const payload = buildInvoicePayload({
    kind: invoice.kind,
    pointOfSale,
    total: Number(invoice.total),
    description: invoice.description,
    date: new Date(),
    periodFrom: invoice.periodFrom,
    periodTo: invoice.periodTo,
    receiver: (invoice.receiver ?? {}) as Receiver,
    customerCode: owner?.userId ?? "consumidor-final",
    province: owner?.user.province ?? null,
    externalReference: invoice.id,
    associated:
      invoice.kind === "NOTA_CREDITO_C" && invoice.originalInvoice?.number != null
        ? { pointOfSale: invoice.originalInvoice.pointOfSale ?? pointOfSale, number: invoice.originalInvoice.number, date: invoice.originalInvoice.issuedAt ?? new Date() }
        : undefined,
  });

  // Claim optimista: solo un proceso pasa de acá con esta versión de la fila.
  const claimed = await prisma.invoice.updateMany({
    where: { id: invoice.id, updatedAt: invoice.updatedAt, status: { in: ["PENDING", "ERROR"] } },
    data: { attempts: { increment: 1 }, requestPayload: payload as Prisma.InputJsonValue, mode: decision.action === "issue" ? "production" : "simulated" },
  });
  if (claimed.count === 0) return null;
  const attempt = invoice.attempts + 1;

  if (decision.action === "simulate") {
    console.info(`[facturación] SIMULADA ${invoice.kind} ${invoice.id} (${decision.reasons.join("; ")}):`, JSON.stringify(payload));
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "ISSUED_SIMULATED", issuedAt: new Date(), pointOfSale, errors: null, arcaObservations: `Simulada: ${decision.reasons.join("; ")}`, nextAttemptAt: null },
    });
    return "ISSUED_SIMULATED";
  }

  // --- Emisión real (las cinco condiciones se cumplen)
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        apikey: process.env.TUSFACTURAS_API_KEY,
        apitoken: process.env.TUSFACTURAS_API_TOKEN,
        usertoken: process.env.TUSFACTURAS_USER_TOKEN,
        ...payload,
      }),
      cache: "no-store",
    });
  } catch (error) {
    return failInvoice(invoice.id, attempt, `No se pudo conectar con TusFacturas: ${String(error)}`);
  }
  if (res.status === 429) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PENDING", nextAttemptAt: new Date(Date.now() + 60_000), errors: "429: demasiados pedidos, se reintenta" } });
    return "PENDING";
  }
  const body = (await res.json().catch(() => ({}))) as TfResponse;
  if (!res.ok || body.error !== "N") {
    const detail = body.mantenimiento ? `TusFacturas en mantenimiento. ${body.errores?.join(" | ") ?? ""}` : (body.errores ?? []).join(" | ") || `HTTP ${res.status}`;
    return failInvoice(invoice.id, attempt, detail);
  }

  const number = body.comprobante_nro != null ? Number(String(body.comprobante_nro).replace(/\D/g, "").slice(-8)) : null;
  let pdfPath: string | null = null;
  if (body.comprobante_pdf_url) pdfPath = await storePdf(invoice.id, body.comprobante_pdf_url);
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "ISSUED",
      pointOfSale,
      number,
      cae: body.cae?.trim() || null,
      caeExpiresAt: parseTfDate(body.vencimiento_cae),
      issuedAt: new Date(),
      arcaObservations: body.observaciones ? JSON.stringify(body.observaciones).slice(0, 4000) : null,
      errors: null,
      nextAttemptAt: null,
      pdfPath,
    },
  });
  return "ISSUED";
}

async function failInvoice(id: string, attempt: number, message: string): Promise<string> {
  const { maxInvoiceAttempts } = await getBillingSettings();
  const giveUp = attempt >= maxInvoiceAttempts;
  await prisma.invoice.update({
    where: { id },
    data: { status: "ERROR", errors: message.slice(0, 4000), nextAttemptAt: giveUp ? null : backoff(attempt) },
  });
  console.error(`[facturación] error en ${id} (intento ${attempt}):`, message);
  if (giveUp) await alertAdmin(id, message);
  return "ERROR";
}

async function alertAdmin(invoiceId: string, message: string) {
  const to = getSupportEmail();
  if (!to || !process.env.RESEND_API_KEY) return;
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Factura con error en Ventas Aeronáuticas",
      text: `La factura ${invoiceId} no se pudo emitir después de varios intentos.\n\n${message}\n\nRevisala en Admin → Pagos y facturas.`,
    });
  } catch (error) {
    console.error("[facturación] no se pudo avisar al admin:", error);
  }
}

/** El PDF de TusFacturas vale solo ese día: se descarga y se guarda en el bucket privado. */
async function storePdf(invoiceId: string, url: string): Promise<string | null> {
  try {
    const pdf = await fetch(url, { cache: "no-store" });
    if (!pdf.ok) throw new Error(`HTTP ${pdf.status}`);
    const bytes = new Uint8Array(await pdf.arrayBuffer());
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const path = `${new Date().getFullYear()}/${invoiceId}.pdf`;
    const { error } = await supabase.storage.from(INVOICES_BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (error) throw error;
    return path;
  } catch (error) {
    console.error(`[facturación] no se pudo guardar el PDF de ${invoiceId}:`, error);
    return null;
  }
}

/** Link firmado (5 minutos) al PDF guardado. */
export async function signedInvoicePdfUrl(pdfPath: string): Promise<string | null> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await supabase.storage.from(INVOICES_BUCKET).createSignedUrl(pdfPath, 300);
  if (error) return null;
  return data.signedUrl;
}

/** Facturas pendientes o con error que ya pueden reintentarse (cron diario y botón del admin). */
export async function processDueInvoices(limit = 25) {
  const due = await prisma.invoice.findMany({
    where: {
      status: { in: ["PENDING", "ERROR"] },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, status: true, attempts: true },
  });
  const { maxInvoiceAttempts } = await getBillingSettings();
  const results: Record<string, number> = {};
  for (const inv of due) {
    if (inv.status === "ERROR" && inv.attempts >= maxInvoiceAttempts) continue; // ya se avisó al admin
    const r = (await processInvoice(inv.id)) ?? "tomada por otro proceso";
    results[r] = (results[r] ?? 0) + 1;
    await new Promise((ok) => setTimeout(ok, 150)); // TusFacturas pide no saturar (429)
  }
  return results;
}
