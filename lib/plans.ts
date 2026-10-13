import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getListingPrices } from "@/lib/listing-prices";
import { billingText, defaultUsageText } from "@/lib/plan-rules";

// VA-80: tarjetas de /plans: los planes activos de la base, editables desde /admin/plans.
// VA-92 (decisión del socio, 13/10): no hay planes de 1 publicación. Quien publica una sola cosa la
// paga al terminar el formulario, al precio individual de /admin/prices (SinglePrices, referencia).
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
const formatARS = (amount: number) => (amount === 0 ? "Gratis" : `AR$ ${NUMBER.format(amount)}`);

const getActivePlans = unstable_cache(
  async () =>
    prisma.plan.findMany({
      where: { isActive: true, archivedAt: null, type: { not: "AD_BANNER" } },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    }),
  ["active-plans"],
  { tags: [PLANS_TAG], revalidate: 3600 }
);

/** Precio de la publicación individual (ListingPrice, VA-59): se muestra como referencia, no es un plan. */
export type SinglePrices = { aircraft: string; parts: string };

export async function getPlanCards(): Promise<{ aircraft: PlanCard[]; parts: PlanCard[]; single: SinglePrices }> {
  const [prices, plans] = await Promise.all([getListingPrices(), getActivePlans()]);

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
    aircraft: plans.filter((p) => p.showInAircraftTab).map(toCard),
    parts: plans.filter((p) => p.showInPartsTab).map(toCard),
    single: { aircraft: formatARS(prices.AIRCRAFT.amount), parts: formatARS(prices.SPARE_PART.amount) },
  };
}
