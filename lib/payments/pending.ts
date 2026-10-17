import type { PaymentStatus } from "@prisma/client";

// VA-140: una compra que quedó "pendiente de pago" (se abrió Mercado Pago y no se pagó) se cancela a
// los 5 minutos: el link de pago vence a esa hora y en "Mis compras" y en la página de estado se
// muestra como cancelada, con la opción de intentar de nuevo. Se mide desde la última vez que se
// armó el pago (updatedAt: al reintentar un aviso o una renovación se reutiliza la compra).
export const PENDING_PAYMENT_MINUTES = 5;

export function pendingPaymentExpired(
  p: { paymentStatus: PaymentStatus; activatedAt: Date | null; updatedAt: Date },
  now = new Date()
): boolean {
  return !p.activatedAt && p.paymentStatus === "PENDING" && now.getTime() - p.updatedAt.getTime() > PENDING_PAYMENT_MINUTES * 60_000;
}
