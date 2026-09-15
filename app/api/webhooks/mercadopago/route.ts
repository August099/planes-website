import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Payment } from "mercadopago";
import { mpClient } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

function verifySignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null
): boolean {
  if (!xSignature || !xRequestId || !dataId) return false;

  const parts = xSignature.split(",");
  const ts = parts.find((p) => p.startsWith("ts="))?.split("=")[1];
  const hash = parts.find((p) => p.startsWith("v1="))?.split("=")[1];
  if (!ts || !hash) return false;

  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = crypto
    .createHmac("sha256", process.env.MP_WEBHOOK_SECRET!)
    .update(template)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id");
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!verifySignature(xSignature, xRequestId, dataId)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const payment = await new Payment(mpClient).get({ id: dataId! });

  if (payment.status === "approved" && payment.external_reference) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: payment.external_reference },
      include: { plan: true },
    });

    if (purchase && purchase.paymentStatus === "PENDING") {
      // 1. Marcar la compra como APROBADA
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { paymentStatus: "APPROVED" },
      });

      // 2. Aumentar el balance del usuario según las publicaciones del plan
      if (purchase.plan) {
        await prisma.user.update({
          where: { id: purchase.userId },
          data: {
            aircraftListingsBalance: {
              increment: purchase.plan.aircraftListingsCount,
            },
            sparePartsListingsBalance: {
              increment: purchase.plan.sparePartsListingsCount,
            },
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}