// VA-168: verifica las destacadas por plan (lib/featured.ts) con cuentas de prueba en va_dev: el orden por
// defecto pone primero los avisos de cuentas con destacadas (aunque sean más viejos), ordenar por precio
// no los adelanta y la paginación no repite ni saltea avisos. Crea y borra todo. Solo contra la base local.
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/verify-featured.ts
import { prisma } from "@/lib/prisma";
import { featuredFirstPage, loadFeaturedSellerIds } from "@/lib/featured";

const url = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

const TAG = `featured-test-${Date.now()}`;
const results: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
function check(caso: string, esperado: unknown, obtenido: unknown) {
  const e = JSON.stringify(esperado);
  const o = JSON.stringify(obtenido);
  results.push({ caso, esperado: e, obtenido: o, ok: e === o });
}
const userIds: string[] = [];

async function main() {
  const categoryId = (await prisma.aircraftCategory.findFirstOrThrow({ where: { id: "MP" } })).id;
  const pro = await prisma.plan.findFirstOrThrow({ where: { tier: "PRO", archivedAt: null } });
  const now = Date.now();
  const mk = async (name: string) => {
    const u = await prisma.user.create({ data: { name, email: `${TAG}-${name}@test.local` } });
    userIds.push(u.id);
    return u.id;
  };
  const base = await mk("base");
  const proUser = await mk("pro");
  await prisma.subscription.create({ data: { userId: proUser, planId: pro.id, status: "ACTIVE", source: "MANUAL", currentPeriodStart: new Date(), currentPeriodEnd: new Date(now + 30 * 86_400_000) } });
  // 3 avisos Base nuevos y 2 Pro viejos, con precios para ordenar.
  const ad = async (sellerId: string, daysAgo: number, price: number) =>
    (await prisma.aircraft.create({
      data: { sellerId, title: TAG, city: "Córdoba", province: "Córdoba", description: "prueba", status: "ACTIVE", year: 2000, categoryId, price, createdAt: new Date(now - daysAgo * 86_400_000), lastPublishedAt: new Date(now - daysAgo * 86_400_000) },
      select: { id: true },
    })).id;
  const b1 = await ad(base, 1, 100), b2 = await ad(base, 2, 300), b3 = await ad(base, 3, 500);
  const p1 = await ad(proUser, 50, 200), p2 = await ad(proUser, 60, 400);

  const featuredIds = await loadFeaturedSellerIds();
  check("1. La cuenta Pro tiene destacadas; la Base no", [true, false], [featuredIds.includes(proUser), featuredIds.includes(base)]);

  const where = { title: TAG, status: "ACTIVE" as const };
  const page = (orderBy: object, skip: number, take: number, ids = featuredIds) =>
    featuredFirstPage(
      ids,
      skip,
      take,
      (sellerId, s, t) => prisma.aircraft.findMany({ where: { ...where, sellerId }, orderBy, skip: s, take: t, select: { id: true } }).then((r) => r.map((x) => x.id)),
      () => prisma.aircraft.count({ where: { ...where, sellerId: { in: ids } } })
    );
  const recent = { lastPublishedAt: "desc" };
  check("2. Por defecto: primero los Pro (aunque sean viejos)", [p1, p2, b1, b2, b3], await page(recent, 0, 10));
  check("3. Paginado de a 2: sin repetir ni saltear", [p1, p2, b1, b2, b3], [...(await page(recent, 0, 2)), ...(await page(recent, 2, 2)), ...(await page(recent, 4, 2))]);
  check("3. Página que cruza los dos grupos", [p2, b1], await page(recent, 1, 2));
  // Ordenar por precio: /aircraft no usa featuredFirstPage (featuredIds vacío) → orden puro.
  check("4. Por precio no se adelantan", [b1, p1, b2, p2, b3], await page({ price: "asc" }, 0, 10, []));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.aircraft.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.table(results.map((r) => ({ caso: r.caso, "": r.ok ? "✓" : "✗", obtenido: r.ok ? "" : r.obtenido })));
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} de ${results.length} fallaron` : `${results.length}/${results.length} bien`);
    if (failed) process.exitCode = 1;
    await prisma.$disconnect();
  });
