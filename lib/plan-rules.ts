import { z } from "zod";
import { LISTING_PRICE_MAX } from "@/lib/listing-price-format";

// VA-80 / VA-152: reglas de un plan, compartidas entre el formulario del admin (cliente) y la action.
// Con los cupos fijos, la estructura es fija: Pro (cupo editable) y Empresarial en 3 opciones (lo
// ilimitado sale de la opción). El nivel y lo ilimitado no se editan; el precio, los beneficios y lo
// que se ve en /plans, sí. Todas son suscripciones mensuales.

export const PLAN_TIER_LABELS: Record<string, string> = { PRO: "Pro", BUSINESS: "Empresarial" };

const count = z.coerce.number().int("Tiene que ser un número entero.").min(1, "Al menos 1.").max(1000, "Hasta 1000.");

export const planInputSchema = z
  .object({
    name: z.string().trim().min(3, "Poné un título de al menos 3 letras.").max(80, "Hasta 80 caracteres."),
    price: z.coerce
      .number()
      .int("El precio va sin centavos.")
      .min(0, "El precio no puede ser negativo.")
      .max(LISTING_PRICE_MAX, "Hasta AR$ 10.000.000."),
    // Cupo de avisos activos (solo Pro; el Empresarial usa el del Gratis en lo que no es ilimitado).
    aircraftListingsCount: count,
    sparePartsListingsCount: count,
    includesVerifiedBadge: z.boolean(),
    includesCustomPage: z.boolean(),
    includesSellerMetrics: z.boolean(),
    description: z.string().trim().max(300, "Hasta 300 caracteres.").optional().default(""),
    features: z.array(z.string().trim().min(1).max(120, "Cada ítem, hasta 120 caracteres.")).max(10, "Hasta 10 ítems."),
    badge: z.string().trim().max(30, "Hasta 30 caracteres.").optional().default(""),
    isPopular: z.boolean(),
    isActive: z.boolean(),
  })
  .superRefine((p, ctx) => {
    // Mientras no tengan precio, los planes pagos quedan inactivos (/plans muestra solo el Gratis).
    if (p.isActive && p.price <= 0) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Cargá el precio antes de activarlo." });
    }
  });

export type PlanInput = z.input<typeof planInputSchema>;
export type PlanData = z.output<typeof planInputSchema>;

/** Campos editables de un plan a partir de los datos validados (el nivel y lo ilimitado no cambian). */
export function planRecordFromInput(p: PlanData, tier: "PRO" | "BUSINESS") {
  return {
    name: p.name,
    price: p.price,
    ...(tier === "PRO" ? { aircraftListingsCount: p.aircraftListingsCount, sparePartsListingsCount: p.sparePartsListingsCount } : {}),
    includesVerifiedBadge: p.includesVerifiedBadge,
    includesCustomPage: p.includesCustomPage,
    includesSellerMetrics: p.includesSellerMetrics,
    description: p.description || null,
    features: p.features,
    badge: p.badge || null,
    isPopular: p.isPopular,
    isActive: p.isActive,
  };
}

type Counts = { tier?: string | null; aircraftListingsCount: number; sparePartsListingsCount: number; isUnlimitedAircraft: boolean; isUnlimitedSpareParts: boolean };
type Free = { AIRCRAFT: number; SPARE_PART: number };

function n(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** "3 aviones y 15 repuestos activos" / "Aviones ilimitados y 5 repuestos activos". */
export function defaultUsageText(p: Counts, free: Free = { AIRCRAFT: 1, SPARE_PART: 5 }) {
  const business = p.tier === "BUSINESS";
  const a = p.isUnlimitedAircraft ? null : business ? free.AIRCRAFT : p.aircraftListingsCount;
  const r = p.isUnlimitedSpareParts ? null : business ? free.SPARE_PART : p.sparePartsListingsCount;
  if (a === null && r === null) return "Aviones y repuestos ilimitados";
  const left = a === null ? "Aviones ilimitados" : n(a, "avión", "aviones");
  const right = r === null ? "repuestos ilimitados" : n(r, "repuesto", "repuestos");
  return `${left} y ${right}${a !== null && r !== null ? " activos" : ""}`;
}

export function billingText(type: string, interval: string | null) {
  if (type !== "SUBSCRIPTION") return "/ pago único";
  return interval === "YEARLY" ? "/ año" : "/ mes";
}
