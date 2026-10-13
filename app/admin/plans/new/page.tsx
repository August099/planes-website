import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PlanForm, type PlanFormValues } from "@/components/admin/PlanForm";

export const dynamic = "force-dynamic";

const EMPTY: PlanFormValues = {
  name: "",
  type: "AIRCRAFT_PACK",
  price: 0,
  billingInterval: null,
  aircraftListingsCount: 1,
  sparePartsListingsCount: 0,
  isUnlimitedAircraft: false,
  isUnlimitedSpareParts: false,
  noExpiry: false,
  includesVerifiedBadge: false,
  includesCustomPage: false,
  featuredPerMonth: 0,
  usageDescription: "",
  description: "",
  features: [],
  badge: "",
  isPopular: false,
  showInAircraftTab: true,
  showInPartsTab: false,
  sortOrder: 50,
  isActive: false,
};

// VA-80: alta de un plan. Arranca inactivo, para revisarlo antes de mostrarlo en /plans.
export default async function NewPlanPage() {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#001F58]">Nuevo plan</h1>
      <PlanForm initial={EMPTY} />
    </div>
  );
}
