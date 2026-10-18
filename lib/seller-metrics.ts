import "server-only";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// VA-151: métricas de la cuenta VA (primer nivel). Todo agregado en la base (GROUP BY, sin traer
// eventos a memoria) y cacheado 10 minutos por usuario y período. Solo totales: nunca quién vio,
// guardó o consultó.
// - Vistas: AIRCRAFT_VIEW / SPARE_PART_VIEW (ya deduplicadas al registrarse, VA-17; sin el dueño ni
//   los admins).
// - Contactos: clics en WhatsApp, teléfono y email, y las preguntas del aviso ("Formulario"; el
//   formulario Lead no se usa). Sin las del propio dueño.
// - Favoritos nuevos: por fecha del favorito (los anteriores a VA-151 quedaron con 1/1/2026).
// - Visitas a la Página VA: PROFILE_VIEW, desde que existe el evento.

export type MetricsDays = 7 | 30;
export const METRICS_DAYS: MetricsDays[] = [7, 30];
const TZ = "America/Argentina/Buenos_Aires";
const DAY = 86_400_000;

export type MetricsTotal = { current: number; previous: number; change: number | null };
export type ChannelKey = "WHATSAPP" | "PHONE" | "EMAIL" | "FORM";
export type ListingMetrics = {
  kind: "AIRCRAFT" | "SPARE_PART";
  id: string;
  title: string;
  status: string;
  imageUrl: string | null;
  views: number;
  contacts: number;
  favorites: number;
  contactRate: number | null;
};
export type SellerMetrics = {
  days: MetricsDays;
  from: string;
  to: string;
  totals: { views: MetricsTotal; contacts: MetricsTotal; favorites: MetricsTotal; profileVisits: MetricsTotal };
  profileVisitsSince: string | null;
  viewsByDay: { date: string; views: number }[];
  channels: { key: ChannelKey; count: number }[];
  listings: ListingMetrics[];
};

const change = (current: number, previous: number): number | null => (previous > 0 ? Math.round(((current - previous) / previous) * 100) : null);
const n = (v: unknown) => Number(v ?? 0);

/** Avisos del vendedor (avión y repuesto) como subconsulta reutilizable. */
const sellerListings = (userId: string) => Prisma.sql`
  SELECT 'AIRCRAFT' AS kind, "id", "title", "status"::text AS status, "createdAt" FROM "Aircraft" WHERE "sellerId" = ${userId}
  UNION ALL
  SELECT 'SPARE_PART' AS kind, "id", "title", "status"::text AS status, "createdAt" FROM "SparePart" WHERE "sellerId" = ${userId}`;

