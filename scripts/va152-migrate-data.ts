// VA-152 · Datos del modelo de cupos fijos. Reemplaza a seed-real-plans.ts (planes del modelo anterior).
// Idempotente: se puede correr más de una vez. Sin --apply solo informa.
//
//   npx tsx --env-file=.env scripts/va152-migrate-data.ts            → base local, solo informe
//   npx tsx --env-file=.env scripts/va152-migrate-data.ts --apply    → base local, aplica
//
// Va DESPUÉS de prisma migrate deploy (necesita las tablas y columnas de va152_cupos).
//
// En el Preview o producción: exportar RUNTIME_DATABASE_URL en la terminal (no tocar el .env), correr
// sin --env-file y agregar --confirm-production. Primero sin --apply.
//
// Qué hace, en orden (decisiones del 18/10):
// 1. Cupo Gratis (QuotaSettings): 1 avión y 5 repuestos, si no existe.
// 2. Crea Pro (3 aviones / 15 repuestos) y las 3 opciones del Empresarial (aviones, repuestos o ambos
//    ilimitados), sin precio e inactivos: los montos se cargan en /admin/plans. Solo el Empresarial
//    incluye Página VA y métricas.
// 3. Las cortesías (suscripciones MANUAL) de los planes viejos pasan al Empresarial con todo
//    ilimitado. Si hay una suscripción PAGA en un plan viejo, frena: se decide a mano.
// 4. Planes viejos: se borran los que no tienen compras ni suscripciones; los demás quedan archivados.
// 5. Cupones de avisos, destacados, hangares o banners y los de renovación → inactivos (no se borran).
// 6. Lotes de saldo sin compra detrás (lanzamiento, admin, heredados) → se borran. Los de packs quedan.
// Los avisos vencidos y "pendiente de pago" pasan a pausados en la migración va152_limpieza. Las
// cuentas que superan el cupo Gratis conservan sus avisos activos.
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
const url = process.env.RUNTIME_DATABASE_URL;
if (!url) {
  console.error("Falta RUNTIME_DATABASE_URL (en el .env con --env-file=.env, o exportada en la terminal).");
  process.exit(1);
}
const target = new URL(url);
const local = ["localhost", "127.0.0.1", "::1"].includes(target.hostname);
if (!local && !process.argv.includes("--confirm-production")) {
  console.error(`La base es ${target.hostname}${target.pathname}, que no es la local. Agregá --confirm-production.`);
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

type Tx = Prisma.TransactionClient;
const BUSINESS_FEATURES = ["Página VA: tu portada, logo y datos de contacto", "Métricas de tus avisos y contactos", "Sin vencimiento", "Cambiás o cancelás cuando quieras"];
const NEW_PLANS = [
  {
    key: "pro",
    name: "Pro",
    tier: "PRO" as const,
    aircraftListingsCount: 3,
    sparePartsListingsCount: 15,
    isUnlimitedAircraft: false,
    isUnlimitedSpareParts: false,
    includesCustomPage: false,
    includesSellerMetrics: false,
    description: "Para quien vende más de un avión o tiene stock de repuestos.",
    features: ["Sin vencimiento", "Cambiás o cancelás cuando quieras"],
    isPopular: true,
    sortOrder: 10,
  },
  {
    key: "business-aircraft",
    name: "Empresarial · Aviones ilimitados",
    tier: "BUSINESS" as const,
    aircraftListingsCount: 0,
    sparePartsListingsCount: 0,
    isUnlimitedAircraft: true,
    isUnlimitedSpareParts: false,
    includesCustomPage: true,
    includesSellerMetrics: true,
    description: "Para brokers, concesionarios y escuelas.",
    features: BUSINESS_FEATURES,
    isPopular: false,
    sortOrder: 20,
  },
  {
    key: "business-parts",
    name: "Empresarial · Repuestos ilimitados",
    tier: "BUSINESS" as const,
    aircraftListingsCount: 0,
    sparePartsListingsCount: 0,
    isUnlimitedAircraft: false,
    isUnlimitedSpareParts: true,
    includesCustomPage: true,
    includesSellerMetrics: true,
    description: "Para talleres, distribuidores y comercios de repuestos.",
    features: BUSINESS_FEATURES,
    isPopular: false,
    sortOrder: 30,
  },
  {
    key: "business-both",
    name: "Empresarial · Todo ilimitado",
    tier: "BUSINESS" as const,
    aircraftListingsCount: 0,
    sparePartsListingsCount: 0,
    isUnlimitedAircraft: true,
    isUnlimitedSpareParts: true,
    includesCustomPage: true,
    includesSellerMetrics: true,
    description: "Aviones y repuestos sin límite.",
    features: BUSINESS_FEATURES,
    isPopular: false,
    sortOrder: 40,
  },
];
const OLD_COUPON_SCOPES = ["AIRCRAFT", "SPARE_PART", "HANGAR", "FEATURED", "AD_BANNER"] as const;

function line(text: string) {
  console.log(`  ${text}`);
}

async function run(tx: Tx) {
  const now = new Date();

  console.log("1. Cupo Gratis");
  const settings = await tx.quotaSettings.findUnique({ where: { id: "default" } });
  if (settings) line(`ya existe: ${settings.freeAircraftQuota} avión / ${settings.freeSparePartQuota} repuestos`);
  else {
    line("se crea: 1 avión / 5 repuestos");
    if (APPLY) await tx.quotaSettings.create({ data: { id: "default", freeAircraftQuota: 1, freeSparePartQuota: 5 } });
  }

  console.log("2. Planes nuevos (sin precio e inactivos)");
  const planIds: Record<string, string> = {};
  for (const p of NEW_PLANS) {
    const existing = await tx.plan.findFirst({
      where: { tier: p.tier, isUnlimitedAircraft: p.isUnlimitedAircraft, isUnlimitedSpareParts: p.isUnlimitedSpareParts, archivedAt: null },
      select: { id: true, name: true },
    });
    if (existing) {
      line(`ya existe: ${existing.name}`);
      planIds[p.key] = existing.id;
      continue;
    }
    line(`se crea: ${p.name}`);
    if (APPLY) {
      const { key, ...data } = p;
      void key;
      const created = await tx.plan.create({
        data: { ...data, type: "SUBSCRIPTION", billingType: "SUBSCRIPTION", billingInterval: "MONTHLY", price: 0, isActive: false },
        select: { id: true },
      });
      planIds[p.key] = created.id;
    } else planIds[p.key] = `(nuevo: ${p.name})`;
  }

  console.log("3. Suscripciones de los planes viejos");
  const oldSubs = await tx.subscription.findMany({
    where: { plan: { tier: null } },
    select: { id: true, source: true, status: true, user: { select: { email: true } }, plan: { select: { name: true } } },
  });
  const paid = oldSubs.filter((s) => s.source !== "MANUAL" && ["ACTIVE", "PAST_DUE", "PENDING"].includes(s.status));
  if (paid.length) {
    for (const s of paid) line(`PAGA en un plan viejo: ${s.user.email} · ${s.plan.name} (${s.status})`);
    throw new Error("Hay suscripciones pagas en planes viejos: se deciden a mano antes de seguir. No se aplicó nada.");
  }
  const courtesies = oldSubs.filter((s) => s.source === "MANUAL");
  for (const s of courtesies) line(`cortesía → Empresarial · Todo ilimitado: ${s.user.email} (era ${s.plan.name}, ${s.status})`);
  if (!courtesies.length) line("ninguna cortesía");
  const ended = oldSubs.filter((s) => s.source !== "MANUAL");
  if (ended.length) line(`${ended.length} suscripciones pagas ya terminadas quedan en su plan viejo (historial)`);
  if (APPLY && courtesies.length) {
    await tx.subscription.updateMany({ where: { id: { in: courtesies.map((s) => s.id) } }, data: { planId: planIds["business-both"], pendingPlanId: null } });
  }

  console.log("4. Planes viejos");
  const oldPlans = await tx.plan.findMany({
    where: { tier: null },
    select: { id: true, name: true, archivedAt: true, _count: { select: { purchases: true, subscriptions: true } } },
  });
  for (const p of oldPlans) {
    const subs = p._count.subscriptions - (APPLY ? 0 : courtesies.filter((s) => s.plan.name === p.name).length);
    if (p._count.purchases === 0 && subs === 0) {
      line(`se borra: ${p.name}`);
      if (APPLY) await tx.plan.delete({ where: { id: p.id } });
    } else {
      line(`queda archivado: ${p.name} (${p._count.purchases} compras, ${subs} suscripciones)`);
      if (APPLY && !p.archivedAt) await tx.plan.update({ where: { id: p.id }, data: { archivedAt: now, isActive: false } });
    }
  }

  console.log("5. Cupones que ya no aplican → inactivos");
  const coupons = await tx.coupon.findMany({
    where: { isActive: true, OR: [{ scope: { in: [...OLD_COUPON_SCOPES] } }, { type: "RENEWAL" }] },
    select: { code: true, scope: true, type: true },
  });
  for (const c of coupons) line(`${c.code} (${c.scope}, ${c.type})`);
  if (!coupons.length) line("ninguno");
  if (APPLY && coupons.length) await tx.coupon.updateMany({ where: { code: { in: coupons.map((c) => c.code) } }, data: { isActive: false } });

  console.log("6. Lotes de saldo sin compra (lanzamiento, admin, heredados) → se borran");
  const lots = await tx.creditLot.groupBy({ by: ["source"], where: { source: { in: ["LAUNCH", "ADMIN", "LEGACY"] } }, _count: { _all: true } });
  for (const l of lots) line(`${l.source}: ${l._count._all}`);
  if (!lots.length) line("ninguno");
  if (APPLY) await tx.creditLot.deleteMany({ where: { source: { in: ["LAUNCH", "ADMIN", "LEGACY"] } } });
}

async function main() {
  console.log(`Base: ${target.hostname}${target.pathname} · ${APPLY ? "APLICANDO" : "solo informe (sin --apply)"}\n`);
  if (APPLY) await prisma.$transaction(run, { timeout: 60_000 });
  else await run(prisma as unknown as Tx);
  console.log(APPLY ? "\nListo." : "\nNo se cambió nada. Para aplicar: --apply.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
