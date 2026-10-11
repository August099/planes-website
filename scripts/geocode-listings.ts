// Completa las coordenadas de los avisos que no las tienen, con la API Georef (VA-83).
//
//   npx tsx scripts/geocode-listings.ts            → dry-run: qué localidad encontró para cada ciudad
//   npx tsx scripts/geocode-listings.ts --apply    → escribe latitude/longitude
//   npx tsx scripts/geocode-listings.ts --all      → también revisa los que ya tienen coordenadas
//
// Usa RUNTIME_DATABASE_URL del .env. Por seguridad solo corre contra una base local
// (localhost/127.0.0.1); para otra base hay que pasar --allow-remote a propósito.
// Pide una vez por cada "ciudad, provincia" distinta, con una pausa entre pedidos (la API es
// abierta y sin cuotas publicadas: no la saturamos).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { geocodeLocality, type GeocodeResult } from "../lib/geocode";

const apply = process.argv.includes("--apply");
const all = process.argv.includes("--all");
const allowRemote = process.argv.includes("--allow-remote");
const PAUSE_MS = 400;
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const where = all ? {} : { latitude: null };
  const select = { id: true, city: true, province: true } as const;
  const [aircraft, spareParts] = await Promise.all([
    prisma.aircraft.findMany({ where, select }),
    prisma.sparePart.findMany({ where, select }),
  ]);
  const listings = [
    ...aircraft.map((l) => ({ ...l, table: "aircraft" as const })),
    ...spareParts.map((l) => ({ ...l, table: "sparePart" as const })),
  ];
  console.log(`${apply ? "APLICANDO" : "DRY-RUN"} · avisos a revisar: ${listings.length} (${aircraft.length} aeronaves, ${spareParts.length} repuestos)\n`);

  const byPlace = new Map<string, typeof listings>();
  for (const l of listings) {
    const key = `${l.city ?? ""}|${l.province ?? ""}`;
    byPlace.set(key, [...(byPlace.get(key) ?? []), l]);
  }

  const results = new Map<string, GeocodeResult>();
  for (const key of byPlace.keys()) {
    const [city, province] = key.split("|");
    results.set(key, await geocodeLocality(city, province));
    await sleep(PAUSE_MS);
  }

  let resolved = 0;
  let unresolved = 0;
  for (const [key, group] of byPlace) {
    const [city, province] = key.split("|");
    const r = results.get(key)!;
    const label = `${city || "(sin ciudad)"}, ${province || "(sin provincia)"}`.padEnd(48);
    if (r.ok) {
      resolved += group.length;
      console.log(`OK    ${label} ${String(group.length).padStart(3)} avisos → ${r.name} (${r.match}) ${r.coords.lat.toFixed(4)}, ${r.coords.lon.toFixed(4)}`);
      if (apply) {
        const ids = (t: "aircraft" | "sparePart") => group.filter((l) => l.table === t).map((l) => l.id);
        const data = { latitude: r.coords.lat, longitude: r.coords.lon };
        await prisma.aircraft.updateMany({ where: { id: { in: ids("aircraft") } }, data });
        await prisma.sparePart.updateMany({ where: { id: { in: ids("sparePart") } }, data });
      }
    } else {
      unresolved += group.length;
      console.log(`FALTA ${label} ${String(group.length).padStart(3)} avisos · ${r.reason}`);
    }
  }

  console.log(`\nResueltos: ${resolved} avisos · Sin resolver: ${unresolved} avisos · Localidades distintas: ${byPlace.size}`);
  if (!apply) console.log("Dry-run: no se escribió nada. Para guardar: --apply");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
