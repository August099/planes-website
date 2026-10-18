// Guías para comprar y vender (VA-78). Desde VA-85 viven en la base (modelo Guide) y se editan en
// /admin/guides; acá quedan los tipos y los helpers. Regla del contenido: no inventar trámites,
// costos, plazos ni normas; donde haga falta precisión, se remite a la fuente oficial.

export type GuideAudience = "comprador" | "vendedor" | "todos";

export type GuideLink = { label: string; href: string };

export type GuideSection = {
  heading: string;
  // Ancla (#id). En el glosario hay una por término (ej. #tbo).
  id?: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: GuideLink[];
};

export type Guide = {
  slug: string;
  title: string;
  excerpt: string;
  audience: GuideAudience;
  // Nombre de un ícono de lucide (lib/guide-icons.ts).
  icon: string;
  readingMinutes: number;
  updatedAt: string; // AAAA-MM-DD
  status: "DRAFT" | "PUBLISHED";
  order: number;
  reviewedBy?: string | null;
  metaDescription: string;
  sections: GuideSection[];
  // Fuente oficial citada con link visible (guía de transferencia).
  source?: GuideLink;
  cta?: GuideLink[];
  // El glosario se muestra como lista de definiciones y publica DefinedTermSet.
  isGlossary?: boolean;
};

export const GUIDE_DISCLAIMER =
  "Información general orientativa. No reemplaza el asesoramiento de un profesional ni de un taller habilitado.";

export const AUDIENCE_LABELS: Record<GuideAudience, string> = {
  comprador: "Para compradores",
  vendedor: "Para vendedores",
  todos: "Para todos",
};

// Las guías viven dentro de Servicios (cambio sobre VA-78, 9/10).
export const GUIDES_PATH = "/services/guides";
export const guidePath = (slug: string) => `${GUIDES_PATH}/${slug}`;

/** Lo que se guarda de una guía (sin lo calculado). Lo usan la semilla y el admin. */
export type GuideSeed = Omit<Guide, "readingMinutes" | "updatedAt" | "status" | "order" | "reviewedBy">;

// Minutos de lectura a ~200 palabras por minuto (mínimo 1).
export function readingMinutes(sections: GuideSection[]): number {
  const text = sections
    .flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.bullets ?? [])])
    .join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// "2026-10-09" → "09/10/2026"
export function formatGuideDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
