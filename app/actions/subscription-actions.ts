"use server";

import { revalidatePath } from "next/cache";
import { cancelAtPeriodEnd, resumeSubscription } from "@/lib/payments/subscriptions";
import { getCurrentUser } from "@/lib/auth-helpers";

// VA-80 / VA-92: "Cancelar suscripción" desde el perfil. Pausa el débito en Mercado Pago y la
// suscripción sigue vigente hasta el fin del período pagado (cancelAtPeriodEnd); el cron diario la
// cierra al terminar. "Seguir suscripto" reactiva el débito mientras el período siga vigente.
export async function cancelSubscriptionAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  try {
    const res = await cancelAtPeriodEnd(user.id);
    if (res.ok) revalidatePath(`/profile/${user.id}`);
    return res;
  } catch (error) {
    console.error("[suscripciones] no se pudo cancelar:", error);
    return { ok: false, error: "No pudimos hablar con Mercado Pago. Probá de nuevo en unos minutos." };
  }
}

export async function resumeSubscriptionAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  try {
    const res = await resumeSubscription(user.id);
    if (res.ok) revalidatePath(`/profile/${user.id}`);
    return res;
  } catch (error) {
    console.error("[suscripciones] no se pudo reactivar:", error);
    return { ok: false, error: "No pudimos hablar con Mercado Pago. Probá de nuevo en unos minutos." };
  }
}
