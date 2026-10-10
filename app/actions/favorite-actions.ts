"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

// Alterna un favorito (VA-16). Sin "buscar y después crear": borra si existe y, si no había nada,
// crea. Los índices únicos (userId, aircraftId) y (userId, sparePartId) impiden duplicados; si un
// doble clic crea el mismo favorito en paralelo, el segundo create falla con P2002 y se toma como
// "ya es favorito".
export async function toggleFavoriteAction(itemId: string, type: "AIRCRAFT" | "SPARE_PART") {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  if (typeof itemId !== "string" || !itemId) {
    throw new Error("Aviso inválido.");
  }

  const exists =
    type === "AIRCRAFT"
      ? await prisma.aircraft.findUnique({ where: { id: itemId }, select: { id: true } })
      : await prisma.sparePart.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!exists) {
    throw new Error(type === "AIRCRAFT" ? "El aviso de aeronave no existe." : "El aviso de repuesto no existe.");
  }

  const target = type === "AIRCRAFT" ? { userId: user.id, aircraftId: itemId } : { userId: user.id, sparePartId: itemId };

  const removed = await prisma.favorite.deleteMany({ where: target });
  if (removed.count > 0) {
    revalidatePath("/favs");
    return { isFavorite: false };
  }

  try {
    await prisma.favorite.create({ data: target });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  revalidatePath("/favs");
  return { isFavorite: true };
}

// VA-76: IDs de los favoritos del usuario, para páginas estáticas (la Home) que los marcan desde el
// navegador en vez de leer la sesión en el servidor. Sin sesión devuelve null.
export async function getMyFavoriteIds(): Promise<{ aircraft: string[]; spareParts: string[] } | null> {
  const user = await getCurrentUser();
  if (!user?.id) return null;
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    select: { aircraftId: true, sparePartId: true },
  });
  return {
    aircraft: favorites.flatMap((f) => (f.aircraftId ? [f.aircraftId] : [])),
    spareParts: favorites.flatMap((f) => (f.sparePartId ? [f.sparePartId] : [])),
  };
}
