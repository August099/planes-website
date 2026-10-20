// VA-166 · Informe previo (SOLO LEE): cuentas que quedarían por encima del cupo nuevo
// (Base 1 avión / 3 repuestos; Pro 3 / 10; Broker: lo no ilimitado con el cupo de Base; admins sin límite).
//
//   npx tsx --env-file=.env scripts/va166-report.ts        → base local (va_dev)
//
// Para producción: exportar RUNTIME_DATABASE_URL en la terminal (no tocar el .env) y correr sin --env-file.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.RUNTIME_DATABASE_URL;
if (!url) {
  console.error("Falta RUNTIME_DATABASE_URL (en el .env con --env-file=.env, o exportada en la terminal).");
  process.exit(1);
}
const BASE = { aircraft: 1, parts: 3 };
const PRO = { aircraft: 3, parts: 10 };
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

type Row = { id: string; email: string; isAdmin: boolean; tier: string | null; ilimAv: boolean | null; ilimRep: boolean | null; source: string | null; aviones: number; repuestos: number };

async function main() {
  console.log(`Base: ${new URL(url!).hostname}  ·  ${new Date().toISOString()}`);
  const rows = await prisma.$queryRawUnsafe<Row[]>(`
    select u.id, u.email, u."isAdmin", p.tier::text tier, p."isUnlimitedAircraft" "ilimAv", p."isUnlimitedSpareParts" "ilimRep", s.source::text source,
      (select count(*) from "Aircraft" a where a."sellerId" = u.id and a.status = 'ACTIVE')::int aviones,
      (select count(*) from "SparePart" r where r."sellerId" = u.id and r.status = 'ACTIVE')::int repuestos
    from "User" u
    left join "Subscription" s on s."userId" = u.id
      and ((s.status = 'ACTIVE' and s."currentPeriodEnd" > now()) or (s.status = 'PAST_DUE' and s."graceUntil" > now()))
    left join "Plan" p on p.id = s."planId"`);

  const limitsOf = (r: Row) => {
    if (r.isAdmin) return { aircraft: Infinity, parts: Infinity, plan: "Admin" };
    if (r.tier === "PRO") return { ...PRO, plan: "Pro" };
    if (r.tier === "BUSINESS") return { aircraft: r.ilimAv ? Infinity : BASE.aircraft, parts: r.ilimRep ? Infinity : BASE.parts, plan: `Broker${r.source === "MANUAL" ? " (cortesía)" : ""}` };
    return { ...BASE, plan: "Base" };
  };
  const over = rows
    .map((r) => ({ r, l: limitsOf(r) }))
    .filter(({ r, l }) => r.aviones > l.aircraft || r.repuestos > l.parts)
    .map(({ r, l }) => ({ email: r.email, plan: l.plan, aviones: `${r.aviones}/${l.aircraft}`, repuestos: `${r.repuestos}/${l.parts}` }));

  const byPlan = new Map<string, number>();
  for (const r of rows) byPlan.set(limitsOf(r).plan, (byPlan.get(limitsOf(r).plan) ?? 0) + 1);
  console.log("\n## Cuentas por plan");
  console.table([...byPlan].map(([plan, cuentas]) => ({ plan, cuentas })));
  console.log(`\n## Por encima del cupo nuevo (${over.length} de ${rows.length} cuentas)`);
  console.table(over);
  const courtesy = rows.filter((r) => r.source === "MANUAL");
  console.log(`\n## Cortesías vigentes (${courtesy.length}): ${courtesy.filter((r) => r.isAdmin).length} de admins`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
