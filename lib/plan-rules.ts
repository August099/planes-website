import { z } from "zod";
import { LISTING_PRICE_MAX } from "@/lib/listing-price-format";

// VA-80: reglas de un plan, compartidas entre el formulario del admin (cliente) y la action.
// Los publicados por pack son créditos de pago único; las suscripciones se cobran por período.

export const PLAN_KINDS = [
  { value: "AIRCRAFT_PACK", label: "Pack de aviones (pago único)" },
  { value: "SPARE_PART_PACK", label: "Pack de repuestos (pago único)" },
  { value: "SUBSCRIPTION", label: "Suscripción" },
] as const;
export type PlanKind = (typeof PLAN_KINDS)[number]["value"];

export const PLAN_KIND_LABELS: Record<string, string> = {
  AIRCRAFT_PACK: "Pack de aviones",
  SPARE_PART_PACK: "Pack de repuestos",
  SUBSCRIPTION: "Suscripción",
  AD_BANNER: "Banner",
};

const count = z.coerce.number().int("Tiene que ser un número entero.").min(0).max(1000, "Hasta 1000.");

export const planInputSchema = z
  .object({
    name: z.string().trim().min(3, "Poné un título de al menos 3 letras.").max(80, "Hasta 80 caracteres."),
    type: z.enum(["AIRCRAFT_PACK", "SPARE_PART_PACK", "SUBSCRIPTION"]),
    price: z.coerce
      .number()
      .int("El precio va sin centavos.")
      .min(0, "El precio no puede ser negativo.")
      .max(LISTING_PRICE_MAX, "Hasta AR$ 10.000.000."),
    billingInterval: z.enum(["MONTHLY", "YEARLY"]).nullable(),
    aircraftListingsCount: count,
    sparePartsListingsCount: count,
    isUnlimitedAircraft: z.boolean(),
    isUnlimitedSpareParts: z.boolean(),
    noExpiry: z.boolean(),
    includesVerifiedBadge: z.boolean(),
    includesCustomPage: z.boolean(),
    // VA-95: destacados incluidos por mes (solo suscripciones).
    featuredPerMonth: z.coerce.number().int("Tiene que ser un número entero.").min(0).max(100, "Hasta 100.").default(0),
    usageDescription: z.string().trim().max(60, "Hasta 60 caracteres.").optional().default(""),
    description: z.string().trim().max(300, "Hasta 300 caracteres.").optional().default(""),
    features: z.array(z.string().trim().min(1).max(120, "Cada ítem, hasta 120 caracteres.")).max(10, "Hasta 10 ítems."),
    badge: z.string().trim().max(30, "Hasta 30 caracteres.").optional().default(""),
    isPopular: z.boolean(),
    showInAircraftTab: z.boolean(),
    showInPartsTab: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(999),
    isActive: z.boolean(),
  })
  .superRefine((p, ctx) => {
    if (p.type === "SUBSCRIPTION" && !p.billingInterval) {
      ctx.addIssue({ code: "custom", path: ["billingInterval"], message: "Elegí cada cuánto se cobra." });
    }
    if (p.type !== "SUBSCRIPTION" && (p.isUnlimitedAircraft || p.isUnlimitedSpareParts)) {
      ctx.addIssue({ code: "custom", path: ["type"], message: "Solo una suscripción puede ser ilimitada." });
    }
    const aircraft = p.isUnlimitedAircraft || p.aircraftListingsCount > 0;
    const parts = p.isUnlimitedSpareParts || p.sparePartsListingsCount > 0;
    if (!aircraft && !parts) {
      ctx.addIssue({ code: "custom", path: ["aircraftListingsCount"], message: "El plan tiene que incluir alguna publicación." });
    }
    if (p.type === "AIRCRAFT_PACK" && p.aircraftListingsCount === 0) {
      ctx.addIssue({ code: "custom", path: ["aircraftListingsCount"], message: "Un pack de aviones necesita publicaciones de aviones." });
    }
    if (p.type === "SPARE_PART_PACK" && p.sparePartsListingsCount === 0) {
      ctx.addIssue({ code: "custom", path: ["sparePartsListingsCount"], message: "Un pack de repuestos necesita publicaciones de repuestos." });
    }
    if (p.isActive && !p.showInAircraftTab && !p.showInPartsTab) {
      ctx.addIssue({ code: "custom", path: ["showInAircraftTab"], message: "Un plan activo tiene que mostrarse en alguna pestaña de /plans." });
    }
  });

export type PlanInput = z.input<typeof planInputSchema>;
export type PlanData = z.output<typeof planInputSchema>;

/** Registro de Plan a partir de los datos validados (lo usan la action del admin y los scripts). */
export function planRecordFromInput(p: PlanData) {
  const isSubscription = p.type === "SUBSCRIPTION";
  return {
    name: p.name,
    type: p.type,
    price: p.price,
    billingType: isSubscription ? ("SUBSCRIPTION" as const) : ("ONE_TIME" as const),
    billingInterval: isSubscription ? p.billingInterval : null,
    aircraftListingsCount: p.isUnlimitedAircraft ? 0 : p.aircraftListingsCount,
    sparePartsListingsCount: p.isUnlimitedSpareParts ? 0 : p.sparePartsListingsCount,
    isUnlimitedAircraft: isSubscription && p.isUnlimitedAircraft,
    isUnlimitedSpareParts: isSubscription && p.isUnlimitedSpareParts,
    noExpiry: p.noExpiry,
    includesVerifiedBadge: p.includesVerifiedBadge,
    includesCustomPage: p.includesCustomPage,
    featuredPerMonth: isSubscription ? p.featuredPerMonth : 0,
    usageDescription: p.usageDescription || null,
    description: p.description || null,
    features: p.features,
    badge: p.badge || null,
    isPopular: p.isPopular,
    showInAircraftTab: p.showInAircraftTab,
    showInPartsTab: p.showInPartsTab,
    sortOrder: p.sortOrder,
    isActive: p.isActive,
  };
}

/** Texto de "qué incluye" cuando el admin no escribe uno propio. */
export function defaultUsageText(p: Pick<PlanData, "aircraftListingsCount" | "sparePartsListingsCount" | "isUnlimitedAircraft" | "isUnlimitedSpareParts">) {
  if (p.isUnlimitedAircraft && p.isUnlimitedSpareParts) return "Aviones y repuestos ilimitados";
  const parts: string[] = [];
  if (p.isUnlimitedAircraft) parts.push("Aviones ilimitados");
  else if (p.aircraftListingsCount > 0) parts.push(`${p.aircraftListingsCount} ${p.aircraftListingsCount === 1 ? "aviso" : "avisos"} de avión`);
  if (p.isUnlimitedSpareParts) parts.push("Repuestos ilimitados");
  else if (p.sparePartsListingsCount > 0) parts.push(`${p.sparePartsListingsCount} ${p.sparePartsListingsCount === 1 ? "aviso" : "avisos"} de repuesto`);
  return parts.join(" + ");
}

export function billingText(type: string, interval: string | null) {
  if (type !== "SUBSCRIPTION") return "/ pago único";
  return interval === "YEARLY" ? "/ año" : "/ mes";
}
