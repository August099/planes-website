// VA-182: miembros fundadores con cuentas temporales en va_dev. Sube el límite lo justo para probar el tope
// con publicaciones simultáneas y al final deja el límite y los datos como estaban.
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/verify-founders.ts
import { prisma } from "@/lib/prisma";
import { claimFoundingMembership, FOUNDING_NOTE, foundingCount } from "@/lib/founders";
import { getAccountPlan } from "@/lib/plan-benefits";

const url = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

const TAG = `founders-test-${Date.now()}`;
const results: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
function check(caso: string, esperado: unknown, obtenido: unknown) {
  const e = JSON.stringify(esperado);
  const o = JSON.stringify(obtenido);
  results.push({ caso, esperado: e, obtenido: o, ok: e === o });
}
const userIds: string[] = [];
let originalLimit = 15;
let categoryId = "";

async function user(name: string, isAdmin = false) {
  const u = await prisma.user.create({ data: { name, email: `${TAG}-${name}@test.local`, isAdmin } });
  userIds.push(u.id);
  return u.id;
}
/** Publica un aviso activo y pide ser fundador en la misma transacción (como createListing). */
async function publish(userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.aircraft.create({ data: { sellerId: userId, title: `${TAG} avión`, city: "Córdoba", province: "Córdoba", description: "prueba", year: 2000, categoryId, status: "ACTIVE" } });
    return claimFoundingMembership(tx, userId);
  });
}

async function main() {
  categoryId = (await prisma.aircraftCategory.findFirstOrThrow({ where: { id: "MP" } })).id;
  const start = await foundingCount();
  originalLimit = start.limit;
  // Quedan 3 lugares.
  await prisma.quotaSettings.upsert({ where: { id: "default" }, create: { id: "default", foundingMembersLimit: start.count + 3 }, update: { foundingMembersLimit: start.count + 3 } });

  const admin = await user("admin", true);
  check("1. Un admin no es fundador", null, await publish(admin));

  const first = await user("primero");
  const grant = await publish(first);
  const months = grant ? Math.round((grant.until.getTime() - Date.now()) / (30.4 * 86_400_000)) : null;
  check("2. Primer aviso: fundador con 6 meses", 6, months);
  const sub = await prisma.subscription.findUnique({ where: { userId: first }, select: { source: true, note: true, plan: { select: { tier: true, isUnlimitedAircraft: true, isUnlimitedSpareParts: true } } } });
  check("2. Broker / Empresa todo ilimitado, sin cobro", { source: "MANUAL", note: FOUNDING_NOTE, tier: "BUSINESS", a: true, p: true }, { source: sub?.source, note: sub?.note, tier: sub?.plan.tier, a: sub?.plan.isUnlimitedAircraft, p: sub?.plan.isUnlimitedSpareParts });
  check("2. Su cuenta pasa a Broker", "BROKER", (await getAccountPlan(first)).kind);
  check("3. Segundo aviso: no vuelve a otorgar", null, await publish(first));

  const paying = await user("pagando");
  const plan = await prisma.plan.findFirstOrThrow({ where: { tier: "PRO" } });
  await prisma.subscription.create({ data: { userId: paying, planId: plan.id, status: "ACTIVE", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 20 * 86_400_000) } });
  check("4. Con una suscripción vigente: no se pisa", null, await publish(paying));

  // Quedan 2 lugares; publican 5 a la vez.
  const many = await Promise.all(["a", "b", "c", "d", "e"].map((n) => user(n)));
  const settled = await Promise.allSettled(many.map((id) => publish(id)));
  const granted = settled.filter((s) => s.status === "fulfilled" && s.value).length;
  check("5. Cinco a la vez con 2 lugares: 2 fundadores", 2, granted);
  check("5. Contador en el límite", { count: start.count + 3, limit: start.count + 3 }, await foundingCount());
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.quotaSettings.update({ where: { id: "default" }, data: { foundingMembersLimit: originalLimit } });
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.aircraft.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.table(results.map((r) => ({ caso: r.caso, esperado: r.esperado, obtenido: r.obtenido, "": r.ok ? "✓" : "✗" })));
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} de ${results.length} fallaron` : `${results.length}/${results.length} bien`);
    if (failed) process.exitCode = 1;
    await prisma.$disconnect();
  });
