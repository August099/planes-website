import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getFreeQuota } from "@/lib/quota";

// VA-152: datos de /plans: Gratis (el cupo de QuotaSettings), Pro y las 3 opciones del Empresarial,
// editables desde /admin/plans. Un plan sin precio (o inactivo) no se muestra; sin planes pagos,
// /plans muestra solo el Gratis.
export const PLANS_TAG = "plans";

export type PaidPlan = {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  badge: string | null;
  popular: boolean;
  /** Cupo de avisos activos (null = ilimitado). */
  aircraft: number | null;
  parts: number | null;
};

export type PlansPage = {
  free: { aircraft: number; parts: number };
  pro: PaidPlan | null;
  /** Opciones del Empresarial por lo que eligió ilimitado. */
  business: { aircraft: PaidPlan | null; parts: PaidPlan | null; both: PaidPlan | null };
};

export const getPlansPage = unstable_cache(
  async (): Promise<PlansPage> => {
    const [free, plans] = await Promise.all([
      getFreeQuota(),
      prisma.plan.findMany({
        where: { tier: { not: null }, isActive: true, archivedAt: null, price: { gt: 0 } },
        orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
      }),
    ]);
    const toPlan = (p: (typeof plans)[number]): PaidPlan => {
      const business = p.tier === "BUSINESS";
      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        description: p.description ?? "",
        features: p.features,
        badge: p.badge,
        popular: p.isPopular,
        aircraft: p.isUnlimitedAircraft ? null : business ? free.AIRCRAFT : p.aircraftListingsCount,
        parts: p.isUnlimitedSpareParts ? null : business ? free.SPARE_PART : p.sparePartsListingsCount,
      };
    };
    const pro = plans.find((p) => p.tier === "PRO");
    const option = (a: boolean, r: boolean) => plans.find((p) => p.tier === "BUSINESS" && p.isUnlimitedAircraft === a && p.isUnlimitedSpareParts === r);
    const pick = (p: (typeof plans)[number] | undefined) => (p ? toPlan(p) : null);
    return {
      free: { aircraft: free.AIRCRAFT ?? 0, parts: free.SPARE_PART ?? 0 },
      pro: pick(pro),
      business: { aircraft: pick(option(true, false)), parts: pick(option(false, true)), both: pick(option(true, true)) },
    };
  },
  ["plans-page", "va152"],
  { tags: [PLANS_TAG, "quota"], revalidate: 3600 }
);
