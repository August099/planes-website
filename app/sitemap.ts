import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { absoluteUrl } from "@/lib/site";
import { GUIDES } from "@/lib/guides";

// Se regenera como máximo una vez por hora.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/planes", changeFrequency: "daily", priority: 0.9 },
  { path: "/spareparts", changeFrequency: "daily", priority: 0.9 },
  { path: "/howtopublish", changeFrequency: "monthly", priority: 0.5 },
  { path: "/plans", changeFrequency: "monthly", priority: 0.5 },
  { path: "/services", changeFrequency: "monthly", priority: 0.4 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.4 },
  { path: "/guias", changeFrequency: "monthly", priority: 0.6 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const where = activeListingWhere();

  const [aircrafts, spareParts] = await Promise.all([
    prisma.aircraft.findMany({ where, select: { id: true, updatedAt: true }, orderBy: { updatedAt: "desc" } }),
    prisma.sparePart.findMany({ where, select: { id: true, updatedAt: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  return [
    ...STATIC_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    // Guías (VA-78)
    ...GUIDES.map((g) => ({
      url: absoluteUrl(`/guias/${g.slug}`),
      lastModified: new Date(g.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...aircrafts.map((a) => ({
      url: absoluteUrl(`/planes/plane-details/${a.id}`),
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
