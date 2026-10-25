// VA-190: marcas y modelos propios ya cargados en avisos de aviones, y marcas de repuestos, con la
// normalización nueva. Sin flags solo informa (cuáles coinciden con la lista y cuáles serían nuevos).
// Con --apply los pasa a la lista (igual que el formulario) y deja los avisos apuntando a esas filas; las
// marcas de repuestos quedan en MAYÚSCULAS. Contra una base que no es local hace falta --confirm-production.
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/va190-report.ts [--apply]
import { prisma } from "@/lib/prisma";
import { normalizeTaxonomyName, taxonomyKey } from "@/lib/taxonomy-normalize";
import { adoptCustomTaxonomy, linkAdoptedSource } from "@/lib/taxonomy-adopt";

const APPLY = process.argv.includes("--apply");
const host = new URL(process.env.DATABASE_URL ?? "").hostname;
if (APPLY && !["localhost", "127.0.0.1", "::1"].includes(host) && !process.argv.includes("--confirm-production")) {
  console.error(`La base (${host}) no es local: agregar --confirm-production para escribir.`);
  process.exit(1);
}

async function main() {
  const brands = await prisma.aircraftBrand.findMany({ select: { id: true, name: true, models: { select: { name: true } } } });
  const brandByKey = new Map(brands.map((b) => [taxonomyKey(b.name), b]));

  const listings = await prisma.aircraft.findMany({
    where: { OR: [{ customBrand: { not: null } }, { customModel: { not: null } }] },
    select: { id: true, status: true, brandId: true, modelId: true, customBrand: true, customModel: true, brand: { select: { name: true, models: { select: { name: true } } } } },
  });

  // Marcas propias: cómo quedarían y si ya existen.
  const brandRows = new Map<string, { como: string; escritas: Set<string>; avisos: number; existe: string }>();
  for (const l of listings) {
    if (!l.customBrand?.trim()) continue;
    const key = taxonomyKey(l.customBrand);
    const row = brandRows.get(key) ?? { como: normalizeTaxonomyName(l.customBrand), escritas: new Set(), avisos: 0, existe: brandByKey.get(key)?.name ?? "(nueva)" };
    row.escritas.add(l.customBrand);
    row.avisos++;
    brandRows.set(key, row);
  }

  // Modelos propios: bajo qué marca y si ya existen en ella.
  const modelRows = new Map<string, { marca: string; como: string; escritos: Set<string>; avisos: number; existe: string }>();
  for (const l of listings) {
    if (!l.customModel?.trim()) continue;
    const brandName = l.brand?.name ?? (l.customBrand ? brandByKey.get(taxonomyKey(l.customBrand))?.name ?? normalizeTaxonomyName(l.customBrand) : "(sin marca)");
    const known = l.brand?.models ?? brandByKey.get(taxonomyKey(brandName))?.models ?? [];
    const key = `${taxonomyKey(brandName)}|${taxonomyKey(l.customModel)}`;
    const match = known.find((m) => taxonomyKey(m.name) === taxonomyKey(l.customModel!));
    const row = modelRows.get(key) ?? { marca: brandName, como: normalizeTaxonomyName(l.customModel), escritos: new Set(), avisos: 0, existe: match?.name ?? "(nuevo)" };
    row.escritos.add(l.customModel);
    row.avisos++;
    modelRows.set(key, row);
  }

  // Repuestos: la marca es texto libre (no hay lista); solo se pasa a mayúsculas.
  const parts = await prisma.sparePart.findMany({ where: { brand: { not: null } }, select: { brand: true } });
  const partChanges = new Map<string, { como: string; escritas: Set<string>; avisos: number }>();
  for (const p of parts) {
    const como = normalizeTaxonomyName(p.brand!);
    if (!como) continue;
    const row = partChanges.get(taxonomyKey(como)) ?? { como, escritas: new Set(), avisos: 0 };
    row.escritas.add(p.brand!);
    row.avisos++;
    partChanges.set(taxonomyKey(como), row);
  }

  const show = <T extends { escritas?: Set<string>; escritos?: Set<string> }>(rows: Iterable<T>) =>
    [...rows].map(({ escritas, escritos, ...r }) => ({ ...r, "como lo cargaron": [...(escritas ?? escritos ?? [])].join(" / ") }));
  console.log(`Avisos de aviones con marca o modelo propio: ${listings.length}`);
  console.log("\nMarcas propias:");
  console.table(show(brandRows.values()));
  console.log("\nModelos propios:");
  console.table(show(modelRows.values()));
  console.log("\nMarcas de repuestos (texto libre, solo mayúsculas):");
  console.table(show([...partChanges.values()].filter((r) => [...r.escritas].some((e) => e !== r.como))));

  if (!APPLY) return console.log("\nSolo informe. Para aplicar: --apply");
  let adopted = 0;
  for (const l of listings) {
    const a = await adoptCustomTaxonomy(l);
    await prisma.aircraft.update({
      where: { id: l.id },
      data: { brandId: a.brandId, modelId: a.modelId, customBrand: a.brandId ? null : l.customBrand, customModel: a.modelId ? null : l.customModel },
    });
    await linkAdoptedSource(a, l.id);
    adopted++;
  }
  let parts2 = 0;
  for (const p of await prisma.sparePart.findMany({ where: { brand: { not: null } }, select: { id: true, brand: true } })) {
    const como = normalizeTaxonomyName(p.brand!);
    if (como !== p.brand) {
      await prisma.sparePart.update({ where: { id: p.id }, data: { brand: como || null } });
      parts2++;
    }
  }
  console.log(`
Aplicado: ${adopted} avisos de aviones pasados a la lista, ${parts2} marcas de repuestos en mayúsculas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
