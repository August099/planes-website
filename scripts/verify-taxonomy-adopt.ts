// VA-190: "Otra marca" / "Otro modelo" pasan a la lista, sin duplicados, y el admin los oculta o los une.
// Crea datos temporales en va_dev y los borra al final.
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/verify-taxonomy-adopt.ts
import { prisma } from "@/lib/prisma";
import { adoptCustomTaxonomy, linkAdoptedSource } from "@/lib/taxonomy-adopt";
import { mergeEntry, renameEntry, setHidden } from "@/lib/taxonomy-admin";
import { normalizeTaxonomyName, taxonomyKey } from "@/lib/taxonomy-normalize";

const url = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

const TAG = `ZZTEST${Date.now()}`;
const results: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
function check(caso: string, esperado: unknown, obtenido: unknown) {
  const e = JSON.stringify(esperado);
  const o = JSON.stringify(obtenido);
  results.push({ caso, esperado: e, obtenido: o, ok: e === o });
}
const userIds: string[] = [];
const brandIds: string[] = [];

async function main() {
  check("0. Normaliza: mayúsculas y espacios", "PIPER  CUB".replace(/\s+/g, " "), normalizeTaxonomyName("  piper   cub "));
  check("0. Misma clave sin tildes, guiones ni espacios", taxonomyKey("C-150 Aérobat"), taxonomyKey("c150 aerobat"));

  const existing = await prisma.aircraftBrand.findFirstOrThrow({ where: { hidden: false }, select: { id: true, name: true } });
  const a0 = await adoptCustomTaxonomy({ customBrand: `  ${existing.name.toLowerCase()} ` });
  check("1. Marca que ya existe (otra forma de escribirla): se usa esa", { id: existing.id, created: null }, { id: a0.brandId, created: a0.createdBrandId });

  const a1 = await adoptCustomTaxonomy({ customBrand: `${TAG} aero-test`, customModel: "  mx  1 " });
  if (a1.brandId) brandIds.push(a1.brandId);
  const b1 = await prisma.aircraftBrand.findUnique({ where: { id: a1.brandId! }, select: { name: true, userCreatedAt: true } });
  check("2. Marca nueva en MAYÚSCULAS y marcada como de usuario", { name: `${TAG} AERO-TEST`, user: true }, { name: b1?.name, user: !!b1?.userCreatedAt });
  const m1 = await prisma.aircraftModel.findUnique({ where: { id: a1.modelId! }, select: { name: true, brandId: true, recommendedCategoryId: true } });
  check("2. Modelo nuevo bajo esa marca, sin categoría recomendada", { name: "MX 1", brandId: a1.brandId, cat: null }, { name: m1?.name, brandId: m1?.brandId, cat: m1?.recommendedCategoryId });

  const a2 = await adoptCustomTaxonomy({ customBrand: `${TAG.toLowerCase()} aero test`, customModel: "MX-1" });
  check("3. La misma escrita distinto: no duplica", { brand: a1.brandId, model: a1.modelId, created: [null, null] }, { brand: a2.brandId, model: a2.modelId, created: [a2.createdBrandId, a2.createdModelId] });

  const seller = (await prisma.user.create({ data: { name: "vendedor", email: `${TAG}@test.local` } })).id;
  userIds.push(seller);
  const categoryId = (await prisma.aircraftCategory.findFirstOrThrow({ where: { id: "MP" } })).id;
  const listing = await prisma.aircraft.create({ data: { sellerId: seller, title: `${TAG} avión`, city: "Córdoba", province: "Córdoba", description: "prueba", year: 2000, categoryId, brandId: a1.brandId, modelId: a1.modelId } });
  await linkAdoptedSource(a1, listing.id);
  check("4. Queda anotado el aviso de origen", listing.id, (await prisma.aircraftBrand.findUnique({ where: { id: a1.brandId! }, select: { sourceAircraftId: true } }))?.sourceAircraftId);

  await setHidden("brand", a1.brandId!, true);
  const visible = await prisma.aircraftBrand.count({ where: { id: a1.brandId!, hidden: false } });
  check("5. Oculta: fuera de la lista y los filtros", 0, visible);
  check("6. Renombrar a una que ya existe: no", false, (await renameEntry("brand", a1.brandId!, existing.name.toUpperCase())).ok);

  const merged = await mergeEntry("brand", a1.brandId!, existing.id);
  const after = await prisma.aircraft.findUniqueOrThrow({ where: { id: listing.id }, select: { brandId: true, model: { select: { brandId: true } } } });
  check("7. Unir a una marca de la lista: el aviso pasa a esa y la de usuario se borra", { ok: true, brand: existing.id, modelBrand: existing.id, gone: 0 }, {
    ok: merged.ok,
    brand: after.brandId,
    modelBrand: after.model?.brandId,
    gone: await prisma.aircraftBrand.count({ where: { id: a1.brandId! } }),
  });
  if (a1.modelId) await prisma.aircraftModel.deleteMany({ where: { id: a1.modelId } });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.aircraft.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.aircraftModel.deleteMany({ where: { brandId: { in: brandIds } } });
    await prisma.aircraftBrand.deleteMany({ where: { id: { in: brandIds } } });
    console.table(results.map((r) => ({ caso: r.caso, esperado: r.esperado, obtenido: r.obtenido, "": r.ok ? "✓" : "✗" })));
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} de ${results.length} fallaron` : `${results.length}/${results.length} bien`);
    if (failed) process.exitCode = 1;
    await prisma.$disconnect();
  });
