import { getPlansPage } from "@/lib/plans";
import { PlansClient } from "./PlansClient";

// VA-152: Gratis, Pro y Empresarial salen de la base (cacheados con tags); la página sigue estática
// y se regenera cuando el admin cambia un plan o el cupo Gratis.
export default async function PlansPage() {
  return <PlansClient data={await getPlansPage()} />;
}
