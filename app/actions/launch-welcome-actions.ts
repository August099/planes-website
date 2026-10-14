"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LAUNCH_FREE_BALANCE } from "@/lib/promo";

export type LaunchWelcome = { show: false } | { show: true; aircraft: number; spareParts: number };

// VA-111: ventana de bienvenida del lanzamiento. Se muestra una sola vez por cuenta (en cualquier
// dispositivo) a quien recibió el saldo de lanzamiento (VA-89) y todavía no la cerró.
export async function getLaunchWelcomeAction(): Promise<LaunchWelcome> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { show: false };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { launchBalanceGrantedAt: true, launchWelcomeSeenAt: true },
  });
  if (!user?.launchBalanceGrantedAt || user.launchWelcomeSeenAt) return { show: false };
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
