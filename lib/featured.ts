import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// VA-168: destacadas por plan. Los avisos de cuentas con el interruptor "Destacadas" del plan (Pro y Broker,
// VA-166) y de los admins van primero: en "Aeronaves destacadas" de la Home y en el orden por defecto de
// /aircraft y /spareparts. Sale del interruptor del plan, no del nombre.
//
// La lista de cuentas se cachea 5 minutos (tag FEATURED_SELLERS_TAG; la invalidan el admin al guardar
// los planes y las altas y bajas de suscripciones, y si no, vence sola).
export const FEATURED_SELLERS_TAG = "featured-sellers";

/** VA-181: al empezar o terminar una suscripción (acción, webhook o cron), sin esperar los 5 minutos. */
export function invalidateFeaturedSellers() {
  try {
    revalidateTag(FEATURED_SELLERS_TAG, { expire: 0 });
  } catch {
    // Fuera de Next (scripts): no hay caché que invalidar.
  }
}

/** Sin caché (scripts de prueba). */
export async function loadFeaturedSellerIds(): Promise<string[]> {
  const now = new Date();
  const [admins, subs] = await Promise.all([
    prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } }),
    prisma.subscription.findMany({
      where: {
        plan: { includesFeatured: true },
        OR: [
          { status: "ACTIVE", currentPeriodEnd: { gt: now } },
          { status: "PAST_DUE", graceUntil: { gt: now } },
        ],
      },
      select: { userId: true },
    }),
  ]);
  return [...new Set([...admins.map((a) => a.id), ...subs.map((s) => s.userId)])];
}

export const getFeaturedSellerIds = unstable_cache(
  loadFeaturedSellerIds,
  ["featured-sellers", "va168"],
  { tags: [FEATURED_SELLERS_TAG], revalidate: 300 }
);

/**
 * Una página del orden por defecto con los destacados primero (cada grupo en su orden). `find` trae
 * avisos con un filtro extra por vendedor; `countFeatured` cuenta los destacados que cumplen los filtros.
 */
export async function featuredFirstPage<T>(
  featuredIds: string[],
  skip: number,
  take: number,
  find: (seller: { in: string[] } | { notIn: string[] }, skip: number, take: number) => Promise<T[]>,
  countFeatured: () => Promise<number>
): Promise<T[]> {
  if (featuredIds.length === 0) return find({ notIn: [] }, skip, take);
  const featured = await countFeatured();
  if (skip >= featured) return find({ notIn: featuredIds }, skip - featured, take);
  const first = await find({ in: featuredIds }, skip, Math.min(take, featured - skip));
  const rest = take - first.length;
  return rest > 0 ? [...first, ...(await find({ notIn: featuredIds }, 0, rest))] : first;
}
