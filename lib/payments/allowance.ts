import "server-only";
import type { ListingKind } from "@prisma/client";
import { returnListingAllowance, takeListingAllowance, type Funding } from "@/lib/balances";

// VA-92 (decisión del socio, 12/10): al publicar, primero cubre la suscripción vigente; si no, se
// descuenta 1 del saldo; sin ninguna de las dos, el aviso queda "pendiente de pago" y va a /checkout.
// VA-150: el orden de consumo y el registro de con qué se pagó viven en lib/balances.ts.

export type AllowanceSource = Funding | null;

/** Reserva el permiso para publicar un aviso (suscripción o saldo). null = pendiente de pago. */
export function consumeListingAllowance(userId: string, kind: ListingKind): Promise<AllowanceSource> {
  return takeListingAllowance(userId, kind);
}

/** Si la publicación no se pudo crear, devuelve el crédito descontado. */
export function refundListingAllowance(userId: string, kind: ListingKind, source: AllowanceSource) {
  return returnListingAllowance(userId, kind, source);
}
