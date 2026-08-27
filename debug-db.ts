import { prisma } from "./lib/prisma";

async function main() {
  const count = await prisma.aircraftBrand.count();
  console.log("Count vía Prisma ORM:", count);

  const raw: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "AircraftBrand"`);
  console.log("Count vía SQL crudo:", raw);

  const currentUser: any = await prisma.$queryRawUnsafe(`SELECT current_user, current_database()`);
  console.log("Usuario/DB conectado:", currentUser);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});