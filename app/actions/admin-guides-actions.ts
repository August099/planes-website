"use server";

import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { guidePath } from "@/lib/guides";
import { GUIDES_TAG } from "@/lib/guides-data";
import { guideInputSchema, type GuideInput } from "@/lib/guide-rules";

type Result = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireAdmin() {
  const admin = await getCurrentUser();
  return admin?.isAdmin ? admin : null;
}

// Las páginas de guías son estáticas: se invalida el tag (índice, Home, menú de Servicios,
// sitemap) y las rutas de la guía (con el slug viejo si cambió).
function refresh(...slugs: (string | undefined)[]) {
  updateTag(GUIDES_TAG);
  revalidatePath("/services/guides");
  for (const s of new Set(slugs.filter(Boolean) as string[])) revalidatePath(guidePath(s));
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/guides");
}

function toData(d: ReturnType<typeof guideInputSchema.parse>) {
  return {
    slug: d.slug,
    title: d.title,
    excerpt: d.excerpt,
    audience: d.audience,
    icon: d.icon,
    metaDescription: d.metaDescription,
    // Sin claves vacías: lo que no se cargó no se guarda.
    sections: d.sections.map((s) => ({
      heading: s.heading,
      ...(s.id ? { id: s.id } : {}),
      ...(s.paragraphs.length ? { paragraphs: s.paragraphs } : {}),
      ...(s.bullets.length ? { bullets: s.bullets } : {}),
      ...(s.links.length ? { links: s.links } : {}),
    })) as unknown as Prisma.InputJsonValue,
    source: d.source ? (d.source as Prisma.InputJsonValue) : Prisma.DbNull,
    cta: d.cta as unknown as Prisma.InputJsonValue,
    isGlossary: d.isGlossary,
    order: d.order,
    reviewedBy: d.reviewedBy || null,
  };
}

// VA-85: alta y edición. Una guía nueva nace DRAFT; publicar es una acción aparte.
export async function saveGuideAction(input: GuideInput & { id?: string }): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "No autorizado." };
  const parsed = guideInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "Revisá los campos marcados.", fieldErrors };
  }
  const data = toData(parsed.data);

  const clash = await prisma.guide.findUnique({ where: { slug: data.slug }, select: { id: true } });
  if (clash && clash.id !== input.id) {
    return { ok: false, error: "Ya hay una guía con ese slug.", fieldErrors: { slug: "Ya hay una guía con ese slug." } };
  }

  try {
    if (input.id) {
      const before = await prisma.guide.findUnique({ where: { id: input.id }, select: { slug: true } });
      if (!before) return { ok: false, error: "La guía no existe." };
      await prisma.guide.update({ where: { id: input.id }, data });
      refresh(before.slug, data.slug);
      return { ok: true, id: input.id };
    }
    const created = await prisma.guide.create({ data: { ...data, status: "DRAFT" }, select: { id: true } });
    refresh();
    return { ok: true, id: created.id };
  } catch (error) {
    console.error("Error al guardar la guía:", error);
    return { ok: false, error: "No se pudo guardar la guía." };
  }
}

export async function setGuideStatusAction(id: string, status: "DRAFT" | "PUBLISHED"): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "No autorizado." };
  if (status !== "DRAFT" && status !== "PUBLISHED") return { ok: false, error: "Estado inválido." };
  const guide = await prisma.guide.findUnique({ where: { id }, select: { slug: true, publishedAt: true } });
  if (!guide) return { ok: false, error: "La guía no existe." };
  await prisma.guide.update({
    where: { id },
    data: { status, ...(status === "PUBLISHED" && !guide.publishedAt ? { publishedAt: new Date() } : {}) },
  });
  refresh(guide.slug);
  return { ok: true, id };
}

// Duplicar: copia como borrador, con slug y título marcados para no confundirla.
export async function duplicateGuideAction(id: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "No autorizado." };
  const g = await prisma.guide.findUnique({ where: { id } });
  if (!g) return { ok: false, error: "La guía no existe." };
  let slug = `${g.slug}-copia`;
  for (let n = 2; await prisma.guide.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${g.slug}-copia-${n}`;
  const copy = await prisma.guide.create({
    data: {
      slug,
      title: `${g.title} (copia)`,
      excerpt: g.excerpt,
      audience: g.audience,
      icon: g.icon,
      metaDescription: g.metaDescription,
      sections: g.sections as Prisma.InputJsonValue,
      source: g.source === null ? Prisma.DbNull : (g.source as Prisma.InputJsonValue),
      cta: g.cta as Prisma.InputJsonValue,
      isGlossary: g.isGlossary,
      order: g.order + 1,
      status: "DRAFT",
    },
    select: { id: true },
  });
  refresh();
  return { ok: true, id: copy.id };
}