async function compute(userId: string, days: MetricsDays, nowMs: number): Promise<SellerMetrics> {
  const to = new Date(nowMs);
  const from = new Date(nowMs - days * DAY);
  const prevFrom = new Date(nowMs - 2 * days * DAY);

  // Totales del período y del anterior, en una sola pasada por cada fuente.
  const [views] = await prisma.$queryRaw<{ cur: bigint; prev: bigint }[]>`
    SELECT count(*) FILTER (WHERE e."createdAt" >= ${from}) AS cur, count(*) FILTER (WHERE e."createdAt" < ${from}) AS prev
    FROM "AnalyticsEvent" e
    JOIN (${sellerListings(userId)}) l ON l.id = COALESCE(e."aircraftId", e."sparePartId")
    WHERE e."eventType" IN ('AIRCRAFT_VIEW', 'SPARE_PART_VIEW') AND e."createdAt" >= ${prevFrom} AND e."createdAt" < ${to}`;
  const [clicks] = await prisma.$queryRaw<{ cur: bigint; prev: bigint }[]>`
    SELECT count(*) FILTER (WHERE e."createdAt" >= ${from}) AS cur, count(*) FILTER (WHERE e."createdAt" < ${from}) AS prev
    FROM "AnalyticsEvent" e
    JOIN (${sellerListings(userId)}) l ON l.id = COALESCE(e."aircraftId", e."sparePartId")
    WHERE e."eventType" IN ('WHATSAPP_CLICK', 'PHONE_CLICK', 'EMAIL_CLICK') AND e."createdAt" >= ${prevFrom} AND e."createdAt" < ${to}
      AND (e."userId" IS NULL OR e."userId" <> ${userId})`;
  const [questions] = await prisma.$queryRaw<{ cur: bigint; prev: bigint }[]>`
    SELECT count(*) FILTER (WHERE q."createdAt" >= ${from}) AS cur, count(*) FILTER (WHERE q."createdAt" < ${from}) AS prev
    FROM "Question" q
    JOIN (${sellerListings(userId)}) l ON l.id = COALESCE(q."aircraftId", q."sparePartId")
    WHERE q."createdAt" >= ${prevFrom} AND q."createdAt" < ${to} AND q."userId" <> ${userId}`;
  const [favorites] = await prisma.$queryRaw<{ cur: bigint; prev: bigint }[]>`
    SELECT count(*) FILTER (WHERE f."createdAt" >= ${from}) AS cur, count(*) FILTER (WHERE f."createdAt" < ${from}) AS prev
    FROM "Favorite" f
    JOIN (${sellerListings(userId)}) l ON l.id = COALESCE(f."aircraftId", f."sparePartId")
    WHERE f."createdAt" >= ${prevFrom} AND f."createdAt" < ${to} AND f."userId" <> ${userId}`;
  const [visits] = await prisma.$queryRaw<{ cur: bigint; prev: bigint }[]>`
    SELECT count(*) FILTER (WHERE "createdAt" >= ${from}) AS cur, count(*) FILTER (WHERE "createdAt" < ${from}) AS prev
    FROM "AnalyticsEvent"
    WHERE "eventType" = 'PROFILE_VIEW' AND "profileUserId" = ${userId} AND "createdAt" >= ${prevFrom} AND "createdAt" < ${to}`;
  const [since] = await prisma.$queryRaw<{ first: Date | null }[]>`SELECT min("createdAt") AS first FROM "AnalyticsEvent" WHERE "eventType" = 'PROFILE_VIEW'`;

  // Vistas por día, en hora argentina (los días sin vistas se completan con 0).
  const daily = await prisma.$queryRaw<{ day: string; views: bigint }[]>`
    SELECT to_char(((e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') AS day, count(*) AS views
    FROM "AnalyticsEvent" e
    JOIN (${sellerListings(userId)}) l ON l.id = COALESCE(e."aircraftId", e."sparePartId")
    WHERE e."eventType" IN ('AIRCRAFT_VIEW', 'SPARE_PART_VIEW') AND e."createdAt" >= ${from} AND e."createdAt" < ${to}
    GROUP BY 1`;
  const byDay = new Map(daily.map((d) => [d.day, n(d.views)]));
  const fmtDay = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const viewsByDay: SellerMetrics["viewsByDay"] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = fmtDay.format(new Date(nowMs - i * DAY));
    viewsByDay.push({ date, views: byDay.get(date) ?? 0 });
  }

  // Contactos por canal (período actual).
  const channelRows = await prisma.$queryRaw<{ type: string; count: bigint }[]>`
    SELECT e."eventType"::text AS type, count(*) AS count
    FROM "AnalyticsEvent" e
    JOIN (${sellerListings(userId)}) l ON l.id = COALESCE(e."aircraftId", e."sparePartId")
    WHERE e."eventType" IN ('WHATSAPP_CLICK', 'PHONE_CLICK', 'EMAIL_CLICK') AND e."createdAt" >= ${from} AND e."createdAt" < ${to}
      AND (e."userId" IS NULL OR e."userId" <> ${userId})
    GROUP BY 1`;
  const ch = Object.fromEntries(channelRows.map((r) => [r.type, n(r.count)]));
  const channels: SellerMetrics["channels"] = [
    { key: "WHATSAPP", count: ch.WHATSAPP_CLICK ?? 0 },
    { key: "PHONE", count: ch.PHONE_CLICK ?? 0 },
    { key: "EMAIL", count: ch.EMAIL_CLICK ?? 0 },
    { key: "FORM", count: n(questions.cur) },
  ];

  // Rendimiento por aviso (período actual).
  const rows = await prisma.$queryRaw<{ kind: "AIRCRAFT" | "SPARE_PART"; id: string; title: string; status: string; views: bigint; clicks: bigint; questions: bigint; favorites: bigint }[]>`
    SELECT l.kind, l.id, l.title, l.status,
      (SELECT count(*) FROM "AnalyticsEvent" e WHERE COALESCE(e."aircraftId", e."sparePartId") = l.id
         AND e."eventType" IN ('AIRCRAFT_VIEW', 'SPARE_PART_VIEW') AND e."createdAt" >= ${from} AND e."createdAt" < ${to}) AS views,
      (SELECT count(*) FROM "AnalyticsEvent" e WHERE COALESCE(e."aircraftId", e."sparePartId") = l.id
         AND e."eventType" IN ('WHATSAPP_CLICK', 'PHONE_CLICK', 'EMAIL_CLICK') AND e."createdAt" >= ${from} AND e."createdAt" < ${to}
         AND (e."userId" IS NULL OR e."userId" <> ${userId})) AS clicks,
      (SELECT count(*) FROM "Question" q WHERE COALESCE(q."aircraftId", q."sparePartId") = l.id
         AND q."createdAt" >= ${from} AND q."createdAt" < ${to} AND q."userId" <> ${userId}) AS questions,
      (SELECT count(*) FROM "Favorite" f WHERE COALESCE(f."aircraftId", f."sparePartId") = l.id
         AND f."createdAt" >= ${from} AND f."createdAt" < ${to} AND f."userId" <> ${userId}) AS favorites
    FROM (${sellerListings(userId)}) l
    ORDER BY l."createdAt" DESC`;
  const [aircraftImages, partImages] = await Promise.all([
    prisma.aircraftImage.findMany({ where: { aircraft: { sellerId: userId } }, orderBy: { order: "asc" }, distinct: ["aircraftId"], select: { aircraftId: true, url: true } }),
    prisma.sparePartImage.findMany({ where: { sparePart: { sellerId: userId } }, orderBy: { order: "asc" }, distinct: ["sparePartId"], select: { sparePartId: true, url: true } }),
  ]);
  const images = new Map<string, string>([...aircraftImages.map((i) => [i.aircraftId, i.url] as const), ...partImages.map((i) => [i.sparePartId, i.url] as const)]);
  const listings: ListingMetrics[] = rows.map((r) => {
    const views = n(r.views);
    const contacts = n(r.clicks) + n(r.questions);
    return {
      kind: r.kind,
      id: r.id,
      title: r.title,
      status: r.status,
      imageUrl: images.get(r.id) ?? null,
      views,
      contacts,
      favorites: n(r.favorites),
      contactRate: views > 0 ? Math.round((contacts / views) * 1000) / 10 : null,
    };
  });

  const total = (r: { cur: bigint; prev: bigint }, extra?: { cur: bigint; prev: bigint }): MetricsTotal => {
    const current = n(r.cur) + n(extra?.cur);
    const previous = n(r.prev) + n(extra?.prev);
    return { current, previous, change: change(current, previous) };
  };

  return {
    days,
    from: from.toISOString(),
    to: to.toISOString(),
    totals: { views: total(views), contacts: total(clicks, questions), favorites: total(favorites), profileVisits: total(visits) },
    profileVisitsSince: since?.first ? since.first.toISOString() : null,
    viewsByDay,
    channels,
    listings,
  };
}

/** Métricas del vendedor con caché de 10 minutos (por usuario y período). */
export function getSellerMetrics(userId: string, days: MetricsDays): Promise<SellerMetrics> {
  // La hora se redondea a 10 minutos para que la clave de caché no cambie en cada pedido.
  const bucket = Math.floor(Date.now() / 600_000) * 600_000;
  return unstable_cache(() => compute(userId, days, bucket), ["seller-metrics", userId, String(days), String(bucket)], { revalidate: 600 })();
}

/** Sin caché: para la verificación contra SQL directo. */
export const computeSellerMetrics = compute;
