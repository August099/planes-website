import { getPlanCards } from "@/lib/plans";
import { PlansClient } from "./PlansClient";

// VA-59 / VA-80: precios por aviso y planes salen de la base (cacheados con tags); la página sigue
// estática y se regenera cuando el admin cambia un precio o un plan.
export default async function PlansPage() {
  const { aircraft, parts, single } = await getPlanCards();
  return <PlansClient aircraftPlans={aircraft} partsPlans={parts} single={single} />;
}
