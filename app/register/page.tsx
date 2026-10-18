import { RegisterForm } from "./RegisterForm";
import { getCachedFreeQuota } from "@/lib/quota";
import { freeQuotaText } from "@/lib/promo";

// VA-152: el cupo Gratis se lee en el servidor (cacheado, se refresca al editarlo en /admin/plans).
export default async function RegisterPage() {
  return <RegisterForm quotaText={freeQuotaText(await getCachedFreeQuota())} />;
}
