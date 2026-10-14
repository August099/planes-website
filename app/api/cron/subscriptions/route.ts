import { NextRequest, NextResponse } from "next/server";
import { runSubscriptionMaintenance } from "@/lib/payments/subscriptions";
import { processDueInvoices } from "@/lib/billing/issue";

// VA-92: cron diario de Vercel (vercel.json). Cierra las suscripciones con la gracia vencida y las
// canceladas al terminar el período, devuelve el vencimiento a los avisos y reintenta facturas (VA-105). Vercel manda
// "Authorization: Bearer <CRON_SECRET>"; sin CRON_SECRET cargada, se rechaza todo.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await runSubscriptionMaintenance();
  // VA-105: reintento de facturas pendientes o con error (backoff en nextAttemptAt).
  const invoices = await processDueInvoices();
  console.log("[cron diario]", result, invoices);
  return NextResponse.json({ ...result, invoices });
}
