"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LAUNCH_FREE_BALANCE } from "@/lib/promo";

export type LaunchWelcome = { show: false } | { show: true; aircraft: number; spareParts: number };

// VA-111 / VA-135: ventana de bienvenida del lanzamiento. Sale una sola vez por cuenta y solo
// recién registrada (cuenta creada en las últimas 24 h, con el saldo de lanzamiento de VA-89): no a
// las cuentas que ya existían ni en cada inicio de sesión. Se marca como vista al mostrarla, así no
// vuelve aunque se recargue o se salga sin tocar un botón.
const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;

export async function getLaunchWelcomeAction(): Promise<LaunchWelcome> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { show: false };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, launchBalanceGrantedAt: true, launchWelcomeSeenAt: true },
  });
  if (!user?.launchBalanceGrantedAt || user.launchWelcomeSeenAt) return { show: false };
  if (Date.now() - user.createdAt.getTime() > NEW_ACCOUNT_MS) return { show: false };
  const claimed = await prisma.user.updateMany({
    where: { id: userId, launchWelcomeSeenAt: null },
    data: { launchWelcomeSeenAt: new Date() },
  });
  if (claimed.count === 0) return { show: false };
  return { show: true, aircraft: LAUNCH_FREE_BALANCE.aircraft, spareParts: LAUNCH_FREE_BALANCE.spareParts };
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
