// VA-153 · Carga la categoría de cada modelo y submodelo desde docs/planillas/VA-153_categorias_socio.txt.
// Por defecto SOLO LEE y compara con la base: lista lo que cambiaría, lo que no se encuentra y lo que
// sobra. Con --apply escribe (recommendedCategoryId del modelo, categoryOverride del submodelo); contra
// una base que no sea local exige además --confirm-production.
//
//   npx tsx --env-file=.env scripts/va153-import-categorias.ts            → informe, base local
//   npx tsx --env-file=.env scripts/va153-import-categorias.ts --apply    → aplica en la base local
//
// Para producción: exportar RUNTIME_DATABASE_URL en la terminal (no tocar el .env) y correr sin --env-file.
//
// Decisiones del 18/10: los submodelos heredan siempre la categoría del modelo (se borra cualquier
// override); PR en un modelo lo deja como está; S/C es la categoría "Otros".
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.RUNTIME_DATABASE_URL;
if (!url) {
  console.error("Falta RUNTIME_DATABASE_URL (en el .env con --env-file=.env, o exportada en la terminal).");
  process.exit(1);
}
const apply = process.argv.includes("--apply");
const host = new URL(url).hostname;
const local = ["localhost", "127.0.0.1", "::1"].includes(host);
if (apply && !local && !process.argv.includes("--confirm-production")) {
  console.error(`La base (${host}) no es local: agregar --confirm-production para escribir.`);
  process.exit(1);
}

type Code = "MP" | "MT" | "BP" | "BT" | "A" | "H" | "E" | "PR" | "S/C";
type SubRow = { name: string; code: Code };
type ModelRow = { name: string; code: Code; subs: SubRow[] };
type BrandRow = { name: string; models: ModelRow[] };

function parse(path: string): BrandRow[] {
  const brands: BrandRow[] = [];
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    if (indent === 0) {
      brands.push({ name: line, models: [] });
      continue;
    }
    const m = line.match(/^(.*)\s+\((MP|MT|BP|BT|A|H|E|PR|S\/C)\)$/);
    if (!m) throw new Error(`Línea sin código: "${line}"`);
    const [, name, code] = m as unknown as [string, string, Code];
    const brand = brands.at(-1)!;
    if (indent >= 8) brand.models.at(-1)!.subs.push({ name, code });
    else brand.models.push({ name, code, subs: [] });
  }
  return brands;
}

