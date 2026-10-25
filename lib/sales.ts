import "server-only";
import { prisma } from "@/lib/prisma";
import { getDolarRates } from "@/lib/dolar";

// VA-183: ventas. Al marcar "Vendido" se guarda la fecha, el precio publicado (los aviones se publican en
// dólares; los repuestos, en pesos o dólares) y la cotización oficial del día. Después el dueño puede decir
// si lo vendió gracias a un contacto de VA (Sí / No; si cierra la ventana queda null) y por cuánto.
// Las estadísticas suman todo en dólares: lo que está en pesos se convierte con la cotización de ese día.

export type SaleCurrency = "USD" | "ARS";
export type SaleKind = "AIRCRAFT" | "SPARE_PART";

/** Dólar oficial (venta) de hoy; null si dolarapi no responde. */
async function officialArsPerUsd(): Promise<number | null> {
  try {
    const rate = (await getDolarRates()).find((r) => r.casa === "oficial");
    return rate?.venta && rate.venta > 0 ? rate.venta : null;
  } catch {
    return null;
  }
}

/** Datos que se guardan al pasar a "Vendido". */
export async function saleSnapshot(listing: { price: unknown; inPesos?: boolean }) {
  return {
    soldAt: new Date(),
    soldViaVA: null,
    soldPrice: listing.price == null ? null : Number(listing.price),
    soldCurrency: (listing.inPesos ? "ARS" : "USD") as SaleCurrency,
    soldPriceDeclared: false,
    soldArsPerUsd: await officialArsPerUsd(),
  };
}

/** Al volver a publicar un vendido, la venta no ocurrió: se borra. */
export const CLEARED_SALE = { soldAt: null, soldViaVA: null, soldPrice: null, soldCurrency: null, soldPriceDeclared: false, soldArsPerUsd: null };

export type SaleAnswer = { viaVA: boolean | null; price?: number | null; currency?: SaleCurrency };

/** Respuesta de la ventana "¿Lo vendiste gracias a VA?". Solo el dueño y solo si el aviso está vendido. */
export async function recordSaleAnswer(userId: string, kind: SaleKind, id: string, answer: SaleAnswer): Promise<{ ok: true } | { ok: false; error: string }> {
  const price = answer.price == null ? null : Number(answer.price);
  if (price !== null && (!Number.isFinite(price) || price <= 0 || price > 1e10)) return { ok: false, error: "Revisá el precio." };
  if (answer.currency && answer.currency !== "USD" && answer.currency !== "ARS") return { ok: false, error: "Moneda inválida." };
  const data = {
    soldViaVA: answer.viaVA,
    ...(price !== null ? { soldPrice: price, soldCurrency: answer.currency ?? "USD", soldPriceDeclared: true } : {}),
  };
  const where = { id, sellerId: userId, status: "SOLD" as const };
  const res = kind === "AIRCRAFT" ? await prisma.aircraft.updateMany({ where, data }) : await prisma.sparePart.updateMany({ where, data });
  return res.count ? { ok: true } : { ok: false, error: "Ese aviso no está marcado como vendido." };
}

export type SalesTotals = { count: number; usd: number; viaVA: { count: number; usd: number }; unanswered: number; withoutPrice: number };
export type SalesStats = { from: string | null; aircraft: SalesTotals; parts: SalesTotals; fallbackRate: number | null };

type Row = { soldViaVA: boolean | null; soldPrice: unknown; soldCurrency: SaleCurrency | null; soldArsPerUsd: unknown };

function totals(rows: Row[], fallbackRate: number | null): SalesTotals {
  const out: SalesTotals = { count: rows.length, usd: 0, viaVA: { count: 0, usd: 0 }, unanswered: 0, withoutPrice: 0 };
  for (const r of rows) {
    const price = r.soldPrice == null ? null : Number(r.soldPrice);
    const rate = r.soldArsPerUsd == null ? fallbackRate : Number(r.soldArsPerUsd);
    const usd = price == null ? null : r.soldCurrency === "ARS" ? (rate ? price / rate : null) : price;
    if (usd === null) out.withoutPrice++;
    else out.usd += usd;
    if (r.soldViaVA === null) out.unanswered++;
    if (r.soldViaVA) {
      out.viaVA.count++;
      out.viaVA.usd += usd ?? 0;
    }
  }
  out.usd = Math.round(out.usd);
  out.viaVA.usd = Math.round(out.viaVA.usd);
  return out;
}

/** Ventas desde `from` (o todas), aviones y repuestos por separado, en dólares. */
export async function getSalesStats(from: Date | null): Promise<SalesStats> {
  const where = { status: "SOLD" as const, soldAt: from ? { gte: from } : { not: null } };
  const select = { soldViaVA: true, soldPrice: true, soldCurrency: true, soldArsPerUsd: true } as const;
  const [aircraft, parts] = await Promise.all([prisma.aircraft.findMany({ where, select }), prisma.sparePart.findMany({ where, select })]);
  // Ventas viejas sin cotización guardada (las de antes de VA-183): se convierten con la de hoy.
  const needsFallback = [...aircraft, ...parts].some((r) => r.soldCurrency === "ARS" && r.soldArsPerUsd == null);
  const fallbackRate = needsFallback ? await officialArsPerUsd() : null;
  return { from: from?.toISOString() ?? null, aircraft: totals(aircraft, fallbackRate), parts: totals(parts, fallbackRate), fallbackRate };
}
