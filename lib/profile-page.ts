import { z } from "zod";

// VA-169: secciones de la Página VA completa (Broker y admins). Las comparten el editor (cliente), la
// action y la página. Siempre con el diseño de la web: se elige contenido y orden, no colores ni letras.
//
// - Carrusel: título y avisos elegidos a mano o por regla (más recientes, solo aviones, solo repuestos o
//   una categoría de aviones).
// - Grilla: todos los avisos activos, por fecha o en un orden propio.
// - Texto: "Quiénes somos", "Servicios", "Horarios"…

export const MAX_SECTIONS = 6;
export const MAX_TEXT = 1000;
export const CAROUSEL_RULES = ["recent", "aircraft", "parts", "category", "manual"] as const;
export type CarouselRule = (typeof CAROUSEL_RULES)[number];
export const CAROUSEL_RULE_LABEL: Record<CarouselRule, string> = {
  recent: "Los más recientes",
  aircraft: "Solo aviones",
  parts: "Solo repuestos",
  category: "Una categoría de aviones",
  manual: "Elegidos a mano",
};

const id = z.string().min(1).max(40);
const title = z.string().trim().max(60, "El título va hasta 60 caracteres.");
/** Clave de un aviso: "AIRCRAFT:<id>" o "SPARE_PART:<id>". */
const key = z.string().regex(/^(AIRCRAFT|SPARE_PART):[A-Za-z0-9_-]{1,64}$/);

export const sectionSchema = z.discriminatedUnion("type", [
  z.object({ id, type: z.literal("carousel"), title, hidden: z.boolean(), rule: z.enum(CAROUSEL_RULES), categoryId: z.string().max(10).optional(), ids: z.array(key).max(30) }),
  z.object({ id, type: z.literal("grid"), title, hidden: z.boolean(), order: z.enum(["recent", "manual"]), ids: z.array(key).max(500) }),
  z.object({ id, type: z.literal("text"), title, hidden: z.boolean(), body: z.string().trim().max(MAX_TEXT, `El texto va hasta ${MAX_TEXT} caracteres.`) }),
]);
export const sectionsSchema = z.array(sectionSchema).max(MAX_SECTIONS, `Hasta ${MAX_SECTIONS} secciones.`);
export type PageSection = z.infer<typeof sectionSchema>;

/** Sin página armada: la grilla de todos los avisos (como hoy). */
export const DEFAULT_SECTIONS: PageSection[] = [{ id: "todos", type: "grid", title: "Todos los avisos", hidden: false, order: "recent", ids: [] }];

/** Lee las secciones guardadas; si algo no valida, la página por defecto. */
export function parseSections(value: unknown): PageSection[] {
  const r = sectionsSchema.safeParse(value);
  return r.success && r.data.length > 0 ? r.data : DEFAULT_SECTIONS;
}

/** Lo mínimo de un aviso para elegirlo y ordenarlo. */
export type PageListing = { key: string; kind: "AIRCRAFT" | "SPARE_PART"; title: string; categoryId: string | null; lastPublishedAt: string };

/** Avisos de una sección, en orden (solo los activos que se pasan). */
export function listingsFor<T extends PageListing>(section: PageSection, listings: T[]): T[] {
  const recent = [...listings].sort((a, b) => b.lastPublishedAt.localeCompare(a.lastPublishedAt));
  const byKey = new Map(listings.map((l) => [l.key, l]));
  const pick = (keys: string[]) => keys.map((k) => byKey.get(k)).filter((l): l is T => !!l);
  if (section.type === "text") return [];
  if (section.type === "grid") {
    if (section.order === "recent") return recent;
    // Orden propio: los elegidos primero, después los nuevos que todavía no se ordenaron.
    const ordered = pick(section.ids);
    const seen = new Set(ordered.map((l) => l.key));
    return [...ordered, ...recent.filter((l) => !seen.has(l.key))];
  }
  switch (section.rule) {
    case "manual":
      return pick(section.ids);
    case "aircraft":
      return recent.filter((l) => l.kind === "AIRCRAFT").slice(0, 12);
    case "parts":
      return recent.filter((l) => l.kind === "SPARE_PART").slice(0, 12);
    case "category":
      return recent.filter((l) => l.kind === "AIRCRAFT" && l.categoryId === section.categoryId).slice(0, 12);
    default:
      return recent.slice(0, 12);
  }
}

export function newSection(type: PageSection["type"]): PageSection {
  const sid = `s${Date.now().toString(36)}`;
  if (type === "carousel") return { id: sid, type, title: "Destacados", hidden: false, rule: "recent", ids: [] };
  if (type === "grid") return { id: sid, type, title: "Todos los avisos", hidden: false, order: "recent", ids: [] };
  return { id: sid, type, title: "Quiénes somos", hidden: false, body: "" };
}
