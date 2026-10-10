import "server-only";
import { unstable_cache } from "next/cache";
import type { ListingKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatListingPrice } from "@/lib/listing-price-format";

// Precio por menor de publicar un avión o un repuesto (VA-59). Se edita en /admin/prices y se
// cachea con un tag que la action invalida: /plans y /howtopublish siguen siendo estáticas.
export const LISTING_PRICES_TAG = "listing-prices";

export type ListingPriceInfo = { amount: number; currency: string; label: string };
export type ListingPrices = Record<ListingKind, ListingPriceInfo>;

// Valores de la migración, por si la tabla estuviera vacía (por ejemplo, una base sin el seed).
const DEFAULTS: Record<ListingKind, number> = { AIRCRAFT: 30000, SPARE_PART: 15000 };

export const getListingPrices = unstable_cache(
  async (): Promise<ListingPrices> => {
    const rows = await prisma.listingPrice.findMany();
    const result = {} as ListingPrices;
    for (const kind of Object.keys(DEFAULTS) as ListingKind[]) {
      const row = rows.find((r) => r.kind === kind);
      const amount = row ? Number(row.amount) : DEFAULTS[kind];
      result[kind] = { amount, currency: row?.currency ?? "ARS", label: formatListingPrice(amount) };
    }
    return result;
  },
  ["listing-prices"],
  { tags: [LISTING_PRICES_TAG], revalidate: 3600 }
);
