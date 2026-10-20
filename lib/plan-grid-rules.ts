import { z } from "zod";
import { LISTING_PRICE_MAX } from "@/lib/listing-price-format";
import { SYSTEM_KEYS, type GridRow, type Metrics, type VaPage } from "@/lib/plan-grid";

// VA-166: lo que se edita en la grilla de /admin/plans, compartido entre el editor (cliente) y la action.
// Base y Pro: cupos y republicaciones por año. Broker: un precio para "un rubro ilimitado" (aviones o
// repuestos) y otro para "ambos"; lo no ilimitado tiene el cupo de Base. Los beneficios (verificado,
// destacadas, Página VA, detalles personalizados y métricas) se prenden por columna.

const count = z.coerce.number().int("Número entero.").min(0, "No puede ser negativo.").max(1000, "Hasta 1000.");
const price = z.coerce.number().int("Sin centavos.").min(0, "No puede ser negativo.").max(LISTING_PRICE_MAX, "Hasta AR$ 10.000.000.");
const benefits = {
  verified: z.boolean(),
  featured: z.boolean(),
  vaPage: z.enum(["NONE", "BANNER", "FULL"]),
  customDetail: z.boolean(),
  metrics: z.enum(["BASIC", "PRO", "FULL"]),
};
const cell = z.object({ kind: z.enum(["yes", "no", "text"]), text: z.string().trim().max(60, "Hasta 60 caracteres.").optional() });

export const gridDraftSchema = z.object({
  base: z.object({ aircraft: count, parts: count, republishesPerYear: count, ...benefits }),
  pro: z.object({ price, listPrice: price.nullable(), isActive: z.boolean(), aircraft: count, parts: count, republishesPerYear: count, ...benefits }).nullable(),
  broker: z
    .object({
      priceOne: price,
      listOne: price.nullable(),
      priceBoth: price,
      listBoth: price.nullable(),
      isActive: z.boolean(),
      republishAllEveryDays: z.coerce.number().int().min(1, "Al menos 1 día.").max(365, "Hasta 365 días."),
      ...benefits,
    })
    .nullable(),
  rows: z
    .array(
      z.object({
        id: z.string().max(40),
        label: z.string().trim().min(1, "Poné un nombre a la fila.").max(60, "Hasta 60 caracteres."),
        systemKey: z.enum(SYSTEM_KEYS as [string, ...string[]]).nullable(),
        cells: z.object({ BASE: cell.optional(), PRO: cell.optional(), BROKER: cell.optional() }),
      })
    )
    .max(30, "Hasta 30 filas."),
}).superRefine((d, ctx) => {
  if (d.pro?.isActive && d.pro.price <= 0) ctx.addIssue({ code: "custom", path: ["pro", "price"], message: "Cargá el precio del Pro antes de activarlo." });
  if (d.broker?.isActive && (d.broker.priceOne <= 0 || d.broker.priceBoth <= 0))
    ctx.addIssue({ code: "custom", path: ["broker", "priceOne"], message: "Cargá los dos precios del Broker antes de activarlo." });
  const keys = d.rows.map((r) => r.systemKey).filter(Boolean);
  for (const k of SYSTEM_KEYS) if (!keys.includes(k)) ctx.addIssue({ code: "custom", path: ["rows"], message: "Las filas del sistema no se pueden quitar." });
});

export type GridBenefits = { verified: boolean; featured: boolean; vaPage: VaPage; customDetail: boolean; metrics: Metrics };
export type GridDraft = {
  base: { aircraft: number; parts: number; republishesPerYear: number } & GridBenefits;
  pro: ({ price: number; listPrice: number | null; isActive: boolean; aircraft: number; parts: number; republishesPerYear: number } & GridBenefits) | null;
  broker: ({ priceOne: number; listOne: number | null; priceBoth: number; listBoth: number | null; isActive: boolean; republishAllEveryDays: number } & GridBenefits) | null;
  rows: GridRow[];
};
