import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { absoluteUrl } from "@/lib/site";
import { GUIDES_PATH, guidePath } from "@/lib/guides";
import { getPublishedGuides } from "@/lib/guides-data";
import { landingPaths } from "@/lib/seo-landing";
import { CALCULATORS } from "@/lib/aero/calculators";
import { CALCULATORS_PATH, FLIGHT_PLAN_PATH, MAP_PATH, flightPlanEnabled } from "@/lib/flight-plan-flag";

// Se regenera como máximo una vez por hora.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/aircraft", changeFrequency: "daily", priority: 0.9 },
  { path: "/spareparts", changeFrequency: "daily", priority: 0.9 },
  { path: "/howtopublish", changeFrequency: "monthly", priority: 0.5 },
  { path: "/plans", changeFrequency: "monthly", priority: 0.5 },
  { path: "/services", changeFrequency: "monthly", priority: 0.4 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.4 },
  { path: "/about", changeFrequency: "monthly", priority: 0.3 },
  { path: GUIDES_PATH, changeFrequency: "monthly", priority: 0.6 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const where = activeListingWhere();

  const [aircrafts, spareParts, landings, sellers] = await Promise.all([
    // 31/10: listados por tipo, marca, categoría y provincia con avisos activos (lib/seo-landing.ts).
    prisma.aircraft.findMany({ where, select: { id: true, updatedAt: true }, orderBy: { updatedAt: "desc" } }),
    prisma.sparePart.findMany({ where, select: { id: true, updatedAt: true }, orderBy: { updatedAt: "desc" } }),
    landingPaths(),
    // 2/11: mismas condiciones que profileIsIndexable (lib/seo-landing.ts).
    prisma.user.findMany({
      where: { userType: { not: "PARTICULAR" }, isAdmin: false, OR: [{ aircrafts: { some: where } }, { spareParts: { some: where } }] },
      select: { id: true },
    }),
  ]);

  return [
    ...STATIC_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    // VA-191: solo con la sección prendida. Lo apagado responde 404 y no se publica.
    ...(flightPlanEnabled()
      ? [
          { url: absoluteUrl(FLIGHT_PLAN_PATH), changeFrequency: "monthly" as const, priority: 0.7 },
          { url: absoluteUrl(MAP_PATH), changeFrequency: "monthly" as const, priority: 0.6 },
          { url: absoluteUrl(CALCULATORS_PATH), changeFrequency: "monthly" as const, priority: 0.7 },
          ...CALCULATORS.map((c) => ({ url: absoluteUrl(`${CALCULATORS_PATH}/${c.slug}`), changeFrequency: "monthly" as const, priority: 0.6 })),
        ]
      : []),
    ...landings.map((path) => ({ url: absoluteUrl(path).replace(/&/g, "&amp;"), changeFrequency: "daily" as const, priority: 0.7 })),
    ...sellers.map((u) => ({ url: absoluteUrl(`/profile/${u.id}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    // Guías (VA-78)
    // VA-85: solo las guías publicadas.
    ...(await getPublishedGuides()).map((g) => ({
      url: absoluteUrl(guidePath(g.slug)),
      lastModified: new Date(g.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...aircrafts.map((a) => ({
      url: absoluteUrl(`/aircraft/${a.id}`),
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...spareParts.map((s) => ({
      url: absoluteUrl(`/spareparts/sparepart-details/${s.id}`),
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
