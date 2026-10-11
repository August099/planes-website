import type { ListingKind } from "@prisma/client";

// Formato y reglas del precio de publicación (VA-59), compartidos entre el admin (cliente) y el
// servidor. Solo import de tipos de Prisma.
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export const LISTING_KIND_LABELS: Record<ListingKind, string> = {
  AIRCRAFT: "Publicar un avión",
  SPARE_PART: "Publicar un repuesto",
  HANGAR: "Publicar un hangar",
};

/** Tope del precio, para que un cero de más no pase. */
export const LISTING_PRICE_MAX = 10_000_000;

export function formatListingPrice(amount: number): string {
  return amount === 0 ? "Gratis" : `AR$ ${NUMBER.format(amount)}`;
}

/** Variación porcentual; null si el precio anterior era 0. */
export function priceChangePercent(previous: number, next: number): number | null {
  if (previous === 0) return null;
  return ((next - previous) / previous) * 100;
}

/** Cambios que piden escribir "CONFIRMAR": más del 50 % (en cualquier sentido), a 0 o desde 0. */
export function isLargePriceChange(previous: number, next: number): boolean {
  if (previous === next) return false;
  if (next === 0 || previous === 0) return true;
  return Math.abs(priceChangePercent(previous, next)!) > 50;
}
