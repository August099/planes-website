import "server-only";
import type { ListingKind } from "@prisma/client";
import { getListingPrices } from "@/lib/listing-prices";
import { getBillingSettings } from "@/lib/billing-settings";
import { hasNoExpiryPlan } from "@/lib/subscriptions";

// VA-105 (socio, 14/10): renovar un aviso vencido cuesta un porcentaje (por defecto 70%) del precio
// suelto vigente en /admin/prices. Con un plan que deja ese tipo de aviso sin vencimiento, es gratis.

export const RENEWAL_DAYS = 45;

/** Precio de renovar un aviso de este tipo para este usuario (0 = gratis). */
export async function renewalPrice(userId: string, kind: ListingKind): Promise<{ amount: number; percent: number; covered: boolean }> {
  const [prices, settings, covered] = await Promise.all([getListingPrices(), getBillingSettings(), hasNoExpiryPlan(userId, kind)]);
  if (covered) return { amount: 0, percent: settings.renewalPercent, covered: true };
  return { amount: Math.round((prices[kind].amount * settings.renewalPercent) / 100), percent: settings.renewalPercent, covered: false };
}

/** Nueva fecha de vencimiento: 45 días desde el vencimiento actual si todavía no pasó, si no desde hoy. */
export function renewedExpiry(current: Date | null, now = new Date()): Date {
  const base = current && current > now ? current : now;
  return new Date(base.getTime() + RENEWAL_DAYS * 24 * 60 * 60 * 1000);
}
