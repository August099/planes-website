import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getListingPrices } from "@/lib/listing-prices";
import { billingText, defaultUsageText } from "@/lib/plan-rules";

// VA-80: tarjetas de /plans. La primera de cada pestaña es el precio por aviso (VA-59); el resto
// son los planes activos de la base, editables desde /admin/plans.
export const PLANS_TAG = "plans";

export type PlanCard = {
  id: string;
  name: string;
  price: string;
  billingText: string;
  postCount: string;
  badge: string | null;
  description: string;
  popular: boolean;
  isSubscription: boolean;
  features: string[];
  buttonText: string;
};

const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const formatARS = (amount: number) => (amount === 0 ? "Gratis" : `$ ${NUMBER.format(amount)}`);

const getActivePlans = unstable_cache(
  async () =>
    prisma.plan.findMany({
      where: { isActive: true, archivedAt: null, type: { not: "AD_BANNER" } },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    }),
  ["active-plans"],
  { tags: [PLANS_TAG], revalidate: 3600 }
);

export async function getPlanCards(): Promise<{ aircraft: PlanCard[]; parts: PlanCard[] }> {
  const [prices, plans] = await Promise.all([getListingPrices(), getActivePlans()]);

  const singleAircraft: PlanCard = {
    id: "listing-aircraft",
    name: "Plan 1 Avión",
    price: formatARS(prices.AIRCRAFT.amount),
    billingText: "/ pago único",
    postCount: "1 Posteo de Aeronave",
    badge: null,
    description: "Ideal para propietarios particulares que buscan vender su aeronave puntualmente.",
    popular: false,
    isSubscription: false,
    features: [
      "Publicación activa de 1 aeronave",
      "Sin límite de tiempo de publicación",
      "Galería completa de fotos e historial",
      "Contacto directo sin comisiones",
    ],
    buttonText: "Comprar 1 Avión",
  };
  const singlePart: PlanCard = {
    id: "listing-parts",
    name: "Plan 1 Repuesto",
    price: formatARS(prices.SPARE_PART.amount),
    billingText: "/ pago único",
    postCount: "1 Posteo de Repuesto",
    badge: null,
    description: "Perfecto para vender una herramienta, aviónica o componente específico.",
    popular: false,
    isSubscription: false,
    features: [
      "Publicación activa de 1 repuesto",
      "Sin fecha de vencimiento",
      "Hasta 5 fotos del repuesto",
      "Filtro por Categoría y N/P (Número de Parte)",
    ],
    buttonText: "Comprar 1 Repuesto",
  };

  const toCard = (p: (typeof plans)[number]): PlanCard => {
    const isSubscription = p.type === "SUBSCRIPTION";
    const count = p.type === "AIRCRAFT_PACK" ? p.aircraftListingsCount : p.sparePartsListingsCount;
    return {
      id: p.id,
      name: p.name,
      price: formatARS(Number(p.price)),
      billingText: billingText(p.type, p.billingInterval),
      postCount: p.usageDescription || defaultUsageText(p),
      badge: p.badge,
      description: p.description ?? "",
      popular: p.isPopular,
      isSubscription,
      features: p.features,
      buttonText: isSubscription
        ? "Suscribirme"
        : `Comprar ${count} ${p.type === "AIRCRAFT_PACK" ? (count === 1 ? "Avión" : "Aviones") : count === 1 ? "Repuesto" : "Repuestos"}`,
    };
  };

  return {
    aircraft: [singleAircraft, ...plans.filter((p) => p.showInAircraftTab).map(toCard)],
    parts: [singlePart, ...plans.filter((p) => p.showInPartsTab).map(toCard)],
  };
}
