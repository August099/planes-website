// VA-105 · 6.4: informe de datos de prueba antes del pase a producción. SOLO LEE: no borra nada.
// Lo que haya que borrar se decide con el socio y se hace aparte.
//
// Uso: npx tsx --require ./scripts/stub-server-only.cjs scripts/prod-cleanup-report.ts
// (contra la base que tenga DATABASE_URL; en producción lo corre el socio).
import { prisma } from "@/lib/prisma";

const TEST_EMAIL = [
  { email: { endsWith: "@ventasaeronauticas.test" } },
  { email: { endsWith: "@resend.dev" } },
  { email: { contains: "+test" } },
  { email: { equals: "augusto@gmail.com" } },
];

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  console.log(`Base: ${url.hostname}${url.pathname} · solo lectura\n`);

  const [testPayments, pendingPurchases, webhookEvents, invoices] = await Promise.all([
    prisma.payment.count({ where: { isTest: true } }),
    prisma.purchase.count({ where: { activatedAt: null } }),
    prisma.webhookEvent.groupBy({ by: ["status"], _count: true }),
    prisma.invoice.groupBy({ by: ["status"], _count: true }),
  ]);
  console.log("Pagos y facturas");
  console.table([
    { qué: "Pagos marcados como prueba (isTest)", cantidad: testPayments },
    { qué: "Compras nunca activadas (pendientes, rechazadas o abandonadas)", cantidad: pendingPurchases },
    ...webhookEvents.map((w) => ({ qué: `Eventos del webhook ${w.status}`, cantidad: w._count })),
    ...invoices.map((i) => ({ qué: `Facturas ${i.status}`, cantidad: i._count })),
  ]);

  const [testAircraft, testParts] = await Promise.all([
    prisma.aircraft.findMany({ where: { title: { startsWith: "Prueba", mode: "insensitive" } }, select: { id: true, title: true, seller: { select: { email: true } } } }),
    prisma.sparePart.findMany({ where: { title: { startsWith: "Prueba", mode: "insensitive" } }, select: { id: true, title: true, seller: { select: { email: true } } } }),
  ]);
  console.log(`\nAvisos "Prueba…": ${testAircraft.length} aviones, ${testParts.length} repuestos`);
  console.table([...testAircraft, ...testParts].slice(0, 50).map((l) => ({ id: l.id, título: l.title, vendedor: l.seller.email })));

  const testUsers = await prisma.user.findMany({
    where: { OR: TEST_EMAIL },
    select: { id: true, email: true, isAdmin: true, _count: { select: { aircrafts: true, spareParts: true, purchases: true } } },
  });
  console.log(`\nUsuarios de prueba: ${testUsers.length}`);
  console.table(testUsers.map((u) => ({ email: u.email, admin: u.isAdmin, aviones: u._count.aircrafts, repuestos: u._count.spareParts, compras: u._count.purchases })));


  const plans = await prisma.plan.findMany({ select: { name: true, isActive: true, archivedAt: true, _count: { select: { purchases: true, subscriptions: true } } }, orderBy: { sortOrder: "asc" } });
  console.log("\nPlanes (scripts/seed-real-plans.ts deja solo Plan Repuestos, Plan Aviones y Suscripción VA)");
  console.table(plans.map((p) => ({ plan: p.name, activo: p.isActive, archivado: !!p.archivedAt, compras: p._count.purchases, suscripciones: p._count.subscriptions })));

  await prisma.$disconnect();
}
main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
