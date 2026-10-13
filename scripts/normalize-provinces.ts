// Normaliza la provincia de avisos y perfiles a los 24 nombres canónicos (VA-77).
//
//   npx tsx scripts/normalize-provinces.ts            → dry-run: lista "actual → canónico" y lo no reconocido
//   npx tsx scripts/normalize-provinces.ts --apply    → escribe los cambios
//
// Usa RUNTIME_DATABASE_URL del .env. Por seguridad solo corre contra una base local
// (localhost/127.0.0.1); para otra base hay que pasar --allow-remote a propósito.
// Los valores no reconocidos no se tocan: hay que corregirlos a mano.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeProvince } from "../lib/provinces";

const apply = process.argv.includes("--apply");
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

type Row = { province: string | null; _count: { _all: number } };

async function main() {
  const [aircraft, spareParts, users] = await Promise.all([
    prisma.aircraft.groupBy({ by: ["province"], _count: { _all: true } }),
    prisma.sparePart.groupBy({ by: ["province"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["province"], _count: { _all: true } }),
  ]);
  const tables: { name: string; groups: Row[] }[] = [
    { name: "Aircraft", groups: aircraft },
    { name: "SparePart", groups: spareParts },
    { name: "User", groups: users },
  ];

  console.log(`Base: ${host} · modo: ${apply ? "APPLY (escribe)" : "dry-run (no escribe)"}\n`);

  for (const { name, groups } of tables) {
    const changes: { from: string; to: string; count: number }[] = [];
    const unknown: { value: string; count: number }[] = [];
    let ok = 0;
    let empty = 0;

    for (const g of groups) {
      const count = g._count._all;
      if (g.province === null || g.province.trim() === "") {
        empty += count;
        continue;
      }
      const canonical = normalizeProvince(g.province);
      if (!canonical) unknown.push({ value: g.province, count });
      else if (canonical !== g.province) changes.push({ from: g.province, to: canonical, count });
      else ok += count;
    }

    console.log(`== ${name} ==`);
    console.log(`  ya canónicas: ${ok} · vacías: ${empty}`);
    for (const c of changes.sort((a, b) => a.from.localeCompare(b.from))) {
      console.log(`  "${c.from}" → "${c.to}"  (${c.count})`);
    }
    for (const u of unknown) console.log(`  NO RECONOCIDA: "${u.value}"  (${u.count})`);
    if (changes.length === 0 && unknown.length === 0) console.log("  nada para cambiar");

    if (apply) {
      let updated = 0;
      for (const c of changes) {
        const where = { province: c.from };
        const data = { province: c.to };
        const res =
          name === "Aircraft"
            ? await prisma.aircraft.updateMany({ where, data })
            : name === "SparePart"
              ? await prisma.sparePart.updateMany({ where, data })
              : await prisma.user.updateMany({ where, data });
        updated += res.count;
      }
      console.log(`  actualizadas: ${updated}`);
    }
    console.log("");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
