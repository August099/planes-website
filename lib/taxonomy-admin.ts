import "server-only";
import { prisma } from "@/lib/prisma";
import { taxonomyKey } from "@/lib/taxonomy-normalize";

// VA-190: el admin revisa lo que cargaron los usuarios ("Otra marca" / "Otro modelo"): cambiarle el nombre,
// unirlo a una entrada existente (los avisos pasan a esa) u ocultarlo de la lista y los filtros.

export type TaxonomyKind = "brand" | "model";
type Result = { ok: true; moved?: number } | { ok: false; error: string };

export async function renameEntry(kind: TaxonomyKind, id: string, raw: string): Promise<Result> {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) return { ok: false, error: "Escribí un nombre de hasta 100 caracteres." };
  if (kind === "brand") {
    const clash = (await prisma.aircraftBrand.findMany({ where: { id: { not: id } }, select: { name: true } })).find((b) => taxonomyKey(b.name) === taxonomyKey(name));
    if (clash) return { ok: false, error: `Ya existe "${clash.name}": uní esta marca a esa.` };
    await prisma.aircraftBrand.update({ where: { id }, data: { name } });
  } else {
    const model = await prisma.aircraftModel.findUnique({ where: { id }, select: { brandId: true } });
    if (!model) return { ok: false, error: "El modelo no existe." };
    const clash = (await prisma.aircraftModel.findMany({ where: { brandId: model.brandId, id: { not: id } }, select: { name: true } })).find((m) => taxonomyKey(m.name) === taxonomyKey(name));
    if (clash) return { ok: false, error: `Ya existe "${clash.name}" en esa marca: uní este modelo a ese.` };
    await prisma.aircraftModel.update({ where: { id }, data: { name } });
  }
  return { ok: true };
}

export async function setHidden(kind: TaxonomyKind, id: string, hidden: boolean): Promise<Result> {
  if (kind === "brand") await prisma.aircraftBrand.update({ where: { id }, data: { hidden } });
  else await prisma.aircraftModel.update({ where: { id }, data: { hidden } });
  return { ok: true };
}

/** Une un modelo cargado por un usuario a otro: sus avisos y variantes pasan al destino y se borra. */
async function mergeModel(fromId: string, intoId: string, partOfBrandMerge = false): Promise<Result> {
  if (fromId === intoId) return { ok: false, error: "Elegí otro modelo." };
  const [from, into] = await Promise.all([
    prisma.aircraftModel.findUnique({ where: { id: fromId }, select: { userCreatedAt: true, variants: { select: { id: true, name: true } } } }),
    prisma.aircraftModel.findUnique({ where: { id: intoId }, select: { brandId: true, variants: { select: { id: true, name: true } } } }),
  ]);
  if (!from || !into) return { ok: false, error: "El modelo no existe." };
  if (!from.userCreatedAt && !partOfBrandMerge) return { ok: false, error: "Solo se unen modelos cargados por usuarios." };
  return prisma.$transaction(async (tx) => {
    for (const v of from.variants) {
      const same = into.variants.find((w) => taxonomyKey(w.name) === taxonomyKey(v.name));
      if (same) {
        await tx.aircraft.updateMany({ where: { subModelId: v.id }, data: { subModelId: same.id } });
        await tx.aircraftSubModel.delete({ where: { id: v.id } });
      } else {
        await tx.aircraftSubModel.update({ where: { id: v.id }, data: { modelId: intoId } });
      }
    }
    const moved = await tx.aircraft.updateMany({ where: { modelId: fromId }, data: { modelId: intoId, brandId: into.brandId } });
    await tx.aircraftModel.delete({ where: { id: fromId } });
    return { ok: true as const, moved: moved.count };
  });
}

/** Une una marca cargada por un usuario a otra: sus modelos (o sus avisos, si el modelo ya existe) pasan. */
async function mergeBrand(fromId: string, intoId: string): Promise<Result> {
  if (fromId === intoId) return { ok: false, error: "Elegí otra marca." };
  const [from, into] = await Promise.all([
    prisma.aircraftBrand.findUnique({ where: { id: fromId }, select: { userCreatedAt: true, models: { select: { id: true, name: true } } } }),
    prisma.aircraftBrand.findUnique({ where: { id: intoId }, select: { models: { select: { id: true, name: true } } } }),
  ]);
  if (!from || !into) return { ok: false, error: "La marca no existe." };
  if (!from.userCreatedAt) return { ok: false, error: "Solo se unen marcas cargadas por usuarios." };
  let moved = 0;
  for (const m of from.models) {
    const same = into.models.find((x) => taxonomyKey(x.name) === taxonomyKey(m.name));
    if (same) {
      // Mismo modelo en las dos marcas: se usa el de destino.
      const r = await mergeModel(m.id, same.id, true);
      if (!r.ok) return r;
      moved += r.moved ?? 0;
    } else {
      await prisma.aircraftModel.update({ where: { id: m.id }, data: { brandId: intoId } });
    }
  }
  const rest = await prisma.aircraft.updateMany({ where: { brandId: fromId }, data: { brandId: intoId } });
  await prisma.aircraftBrand.delete({ where: { id: fromId } });
  return { ok: true, moved: moved + rest.count };
}

export function mergeEntry(kind: TaxonomyKind, fromId: string, intoId: string): Promise<Result> {
  return kind === "brand" ? mergeBrand(fromId, intoId) : mergeModel(fromId, intoId);
}

/** Lo cargado por usuarios, para la revisión del admin. */
export async function userCreatedEntries() {
  const [brands, models] = await Promise.all([
    prisma.aircraftBrand.findMany({
      where: { userCreatedAt: { not: null } },
      orderBy: { userCreatedAt: "desc" },
      select: { id: true, name: true, hidden: true, userCreatedAt: true, sourceAircraftId: true, _count: { select: { aircrafts: true } } },
    }),
    prisma.aircraftModel.findMany({
      where: { userCreatedAt: { not: null } },
      orderBy: { userCreatedAt: "desc" },
      select: { id: true, name: true, hidden: true, userCreatedAt: true, sourceAircraftId: true, brandId: true, brand: { select: { name: true } }, _count: { select: { aircrafts: true } } },
    }),
  ]);
  return { brands, models };
}
