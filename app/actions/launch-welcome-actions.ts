"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFreeQuota } from "@/lib/quota";
import { freeQuotaText } from "@/lib/promo";

export type LaunchWelcome = { show: false } | { show: true; text: string; aircraft: number | null; spareParts: number | null };

// VA-111 / VA-135: ventana de bienvenida. Sale una sola vez por cuenta y solo recién registrada
// (cuenta creada en las últimas 24 h): no a las cuentas que ya existían ni en cada inicio de sesión.
// Se marca como vista al mostrarla, así no vuelve aunque se recargue o se salga sin tocar un botón.
// VA-152: cuenta el cupo Gratis (antes, el saldo de lanzamiento).
const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;

export async function getLaunchWelcomeAction(): Promise<LaunchWelcome> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { show: false };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, launchWelcomeSeenAt: true },
  });
  if (!user || user.launchWelcomeSeenAt) return { show: false };
  if (Date.now() - user.createdAt.getTime() > NEW_ACCOUNT_MS) return { show: false };
  const claimed = await prisma.user.updateMany({
    where: { id: userId, launchWelcomeSeenAt: null },
    data: { launchWelcomeSeenAt: new Date() },
  });
  if (claimed.count === 0) return { show: false };
  const free = await getFreeQuota();
  return { show: true, text: freeQuotaText(free), aircraft: free.AIRCRAFT, spareParts: free.SPARE_PART };
}

export async function dismissLaunchWelcomeAction(): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  await prisma.user.updateMany({
    where: { id: userId, launchWelcomeSeenAt: null },
    data: { launchWelcomeSeenAt: new Date() },
  });
}
