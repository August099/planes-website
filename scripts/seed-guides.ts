// Carga las guías en la base (VA-85).
//
//   npx tsx scripts/seed-guides.ts            → dry-run: qué crearía o saltearía
//   npx tsx scripts/seed-guides.ts --apply    → escribe
//   npx tsx scripts/seed-guides.ts --apply --force → además pisa el contenido de las que ya existen
//                                                   (sin cambiar su estado)
//
// Las 4 guías que estaban en el código (VA-78) entran como PUBLISHED; las 6 nuevas del spec, como
// DRAFT: no se ven en el sitio hasta publicarlas desde /admin/guides. Las que ya existen (mismo
// slug) no se tocan, para no pisar lo que se haya editado en el admin.
// Usa RUNTIME_DATABASE_URL del .env. Por seguridad solo corre contra una base local; para otra
// base hay que pasar --allow-remote a propósito.
import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { guideInputSchema } from "../lib/guide-rules";
import { CURRENT_GUIDES } from "../prisma/seed-data/guides-current";
import { NEW_GUIDES } from "../prisma/seed-data/guides-new";

const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");
const allowRemote = process.argv.includes("--allow-remote");
const url = process.env.RUNTIME_DATABASE_URL;

if (!url) {
  console.error("Falta RUNTIME_DATABASE_URL en el .env.");
  process.exit(1);
}
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host) && !allowRemote) {
  console.error(`La base apunta a "${host}", que no es local. No se corre contra otra base sin --allow-remote.`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const seeds = [
  ...CURRENT_GUIDES.map((g, i) => ({ guide: g, status: "PUBLISHED" as const, order: (i + 1) * 10 })),
  ...NEW_GUIDES.map((g, i) => ({ guide: g, status: "DRAFT" as const, order: (CURRENT_GUIDES.length + i + 1) * 10 })),
];

async function main() {
  console.log(`${apply ? "APLICANDO" : "DRY-RUN"} · ${seeds.length} guías\n`);
  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const { guide, status, order } of seeds) {
    // Mismas reglas que el admin (slug, largo de la metaDescription, links…).
    const parsed = guideInputSchema.safeParse({ ...guide, order, cta: guide.cta ?? [], source: guide.source ?? null });
    if (!parsed.success) {
      console.error(`ERROR ${guide.slug}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      process.exitCode = 1;
      continue;
    }
    const d = parsed.data;
    const content = {
      title: d.title,
      excerpt: d.excerpt,
      audience: d.audience,
      icon: d.icon,
      metaDescription: d.metaDescription,
      sections: d.sections as unknown as Prisma.InputJsonValue,
      source: d.source ? (d.source as Prisma.InputJsonValue) : Prisma.DbNull,
      cta: d.cta as unknown as Prisma.InputJsonValue,
      isGlossary: d.isGlossary,
    };
    const existing = await prisma.guide.findUnique({ where: { slug: d.slug }, select: { id: true, status: true } });
    const label = `${status.padEnd(9)} ${String(order).padStart(3)}  ${d.slug}`;

    if (existing && !force) {
      skipped++;
      console.log(`SALTEA ${label} (ya existe, ${existing.status})`);
      continue;
    }
    if (existing && force) {
      updated++;
      console.log(`PISA   ${label} (queda ${existing.status})`);
      if (apply) await prisma.guide.update({ where: { id: existing.id }, data: content });
      continue;
    }
    created++;
    console.log(`CREA   ${label} · meta ${d.metaDescription.length} car.`);
    if (apply) {
      await prisma.guide.create({
        data: { ...content, slug: d.slug, status, order, publishedAt: status === "PUBLISHED" ? new Date() : null },
      });
    }
  }
  console.log(`\nCrea: ${created} · Saltea: ${skipped} · Pisa: ${updated}`);
  if (!apply) console.log("Dry-run: no se escribió nada. Para guardar: --apply");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
