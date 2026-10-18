import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PlanForm } from "@/components/admin/PlanForm";
import { getFreeQuota } from "@/lib/quota";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

// VA-80 / VA-152: edición del Pro o de una opción del Empresarial. Los planes viejos (archivados) no se editan.
export default async function EditPlanPage({ params }: Props) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");
  const { id } = await params;
  const p = await prisma.plan.findUnique({ where: { id } });
  if (!p || !p.tier) notFound();
  if (p.archivedAt) redirect("/admin/plans");
  const free = await getFreeQuota();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#001F58]">{p.name}</h1>
      <PlanForm
        planId={p.id}
        tier={p.tier}
        unlimited={{ aircraft: p.isUnlimitedAircraft, parts: p.isUnlimitedSpareParts }}
        free={{ aircraft: free.AIRCRAFT ?? 0, parts: free.SPARE_PART ?? 0 }}
        initial={{
          name: p.name,
          price: Number(p.price),
          aircraftListingsCount: p.aircraftListingsCount,
          sparePartsListingsCount: p.sparePartsListingsCount,
          includesVerifiedBadge: p.includesVerifiedBadge,
          includesCustomPage: p.includesCustomPage,
          includesSellerMetrics: p.includesSellerMetrics,
          description: p.description ?? "",
          features: p.features,
          badge: p.badge ?? "",
          isPopular: p.isPopular,
          isActive: p.isActive,
        }}
      />
    </div>
  );
}
