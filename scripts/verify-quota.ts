// VA-152 / VA-166: verifica la regla del cupo (lib/quota.ts) con cuentas de prueba en va_dev. Crea usuarios y
// avisos temporales, prueba los casos de la spec y borra todo al final. Solo contra la base local.
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/verify-quota.ts
import { prisma } from "@/lib/prisma";
import { enforceQuota, excessFor, getQuotaUsage, limitsWithoutPlan, lockAndCheckRoom, type QuotaKind } from "@/lib/quota";
import { hasCustomPage, hasSellerMetrics } from "@/lib/subscriptions";
import { endSubscriptionNow } from "@/lib/payments/subscription-reversal";

const url = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

const TAG = `quota-test-${Date.now()}`;
const results: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
function check(caso: string, esperado: unknown, obtenido: unknown) {
  const e = JSON.stringify(esperado);
  const o = JSON.stringify(obtenido);
  results.push({ caso, esperado: e, obtenido: o, ok: e === o });
}

let aircraftCategory = "";
let partCategory = "";
const userIds: string[] = [];

async function user(name: string, isAdmin = false) {
  const u = await prisma.user.create({ data: { name, email: `${TAG}-${name}@test.local`, isAdmin } });
  userIds.push(u.id);
  return u.id;
}

/** Igual que createListing: mira el cupo y crea en la misma transacción. */
async function publish(userId: string, kind: QuotaKind, opts: { saveAsPaused?: boolean } = {}) {
  return prisma.$transaction(async (tx) => {
    const room = await lockAndCheckRoom(tx, userId, kind);
    if (!room && !opts.saveAsPaused) return null;
    const data = { sellerId: userId, title: `${TAG} ${kind}`, city: "Córdoba", province: "Córdoba", description: "prueba", status: room ? ("ACTIVE" as const) : ("PAUSED" as const), listingStartsAt: room ? new Date() : null };
    if (kind === "AIRCRAFT") return (await tx.aircraft.create({ data: { ...data, year: 2000, categoryId: aircraftCategory }, select: { id: true, status: true } }));
    return (await tx.sparePart.create({ data: { ...data, categoryId: partCategory }, select: { id: true, status: true } }));
  });
}

/** Igual que setListingStatusAction al activar. */
async function activate(userId: string, kind: QuotaKind, id: string) {
  return prisma.$transaction(async (tx) => {
    if (!(await lockAndCheckRoom(tx, userId, kind))) return false;
    if (kind === "AIRCRAFT") await tx.aircraft.update({ where: { id }, data: { status: "ACTIVE" } });
    else await tx.sparePart.update({ where: { id }, data: { status: "ACTIVE" } });
    return true;
  });
}

async function subscribe(userId: string, planId: string) {
  const now = new Date();
  return prisma.subscription.create({
    data: { userId, planId, status: "ACTIVE", source: "MANUAL", currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000) },
    select: { id: true, userId: true, mpSubscriptionId: true, mpStatus: true },
  });
}

