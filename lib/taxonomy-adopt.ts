import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeTaxonomyName, taxonomyKey } from "@/lib/taxonomy-normalize";

// VA-190: "Otra marca" / "Otro modelo" del formulario pasan a la lista. Si ya existe (comparando sin
// mayúsculas, tildes, espacios ni guiones) se usa esa; si no, se crea en MAYÚSCULAS, marcada como cargada por
// un usuario. El modelo nuevo queda sin categoría recomendada hasta que la complete el admin (VA-165).

type Choice = { brandId?: string | null; customBrand?: string | null; modelId?: string | null; customModel?: string | null };
export type Adopted = { brandId: string | null; modelId: string | null; createdBrandId: string | null; createdModelId: string | null };

const isUniqueError = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

async function adoptBrand(raw: string, now: Date): Promise<{ id: string; created: boolean }> {
  const key = taxonomyKey(raw);
  const existing = (await prisma.aircraftBrand.findMany({ select: { id: true, name: true } })).find((b) => taxonomyKey(b.name) === key);
  if (existing) return { id: existing.id, created: false };
  const name = normalizeTaxonomyName(raw);
  try {
    return { id: (await prisma.aircraftBrand.create({ data: { name, userCreatedAt: now }, select: { id: true } })).id, created: true };
  } catch (e) {
    // Otro la creó al mismo tiempo: se usa esa.
    if (!isUniqueError(e)) throw e;
    return { id: (await prisma.aircraftBrand.findUniqueOrThrow({ where: { name }, select: { id: true } })).id, created: false };
  }
}

async function adoptModel(brandId: string, raw: string, now: Date): Promise<{ id: string; created: boolean }> {
  const key = taxonomyKey(raw);
  const existing = (await prisma.aircraftModel.findMany({ where: { brandId }, select: { id: true, name: true } })).find((m) => taxonomyKey(m.name) === key);
  if (existing) return { id: existing.id, created: false };
  const name = normalizeTaxonomyName(raw);
  try {
    return { id: (await prisma.aircraftModel.create({ data: { brandId, name, userCreatedAt: now }, select: { id: true } })).id, created: true };
  } catch (e) {
    if (!isUniqueError(e)) throw e;
    return { id: (await prisma.aircraftModel.findUniqueOrThrow({ where: { brandId_name: { brandId, name } }, select: { id: true } })).id, created: false };
  }
}

/** Resuelve la marca y el modelo escritos a mano a filas de la lista (creándolas si hace falta). */
export async function adoptCustomTaxonomy(choice: Choice, now = new Date()): Promise<Adopted> {
  let brandId = choice.brandId || null;
  let modelId = choice.modelId || null;
  let createdBrandId: string | null = null;
  let createdModelId: string | null = null;
  if (!brandId && choice.customBrand?.trim()) {
    const b = await adoptBrand(choice.customBrand, now);
    brandId = b.id;
    if (b.created) createdBrandId = b.id;
  }
  if (brandId && !modelId && choice.customModel?.trim()) {
    const m = await adoptModel(brandId, choice.customModel, now);
    modelId = m.id;
    if (m.created) createdModelId = m.id;
  }
  return { brandId, modelId, createdBrandId, createdModelId };
}

/** Anota el aviso que originó la marca o el modelo nuevos (para el admin). */
export async function linkAdoptedSource(adopted: Adopted, aircraftId: string) {
  if (adopted.createdBrandId) await prisma.aircraftBrand.updateMany({ where: { id: adopted.createdBrandId, sourceAircraftId: null }, data: { sourceAircraftId: aircraftId } });
  if (adopted.createdModelId) await prisma.aircraftModel.updateMany({ where: { id: adopted.createdModelId, sourceAircraftId: null }, data: { sourceAircraftId: aircraftId } });
}
