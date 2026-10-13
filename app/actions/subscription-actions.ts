"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// VA-80: "Cancelar suscripción" desde el perfil. La suscripción sigue vigente hasta el fin del
// período pagado (cancelAtPeriodEnd) y después no se renueva.
// TODO Fase 6: cancelar también el preapproval en Mercado Pago (mpSubscriptionId) para que no
// vuelva a debitar, y que el webhook pase la suscripción a CANCELLED al terminar el período. Ahí
// también hay que devolverles fecha de vencimiento a los avisos que quedaron sin vencimiento.
export async function cancelSubscriptionAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { status: true, cancelAtPeriodEnd: true },
  });
  if (!sub || sub.status !== "ACTIVE") return { ok: false, error: "No tenés una suscripción activa." };
  if (sub.cancelAtPeriodEnd) return { ok: true };

  await prisma.subscription.update({ where: { userId: user.id }, data: { cancelAtPeriodEnd: true } });
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

// Deshacer la cancelación mientras el período sigue vigente.
export async function resumeSubscriptionAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { status: true, currentPeriodEnd: true },
  });
  if (!sub || sub.status !== "ACTIVE" || sub.currentPeriodEnd <= new Date()) {
    return { ok: false, error: "La suscripción ya terminó: elegí un plan de nuevo." };
  }
  await prisma.subscription.update({ where: { userId: user.id }, data: { cancelAtPeriodEnd: false } });
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}
