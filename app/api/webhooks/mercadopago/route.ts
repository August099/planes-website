import { NextRequest, NextResponse, after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mpWebhookSecret } from "@/lib/mercadopago";
import { verifyMercadoPagoSignature } from "@/lib/payments/signature";
import { processWebhookEvent } from "@/lib/payments/process";

// VA-92 · Etapa 3: webhook de Mercado Pago (pagos y suscripciones). Es la fuente de verdad: la
// compra se activa acá, nunca en la página de retorno.
// 1. Valida la firma (x-signature). Sin MP_WEBHOOK_SECRET rechaza todo (fail closed).
// 2. Guarda cada notificación en WebhookEvent, válida o no.
// 3. Responde 200 rápido y procesa después (after): consulta el recurso a la API de MP.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const rawBody = await req.text();
  let body: Record<string, unknown> = {};
  try {
    body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    body = { unparsed: rawBody.slice(0, 2000) };
  }
  const bodyData = (body.data ?? {}) as { id?: unknown };

  // Webhooks: ?data.id=…&type=…; el formato viejo (IPN) manda ?id=…&topic=….
  const dataId = url.searchParams.get("data.id") ?? (bodyData.id != null ? String(bodyData.id) : null) ?? url.searchParams.get("id");
  const topic = url.searchParams.get("type") ?? (typeof body.type === "string" ? body.type : null) ?? url.searchParams.get("topic") ?? "desconocido";
  const action = typeof body.action === "string" ? body.action : null;
  const requestId = req.headers.get("x-request-id");

  const check = verifyMercadoPagoSignature({
    secret: mpWebhookSecret(),
    signature: req.headers.get("x-signature"),
    requestId,
    dataId: url.searchParams.get("data.id") ?? dataId,
  });

  // Headers útiles para diagnosticar una firma rechazada (x-signature es el HMAC, no la clave).
  const payload = {
    query: Object.fromEntries(url.searchParams),
    body,
    headers: {
      "x-signature": req.headers.get("x-signature"),
      "x-request-id": requestId,
      "user-agent": req.headers.get("user-agent"),
    },
  } as Prisma.InputJsonValue;

  const event = await prisma.webhookEvent.create({
    data: {
      topic,
      action,
      externalId: dataId,
      requestId,
      signatureValid: check.valid,
      payload,
      status: check.valid ? "RECEIVED" : "REJECTED",
      error: check.valid ? null : check.reason,
    },
    select: { id: true },
  });

  if (!check.valid) {
    console.warn(`[webhook MP] rechazado (${check.reason}) · evento ${event.id} · ${topic} ${dataId ?? ""}`);
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  after(() => processWebhookEvent(event.id));
  return NextResponse.json({ received: true });
}
