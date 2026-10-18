// VA-105 (socio, 14/10): los planes reales. Idempotente por nombre.
// 1. Crea o actualiza Plan Repuestos, Plan Aviones y Suscripción VA, y (VA-119) el "Pago de prueba"
//    de AR$ 100 para probar pagos reales (visible en /plans; archivarlo en /admin/plans después).
// 2. Mueve las cortesías (suscripciones MANUAL) de los otros planes a Suscripción VA. Si hay una
//    suscripción paga de Mercado Pago en otro plan, frena: eso se resuelve a mano.
// 3. Borra los otros planes (si alguno tiene compras, lo archiva en vez de borrarlo).
//
// Sin --apply solo informa. En una base que no sea la local pide además --confirm-production.
// Uso: npx tsx --require ./scripts/stub-server-only.cjs scripts/seed-real-plans.ts [--apply]
// Lee el .env solo (las variables ya exportadas en la terminal mandan sobre el .env).
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { planInputSchema, planRecordFromInput, type PlanInput } from "@/lib/plan-rules";
import { syncListingExpiry } from "@/lib/subscriptions";

const APPLY = process.argv.includes("--apply");
const VA = "Suscripción VA";
const TEST_PLAN = "Pago de prueba";

const base = {
  type: "SUBSCRIPTION",
  billingInterval: "MONTHLY",
  aircraftListingsCount: 0,
  sparePartsListingsCount: 0,
  noExpiry: true,
  includesVerifiedBadge: false,
  featuredPerMonth: 0,
  usageDescription: "",
  badge: "",
  isPopular: false,
  showInAircraftTab: true,
  showInPartsTab: true,
  isActive: true,
} as const;

const PLANS: PlanInput[] = [
  {
    ...base,
    name: "Plan Repuestos",
    price: 50000,
    isUnlimitedAircraft: false,
    isUnlimitedSpareParts: true,
    includesCustomPage: false,
    description: "Para talleres, distribuidores y comercios de repuestos.",
    features: ["Repuestos ilimitados", "Tus repuestos no vencen: no hace falta renovarlos", "Cancelás cuando quieras"],
    sortOrder: 10,
  },
  {
    ...base,
    name: "Plan Aviones",
    price: 75000,
    isUnlimitedAircraft: true,
    isUnlimitedSpareParts: false,
    includesCustomPage: false,
    description: "Para brokers, escuelas y vendedores con varias aeronaves.",
    features: ["Aviones ilimitados", "Tus aviones no vencen: no hace falta renovarlos", "Cancelás cuando quieras"],
    sortOrder: 20,
  },
  {
    ...base,
    name: VA,
    price: 90000,
    isUnlimitedAircraft: true,
    isUnlimitedSpareParts: true,
    includesCustomPage: true,
    // VA-151: panel de métricas de vendedor.
    includesSellerMetrics: true,
    description: "Todo ilimitado y tu propia Página VA.",
    features: [
      "Aviones y repuestos ilimitados",
      "Nada vence: no hace falta renovar",
      "Página VA: portada, logo, nombre comercial y WhatsApp",
      "Métricas de tus avisos",
      "Cancelás cuando quieras",
    ],
    sortOrder: 30,
  },
  // VA-119 (socio, 14/10): pago único de AR$ 100 para probar pagos reales en el Preview y en
  // producción. Visible en /plans. Después de la prueba: /admin/plans → Archivar (o --apply sin él).
  {
    ...base,
    name: TEST_PLAN,
    type: "AIRCRAFT_PACK",
    billingInterval: null,
    price: 100,
    aircraftListingsCount: 1,
    isUnlimitedAircraft: false,
    isUnlimitedSpareParts: false,
    noExpiry: false,
    includesCustomPage: false,
    description: "Pago único para probar el cobro real. Se quita después de la prueba.",
    features: ["1 publicación de avión", "Pago único, sin débito automático"],
    sortOrder: 90,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL: cargala en el .env o exportala en la terminal.");
  if (!process.env.RUNTIME_DATABASE_URL) throw new Error("Falta RUNTIME_DATABASE_URL (la usa lib/prisma.ts): cargala en el .env o exportala en la terminal.");
  const url = new URL(process.env.DATABASE_URL);
  const local = url.hostname === "localhost" && url.pathname === "/va_dev";
  if (!local && !process.argv.includes("--confirm-production")) throw new Error(`Base ${url.hostname}${url.pathname}: no es la local. Agregá --confirm-production.`);
  console.log(`Base: ${url.hostname}${url.pathname} · ${APPLY ? "APLICANDO" : "solo informe (sin --apply)"}\n`);

  const records = PLANS.map((p) => planRecordFromInput(planInputSchema.parse(p)));
  const names = records.map((r) => r.name);

  const others = await prisma.plan.findMany({
    where: { name: { notIn: names } },
    select: { id: true, name: true, _count: { select: { purchases: true } }, subscriptions: { select: { id: true, userId: true, source: true, user: { select: { email: true } } } } },
  });
  const paid = others.flatMap((p) => p.subscriptions.filter((s) => s.source !== "MANUAL").map((s) => `${p.name}: ${s.user.email}`));
  if (paid.length) throw new Error(`Hay suscripciones pagas en planes que se borran (resolver a mano):\n${paid.join("\n")}`);

  for (const r of records) {
    const existing = await prisma.plan.findFirst({ where: { name: r.name }, select: { id: true } });
    console.log(`${existing ? "Actualizar" : "Crear"}: ${r.name} · AR$ ${r.price} ${r.type === "SUBSCRIPTION" ? "por mes" : "pago único"}`);
    if (APPLY) {
      if (existing) await prisma.plan.update({ where: { id: existing.id }, data: { ...r, archivedAt: null } });
      else await prisma.plan.create({ data: r });
    }
  }

  const courtesy = others.flatMap((p) => p.subscriptions.map((s) => ({ ...s, from: p.name })));
  for (const s of courtesy) console.log(`Cortesía → ${VA}: ${s.user.email} (estaba en ${s.from})`);
  if (APPLY && courtesy.length) {
    const va = await prisma.plan.findFirstOrThrow({ where: { name: VA }, select: { id: true, featuredPerMonth: true } });
    for (const s of courtesy) {
      await prisma.subscription.update({ where: { id: s.id }, data: { planId: va.id, featuredCredits: va.featuredPerMonth } });
      await syncListingExpiry(s.userId);
    }
  }

  for (const p of others) {
    const action = p._count.purchases > 0 ? `archivar (tiene ${p._count.purchases} compras)` : "borrar";
    console.log(`${action[0].toUpperCase()}${action.slice(1)}: ${p.name}`);
    if (!APPLY) continue;
    if (p._count.purchases > 0) await prisma.plan.update({ where: { id: p.id }, data: { archivedAt: new Date(), isActive: false } });
    else await prisma.plan.delete({ where: { id: p.id } });
  }

  if (APPLY) {
    const final = await prisma.plan.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { name: true, price: true, isActive: true, _count: { select: { subscriptions: true } } } });
    console.log("\nPlanes vigentes:");
    console.table(final.map((p) => ({ plan: p.name, precio: Number(p.price), activo: p.isActive, suscripciones: p._count.subscriptions })));
    console.log("\n/plans tiene caché de 1 hora: para verlo ya, abrí un plan en /admin/plans y tocá Guardar.");
  }
  await prisma.$disconnect();
}
main().catch(async (e) => {
  console.error(e.message ?? e);
  await prisma.$disconnect();
  process.exit(1);
});
