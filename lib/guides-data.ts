import "server-only";
import { unstable_cache } from "next/cache";
import type { Guide as GuideRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readingMinutes, type Guide, type GuideLink, type GuideSection } from "@/lib/guides";

// VA-85: lectura de las guías desde la base. Las páginas públicas siguen siendo estáticas: estas
// consultas se cachean con el tag "guides", que las actions del admin invalidan al guardar,
// publicar o despublicar. Al público solo llegan las PUBLISHED.
export const GUIDES_TAG = "guides";

const asSections = (v: unknown): GuideSection[] => (Array.isArray(v) ? (v as GuideSection[]) : []);
const asLinks = (v: unknown): GuideLink[] => (Array.isArray(v) ? (v as GuideLink[]) : []);
const asLink = (v: unknown): GuideLink | undefined =>
  v && typeof v === "object" && "href" in v && "label" in v ? (v as GuideLink) : undefined;

/** Fila de la base → la forma que usan las páginas (con lo calculado). */
export function toGuide(row: GuideRow): Guide {
  const sections = asSections(row.sections).map((s) => ({
    ...s,
    id: s.id || undefined,
    paragraphs: s.paragraphs?.length ? s.paragraphs : undefined,
    bullets: s.bullets?.length ? s.bullets : undefined,
    links: s.links?.length ? s.links : undefined,
  }));
  const cta = asLinks(row.cta);
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    audience: row.audience,
    icon: row.icon,
    metaDescription: row.metaDescription,
    sections,
    source: asLink(row.source),
    cta: cta.length ? cta : undefined,
    isGlossary: row.isGlossary,
    status: row.status,
    order: row.order,
    reviewedBy: row.reviewedBy,
    readingMinutes: readingMinutes(sections),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export const getPublishedGuides = unstable_cache(
  async (): Promise<Guide[]> => {
    const rows = await prisma.guide.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ order: "asc" }, { title: "asc" }] });
    return rows.map(toGuide);
  },
  ["published-guides"],
  { tags: [GUIDES_TAG], revalidate: 3600 }
);

export async function getPublishedGuide(slug: string): Promise<Guide | undefined> {
  return (await getPublishedGuides()).find((g) => g.slug === slug);
}

/** Para la vista previa del admin: cualquier estado, sin caché. */
export async function getGuideForPreview(id: string): Promise<Guide | null> {
  const row = await prisma.guide.findUnique({ where: { id } });
  return row ? toGuide(row) : null;
}
