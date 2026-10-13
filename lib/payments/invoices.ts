import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// VA-92: factura C pendiente por cada pago aprobado (pago único o cobro de una suscripción). Una
// por pago: índice único invoicedPaymentId (createMany con skipDuplicates no falla si ya existe).
// La emite la etapa de TusFacturas cuando BILLING_ENABLED=true; mientras tanto queda PENDING.
export async function queueInvoice(input: {
  paymentId: string;
  amount: number;
  description: string;
  receiver: Prisma.JsonValue | null;
  periodFrom: Date;
  periodTo: Date;
}) {
  if (input.amount <= 0) return;
  await prisma.invoice.createMany({
    data: [
      {
        kind: "FACTURA_C",
        paymentId: input.paymentId,
        invoicedPaymentId: input.paymentId,
        total: new Prisma.Decimal(input.amount),
        periodFrom: input.periodFrom,
        periodTo: input.periodTo,
        description: input.description || "Servicio de publicación en Ventas Aeronáuticas",
        receiver: (input.receiver ?? {}) as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });
}

/** Datos del receptor desde el perfil de facturación del usuario (cobros de suscripciones). */
export async function receiverFromProfile(userId: string): Promise<Prisma.JsonValue> {
  const p = await prisma.billingProfile.findUnique({ where: { userId } });
  if (!p) return {};
  return { kind: p.kind, name: p.name, docType: p.docType, docNumber: p.docNumber, ivaCondition: p.ivaCondition, address: p.address, email: p.email };
}
