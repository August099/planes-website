import "server-only";
import { prisma } from "@/lib/prisma";

// Beneficios de suscripción (VA-87). Regla única para "Página personalizada": suscripción ACTIVE,
// período vigente (currentPeriodEnd en el futuro) y un plan con includesCustomPage. Si vence, el
// perfil vuelve al diseño común sin borrar los datos cargados.
export async function hasCustomPage(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      currentPeriodEnd: { gt: new Date() },
      plan: { includesCustomPage: true },
    },
    select: { id: true },
  });
  return !!sub;
}
