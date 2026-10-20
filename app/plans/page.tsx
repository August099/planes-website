import { getPlansPage } from "@/lib/plans";
import { PlansClient } from "./PlansClient";

// VA-166: la grilla (Base, Pro y Broker / Empresa) sale de la base (cacheada con tags); la página sigue
// estática y se regenera cuando el admin guarda la grilla en /admin/plans.
export default async function PlansPage() {
  return <PlansClient data={await getPlansPage()} />;
}
