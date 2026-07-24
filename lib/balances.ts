import { prisma } from "@/lib/prisma";

/**
 * Obtiene el balance disponible de publicaciones para un usuario.
 */
export async function getUserBalances(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aircraftListingsBalance: true,
      sparePartsListingsBalance: true,
    },
  });

  return {
    aircraftBalance: user?.aircraftListingsBalance ?? 0,
    sparePartsBalance: user?.sparePartsListingsBalance ?? 0,
  };
}