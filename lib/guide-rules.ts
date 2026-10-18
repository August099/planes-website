import { z } from "zod";
import { GUIDE_ICONS } from "@/lib/guide-icons";

// VA-85: reglas de una guía, compartidas entre el editor del admin (cliente), la action y la
// semilla. Slug único (eso lo controla la action) en minúsculas con guiones; metaDescription de
// 155 caracteres como máximo.

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const META_MAX = 155;

const link = z.object({
  label: z.string().trim().min(1, "Falta el texto del link.").max(160),
  // Interno ("/aircraft", "/services/guides/x#ancla") o externo (https://…).
  href: z
    .string()
    .trim()
    .min(1, "Falta el destino del link.")
    .refine((h) => h.startsWith("/") || /^https:\/\/[^\s]+$/.test(h), "El link tiene que empezar con / o con https://"),
});

const section = z.object({
  heading: z.string().trim().min(1, "Cada sección necesita un título.").max(160),
  id: z
    .string()
    .trim()
    .max(60)
    .refine((v) => v === "" || SLUG_RE.test(v), "El ancla va en minúsculas con guiones.")
    .optional(),
  paragraphs: z.array(z.string().trim().min(1)).max(20).default([]),
  bullets: z.array(z.string().trim().min(1)).max(30).default([]),
  links: z.array(link).max(6).default([]),
});

export const guideInputSchema = z.object({
  slug: z.string().trim().min(3, "El slug es muy corto.").max(80).regex(SLUG_RE, "El slug va en minúsculas, en inglés, con guiones (ej. buying-a-used-aircraft)."),
  title: z.string().trim().min(5, "Poné un título.").max(140),
  excerpt: z.string().trim().min(10, "Poné un resumen.").max(240),
  audience: z.enum(["comprador", "vendedor", "todos"]),
  icon: z.enum(GUIDE_ICONS),
  metaDescription: z.string().trim().min(30, "La descripción para Google es muy corta.").max(META_MAX, `Hasta ${META_MAX} caracteres.`),
  sections: z.array(section).min(1, "Agregá al menos una sección.").max(40),
  source: link.nullable().optional(),
  cta: z.array(link).max(3).default([]),
  isGlossary: z.boolean().default(false),
  order: z.coerce.number().int().min(0).max(999),
  reviewedBy: z.string().trim().max(120).optional().default(""),
});

export type GuideInput = z.input<typeof guideInputSchema>;
export type GuideData = z.output<typeof guideInputSchema>;
