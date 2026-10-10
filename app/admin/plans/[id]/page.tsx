import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PlanForm } from "@/components/admin/PlanForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

// VA-80: edición de un plan. Los archivados se restauran desde la lista antes de editarlos.
export default async function EditPlanPage({ params }: Props) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");
  const { id } = await params;
  const p = await prisma.plan.findUnique({ where: { id } });
  if (!p || p.type === "AD_BANNER") notFound();
  if (p.archivedAt) redirect("/admin/plans");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#001F58]">{p.name}</h1>
      <PlanForm
        planId={p.id}
        initial={{
          name: p.name,
          type: p.type,
          price: Number(p.price),
          billingInterval: p.billingInterval,
          aircraftListingsCount: p.aircraftListingsCount,
          sparePartsListingsCount: p.sparePartsListingsCount,
          isUnlimitedAircraft: p.isUnlimitedAircraft,
          isUnlimitedSpareParts: p.isUnlimitedSpareParts,
          noExpiry: p.noExpiry,
          includesVerifiedBadge: p.includesVerifiedBadge,
          includesCustomPage: p.includesCustomPage,
          usageDescription: p.usageDescription ?? "",
          description: p.description ?? "",
          features: p.features,
          badge: p.badge ?? "",
          isPopular: p.isPopular,
          showInAircraftTab: p.showInAircraftTab,
          showInPartsTab: p.showInPartsTab,
          sortOrder: p.sortOrder,
          isActive: p.isActive,
        }}
      />
    </div>
  );
}
