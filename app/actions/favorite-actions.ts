"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export async function toggleFavoriteAction(itemId: string, type: "AIRCRAFT" | "SPARE_PART") {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  if (type === "AIRCRAFT") {
    // Verificar si el avión existe en la BD
    const aircraftExists = await prisma.aircraft.findUnique({
      where: { id: itemId },
      select: { id: true },
    });

    if (!aircraftExists) {
      throw new Error("El aviso de aeronave no existe.");
    }

    // Buscar si ya es favorito
    const existing = await prisma.favorite.findFirst({
      where: {
        userId: user.id,
        aircraftId: itemId,
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id },
      });
      revalidatePath("/favs");
      return { isFavorite: false };
    } else {
      await prisma.favorite.create({
        data: {
          userId: user.id,
          aircraftId: itemId,
        },
      });
      revalidatePath("/favs");
      return { isFavorite: true };
    }
  } else {
    // Verificar si el repuesto existe en la BD
    const sparePartExists = await prisma.sparePart.findUnique({
      where: { id: itemId },
      select: { id: true },
    });

    if (!sparePartExists) {
      throw new Error("El aviso de repuesto no existe.");
    }

    // Buscar si ya es favorito
    const existing = await prisma.favorite.findFirst({
      where: {
        userId: user.id,
        sparePartId: itemId,
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id },
      });
      revalidatePath("/favs");
      return { isFavorite: false };
    } else {
      await prisma.favorite.create({
        data: {
          userId: user.id,
          sparePartId: itemId,
        },
      });
      revalidatePath("/favs");
      return { isFavorite: true };
    }
  }
}