/** Para comparar nombres: sin mayúsculas, acentos, espacios ni guiones. */
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s\-_./()]/g, "");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const sheet = parse("docs/planillas/VA-153_categorias_socio.txt");
  const categories = await prisma.aircraftCategory.findMany({ select: { id: true, name: true } });
  const brands = await prisma.aircraftBrand.findMany({
    select: {
      id: true,
      name: true,
      models: {
        select: {
          id: true,
          name: true,
          recommendedCategoryId: true,
          _count: { select: { aircrafts: true } },
          variants: { select: { id: true, name: true, categoryOverride: true, _count: { select: { aircrafts: true } } } },
        },
      },
    },
  });
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  console.log(`Base: ${host}  ·  ${new Date().toISOString()}  ·  ${apply ? "APLICA" : "solo informe"}`);
  console.log("Categorías en la base:", categories.map((c) => c.name).join(" · "));

  // Código → categoría de la base, por nombre (se informa si alguna no existe).
  const want: Record<Exclude<Code, "PR">, RegExp> = {
    MP: /mono.*pist/i,
    MT: /mono.*turbo/i,
    BP: /bi.*pist/i,
    BT: /bi.*turbo/i,
    A: /agr[ií]c/i,
    H: /helic/i,
    E: /experim|lsa/i,
    "S/C": /^otros$/i,
  };
  const codeToCat = new Map<Code, string | null>();
  for (const [code, re] of Object.entries(want) as [Code, RegExp][]) {
    const hits = categories.filter((c) => re.test(c.name));
    if (hits.length !== 1) console.log(`!! Código ${code}: ${hits.length} categorías coinciden (${hits.map((h) => h.name).join(", ") || "ninguna"})`);
    codeToCat.set(code, hits[0]?.id ?? null);
  }

  const changes: { tipo: string; marca: string; nombre: string; antes: string; despues: string; avisos: number }[] = [];
  const missing: { tipo: string; marca: string; nombre: string }[] = [];
  const writes: (() => Promise<unknown>)[] = [];
  const seenModels = new Set<string>();
  const seenSubs = new Set<string>();

  for (const b of sheet) {
    const dbBrand = brands.find((x) => norm(x.name) === norm(b.name));
    if (!dbBrand) {
      missing.push({ tipo: "marca", marca: b.name, nombre: "" });
      continue;
    }
    for (const m of b.models) {
      const dbModel = dbBrand.models.find((x) => norm(x.name) === norm(m.name));
      if (!dbModel) {
        missing.push({ tipo: "modelo", marca: b.name, nombre: m.name });
        continue;
      }
      seenModels.add(dbModel.id);
      if (m.code === "PR") continue; // a nivel modelo no se sabe qué heredar: queda como está y se consulta
      const target = codeToCat.get(m.code) ?? null;
      if (target !== dbModel.recommendedCategoryId) {
        changes.push({ tipo: "modelo", marca: b.name, nombre: dbModel.name, antes: catName.get(dbModel.recommendedCategoryId ?? "") ?? "—", despues: catName.get(target ?? "") ?? "—", avisos: dbModel._count.aircrafts });
        writes.push(() => prisma.aircraftModel.update({ where: { id: dbModel.id }, data: { recommendedCategoryId: target } }));
      }
      for (const s of m.subs) {
        const dbSub = dbModel.variants.find((x) => norm(x.name) === norm(s.name));
        if (!dbSub) {
          missing.push({ tipo: "submodelo", marca: b.name, nombre: `${m.name} › ${s.name}` });
          continue;
        }
        seenSubs.add(dbSub.id);
        const override = null;
        if (override !== dbSub.categoryOverride) {
          changes.push({ tipo: "submodelo", marca: b.name, nombre: `${dbModel.name} › ${dbSub.name}`, antes: catName.get(dbSub.categoryOverride ?? "") ?? "(hereda)", despues: catName.get(override ?? "") ?? "(hereda)", avisos: dbSub._count.aircrafts });
          writes.push(() => prisma.aircraftSubModel.update({ where: { id: dbSub.id }, data: { categoryOverride: override } }));
        }
      }
    }
  }

  const extra = brands.flatMap((b) => [
    ...b.models.filter((m) => !seenModels.has(m.id)).map((m) => ({ tipo: "modelo", marca: b.name, nombre: m.name, categoria: catName.get(m.recommendedCategoryId ?? "") ?? "—", avisos: m._count.aircrafts })),
    ...b.models.filter((m) => seenModels.has(m.id)).flatMap((m) => m.variants.filter((v) => !seenSubs.has(v.id)).map((v) => ({ tipo: "submodelo", marca: b.name, nombre: `${m.name} › ${v.name}`, categoria: catName.get(v.categoryOverride ?? "") ?? "(hereda)", avisos: v._count.aircrafts }))),
  ]);

  console.log(`\n## Cambios (${changes.length})`);
  console.table(changes);
  console.log(`\n## En la planilla pero no en la base (${missing.length})`);
  console.table(missing);
  console.log(`\n## En la base pero no en la planilla (${extra.length}) — no se tocan`);
  console.table(extra);

  // Avisos cuya categoría no coincide con la que resultaría de su modelo/submodelo.
  const mismatched = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    select a.id, a.title, c.name categoria, coalesce(sc.name, mc.name) segun_modelo
    from "Aircraft" a
    join "AircraftCategory" c on c.id = a."categoryId"
    left join "AircraftModel" m on m.id = a."modelId"
    left join "AircraftCategory" mc on mc.id = m."recommendedCategoryId"
    left join "AircraftSubModel" s on s.id = a."subModelId"
    left join "AircraftCategory" sc on sc.id = s."categoryOverride"
    where coalesce(s."categoryOverride", m."recommendedCategoryId") is not null
      and coalesce(s."categoryOverride", m."recommendedCategoryId") <> a."categoryId"`);
  console.log(`\n## Avisos con categoría distinta a la de su modelo, ANTES de aplicar (${mismatched.length})`);
  console.table(mismatched);

  if (apply) {
    await prisma.$transaction(async () => {
      for (const w of writes) await w();
    });
    console.log(`\nAplicado: ${writes.length} cambios.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
