// VA-166 / VA-174 · Datos de los planes según la grilla de los socios (19/10). Correr DESPUÉS de las
// migraciones va166_plan_base y va166_planes_grilla (crean el plan Base y las filas de la grilla).
//
//   npx tsx --env-file=.env scripts/va166-migrate-data.ts            → informe, base local (no escribe)
//   npx tsx --env-file=.env scripts/va166-migrate-data.ts --apply    → aplica en la base local
//
// Para producción: exportar RUNTIME_DATABASE_URL en la terminal (no tocar el .env), correr sin
// --env-file y, para escribir, agregar --apply --confirm-production.
//
// Hace:
// - Pro: 3 aviones / 10 repuestos, AR$ 38.000 (tachado 50.000), 5 republicaciones por año, verificado,
//   destacadas, Página VA "banner" y métricas Pro.
// - Broker / Empresa (las 3 opciones del Empresarial): AR$ 55.000 un rubro (tachado 68.000) y 85.000
//   ambos (tachado 108.000), "Republicar todas" cada 30 días, verificado, destacadas, Página VA completa,
//   detalles personalizados y métricas completas. Se renombran a "Broker / Empresa · …".
// - VA-174: las suscripciones de cortesía de cuentas admin pasan a CANCELLED (no se borran; no tienen
//   pagos) y sus avisos no se tocan.
// No activa ningún plan: eso se hace en /admin/plans cuando los socios lo decidan. No toca compras,
// pagos ni facturas.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.RUNTIME_DATABASE_URL;
if (!url) {
  console.error("Falta RUNTIME_DATABASE_URL (en el .env con --env-file=.env, o exportada en la terminal).");
  process.exit(1);
}
const APPLY = process.argv.includes("--apply");
const host = new URL(url).hostname;
if (APPLY && !["localhost", "127.0.0.1", "::1"].includes(host) && !process.argv.includes("--confirm-production")) {
  console.error(`La base (${host}) no es local: agregar --confirm-production para escribir.`);
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const PRO = {
  name: "Pro",
  aircraftListingsCount: 3,
  sparePartsListingsCount: 10,
  price: 38000,
  listPrice: 50000,
  republishesPerYear: 5,
  republishAllEveryDays: null,
  includesVerifiedBadge: true,
  includesFeatured: true,
  vaPageLevel: "BANNER" as const,
  includesCustomDetail: false,
  metricsLevel: "PRO" as const,
};
const BROKER = {
  republishesPerYear: 0,
  republishAllEveryDays: 30,
  includesVerifiedBadge: true,
  includesFeatured: true,
  vaPageLevel: "FULL" as const,
  includesCustomDetail: true,
  metricsLevel: "FULL" as const,
};
const brokerName = (a: boolean, r: boolean) => `Broker / Empresa · ${a && r ? "Todo ilimitado" : a ? "Aviones ilimitados" : "Repuestos ilimitados"}`;

async function main() {
  console.log(`Base: ${host}  ·  ${new Date().toISOString()}  ·  ${APPLY ? "APLICA" : "solo informe"}`);
  const now = new Date();
  const current = { OR: [{ status: "ACTIVE" as const, currentPeriodEnd: { gt: now } }, { status: "PAST_DUE" as const, graceUntil: { gt: now } }] };

  await prisma.$transaction(async (tx) => {
    const base = await tx.plan.findFirst({ where: { tier: "BASE" } });
    console.log(`\n1. Base: ${base ? `${base.aircraftListingsCount} avión / ${base.sparePartsListingsCount} repuestos, ${base.republishesPerYear} republicaciones por año` : "FALTA (correr las migraciones de VA-166)"}`);
    const rows = await tx.planGridRow.count();
    console.log(`   Filas de la grilla: ${rows}`);

    const pro = await tx.plan.findFirst({ where: { tier: "PRO", archivedAt: null } });
    console.log(`\n2. Pro: ${pro ? `${pro.name} · ${pro.aircraftListingsCount} / ${pro.sparePartsListingsCount} · AR$ ${pro.price} → 3 / 10 · AR$ 38.000 (tachado 50.000)` : "no existe (lo crea scripts/va152-migrate-data.ts)"}`);
    if (pro) {
      const subs = await tx.subscription.count({ where: { planId: pro.id, source: { not: "MANUAL" }, ...current } });
      console.log(`   suscriptores pagos vigentes: ${subs}${subs ? " (el precio nuevo vale para sus cobros siguientes: avisarles)" : ""}`);
      if (APPLY) await tx.plan.update({ where: { id: pro.id }, data: PRO });
    }

    const brokers = await tx.plan.findMany({ where: { tier: "BUSINESS", archivedAt: null } });
    console.log(`\n3. Broker / Empresa: ${brokers.length} opciones`);
    for (const p of brokers) {
      const both = p.isUnlimitedAircraft && p.isUnlimitedSpareParts;
      const data = { ...BROKER, name: brokerName(p.isUnlimitedAircraft, p.isUnlimitedSpareParts), price: both ? 85000 : 55000, listPrice: both ? 108000 : 68000 };
      const subs = await tx.subscription.count({ where: { planId: p.id, source: { not: "MANUAL" }, ...current } });
      console.log(`   ${p.name} → ${data.name} · AR$ ${data.price} (tachado ${data.listPrice}) · suscriptores pagos: ${subs}`);
      if (APPLY) await tx.plan.update({ where: { id: p.id }, data });
    }

    const courtesies = await tx.subscription.findMany({
      where: { source: "MANUAL", user: { isAdmin: true }, ...current },
      select: { id: true, user: { select: { email: true } }, plan: { select: { name: true } }, _count: { select: { payments: true } } },
    });
    console.log(`\n4. VA-174: cortesías de admins que se cierran: ${courtesies.length}`);
    for (const c of courtesies) console.log(`   ${c.user.email} · ${c.plan.name} · pagos: ${c._count.payments}`);
    if (APPLY && courtesies.length) {
      await tx.subscription.updateMany({ where: { id: { in: courtesies.map((c) => c.id) } }, data: { status: "CANCELLED", cancelAtPeriodEnd: false, currentPeriodEnd: now, note: "VA-174: los admins tienen el Broker completo sin suscripción" } });
    }
    const otherCourtesies = await tx.subscription.count({ where: { source: "MANUAL", user: { isAdmin: false }, ...current } });
    console.log(`   cortesías de cuentas que no son admin (quedan como están): ${otherCourtesies}`);
  });

  console.log(APPLY ? "\nAplicado. Los planes quedan como estaban de activos: se activan desde /admin/plans." : "\nSolo informe: nada cambió. Para aplicar, --apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