async function main() {
  aircraftCategory = (await prisma.aircraftCategory.findFirstOrThrow({ where: { id: "MP" } })).id;
  partCategory = (await prisma.category.findFirstOrThrow({ where: { children: { none: {} } } })).id;
  const pro = await prisma.plan.findFirstOrThrow({ where: { tier: "PRO", archivedAt: null } });
  const bizParts = await prisma.plan.findFirstOrThrow({ where: { tier: "BUSINESS", isUnlimitedAircraft: false, isUnlimitedSpareParts: true, archivedAt: null } });
  const free = await limitsWithoutPlan("-"); // usuario inexistente: cupo de Base

  // 1. Publicar sin cupo
  const a = await user("gratis");
  const first = await publish(a, "AIRCRAFT");
  check("1. Base: 1.er avión", "ACTIVE", first?.status);
  check("1. Base: 2.º avión sin elegir", null, await publish(a, "AIRCRAFT"));
  const parts = [];
  for (let i = 0; i < 3; i++) parts.push((await publish(a, "SPARE_PART"))?.status);
  check("1. Base: 3 repuestos", ["ACTIVE", "ACTIVE", "ACTIVE"], parts);
  check("1. Base: 4.º repuesto sin elegir", null, await publish(a, "SPARE_PART"));
  const saved = await publish(a, "AIRCRAFT", { saveAsPaused: true });
  check("1. Base: 2.º avión 'Guardar como pausado'", "PAUSED", saved?.status);

  // 2. Pausar libera cupo; activar sin cupo no
  check("2. Activar el pausado sin cupo", false, await activate(a, "AIRCRAFT", saved!.id));
  await prisma.aircraft.update({ where: { id: first!.id }, data: { status: "PAUSED" } });
  check("2. Pausar el activo libera: activar el otro", true, await activate(a, "AIRCRAFT", saved!.id));
  await prisma.aircraft.update({ where: { id: saved!.id }, data: { status: "SOLD" } });
  check("2. Vendido no cuenta", { AIRCRAFT: 0, SPARE_PART: 3 }, (await getQuotaUsage(a)).used);

  // 3. Pro: 3 / 15
  const b = await user("pro");
  const subB = await subscribe(b, pro.id);
  const usageB = await getQuotaUsage(b);
  check("3. Pro: cupo", { tier: "PRO", AIRCRAFT: 3, SPARE_PART: 10 }, { tier: usageB.tier, ...usageB.limits });
  const proAircraft = [];
  for (let i = 0; i < 4; i++) proAircraft.push((await publish(b, "AIRCRAFT"))?.status ?? null);
  check("3. Pro: 3 aviones y el 4.º no", ["ACTIVE", "ACTIVE", "ACTIVE", null], proAircraft);
  check("3. Pro con Página VA (banner) y métricas Pro (VA-166)", [true, true], [await hasCustomPage(b), await hasSellerMetrics(b)]);

  // 4 y 6. Baja del Pro (arrepentimiento o fin): se pausan los 2 más nuevos
  check("6. Arrepentimiento: avance de lo que se pausa", { AIRCRAFT: 2, SPARE_PART: 0 }, await excessFor(b, await limitsWithoutPlan(b)));
  const oldest = await prisma.aircraft.findFirstOrThrow({ where: { sellerId: b }, orderBy: { listingStartsAt: "asc" }, select: { id: true } });
  const paused = await endSubscriptionNow(subB);
  check("4. Baja del Pro: pausa 2 aviones", { AIRCRAFT: 2, SPARE_PART: 0 }, paused);
  const stillActive = await prisma.aircraft.findMany({ where: { sellerId: b, status: "ACTIVE" }, select: { id: true } });
  check("4. Queda activo el más viejo", [oldest.id], stillActive.map((x) => x.id));

  // 5. Broker "repuestos ilimitados": 40 repuestos y 1 avión (cupo de Base)
  const c = await user("empresa");
  await subscribe(c, bizParts.id);
  const usageC = await getQuotaUsage(c);
  check("5. Broker repuestos: cupo", { AIRCRAFT: free.AIRCRAFT, SPARE_PART: null }, usageC.limits);
  let ok = 0;
  for (let i = 0; i < 40; i++) if ((await publish(c, "SPARE_PART"))?.status === "ACTIVE") ok++;
  check("5. Broker: 40 repuestos activos", 40, ok);
  check("5. Broker: 1 avión y el 2.º no", ["ACTIVE", null], [(await publish(c, "AIRCRAFT"))?.status, (await publish(c, "AIRCRAFT"))?.status ?? null]);
  check("5. Broker con Página VA y métricas", [true, true], [await hasCustomPage(c), await hasSellerMetrics(c)]);

  // 7. Concurrencia: dos altas simultáneas con 1 lugar libre
  const d = await user("concurrencia");
  const both = await Promise.all([publish(d, "AIRCRAFT"), publish(d, "AIRCRAFT")]);
  check("7. Dos altas simultáneas: una sola activa", 1, both.filter((x) => x?.status === "ACTIVE").length);
  check("7. En la base: 1 avión activo", 1, await prisma.aircraft.count({ where: { sellerId: d, status: "ACTIVE" } }));

  // Admin (VA-174): Broker completo para siempre
  const e = await user("admin", true);
  const usageE = await getQuotaUsage(e);
  check("Admin: ilimitado", { tier: "ADMIN", AIRCRAFT: null, SPARE_PART: null }, { tier: usageE.tier, ...usageE.limits });
  check("Admin: Página VA y métricas", [true, true], [await hasCustomPage(e), await hasSellerMetrics(e)]);
  check("Admin: enforceQuota no pausa", { AIRCRAFT: 0, SPARE_PART: 0 }, await enforceQuota(e));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.aircraft.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.sparePart.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.table(results.map((r) => ({ caso: r.caso, esperado: r.esperado, obtenido: r.obtenido, "": r.ok ? "✓" : "✗" })));
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} de ${results.length} fallaron` : `${results.length}/${results.length} bien`);
    if (failed) process.exitCode = 1;
    await prisma.$disconnect();
  });
