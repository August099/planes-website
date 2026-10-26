import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export type ListingKind = "aircraft" | "sparepart";

// Verifica que haya sesión y que el usuario sea el dueño de la publicación (o admin).
// Las server actions son endpoints públicos: llamar a esto antes de modificar una publicación.
export async function assertListingOwner(id: string, type: ListingKind) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("UNAUTHORIZED");

  if (!id) throw new Error("NOT_FOUND");

  const listing =
    type === "aircraft"
      ? await prisma.aircraft.findUnique({ where: { id }, select: { sellerId: true } })
      : await prisma.sparePart.findUnique({ where: { id }, select: { sellerId: true } });

  if (!listing) throw new Error("NOT_FOUND");

  if (listing.sellerId !== user.id && !user.isAdmin) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
