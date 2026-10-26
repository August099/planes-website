import type { Guide as GuideRow } from "@prisma/client";
import type { GuideEditorValues } from "@/components/admin/GuideEditor";

// VA-85: fila de la base → valores del editor (con campos vacíos donde no hay dato).
type Link_ = { label: string; href: string };
type RawSection = { heading?: string; id?: string; paragraphs?: string[]; bullets?: string[]; links?: Link_[] };

export function toEditorValues(row: GuideRow): GuideEditorValues {
  const sections = (Array.isArray(row.sections) ? (row.sections as RawSection[]) : []).map((s) => ({
    heading: s.heading ?? "",
    id: s.id ?? "",
    paragraphs: s.paragraphs ?? [],
    bullets: s.bullets ?? [],
    links: s.links ?? [],
  }));
  const source = row.source && typeof row.source === "object" ? (row.source as Link_) : null;
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    audience: row.audience,
    icon: row.icon,
    metaDescription: row.metaDescription,
    sections,
    source,
    cta: Array.isArray(row.cta) ? (row.cta as Link_[]) : [],
    isGlossary: row.isGlossary,
    order: row.order,
    reviewedBy: row.reviewedBy ?? "",
  };
}

export const EMPTY_GUIDE: GuideEditorValues = {
  slug: "",
  title: "",
  excerpt: "",
  audience: "todos",
  icon: "BookOpen",
  metaDescription: "",
  sections: [{ heading: "", id: "", paragraphs: [""], bullets: [], links: [] }],
  source: null,
  cta: [],
  isGlossary: false,
  order: 100,
  reviewedBy: "",
};
