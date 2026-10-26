// VA-171: verifica las secciones del nivel completo de métricas (Broker) con datos de prueba en va_dev:
// fuentes (solo con cookies aceptadas), provincias, comparador, clics desde la Página VA y efecto de una
// republicación. Crea y borra todo. Solo contra la base local.
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/verify-metrics-full.ts
import { prisma } from "@/lib/prisma";
import { computeSellerMetrics } from "@/lib/seller-metrics";

const url = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

const TAG = `metrics-full-${Date.now()}`;
const DAY = 86_400_000;
const results: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
function check(caso: string, esperado: unknown, obtenido: unknown) {
  const e = JSON.stringify(esperado);
  const o = JSON.stringify(obtenido);
  results.push({ caso, esperado: e, obtenido: o, ok: e === o });
}
const userIds: string[] = [];

async function main() {
  const now = Date.now();
  const seller = await prisma.user.create({ data: { name: "broker", email: `${TAG}-broker@test.local` } });
  userIds.push(seller.id);
  const categoryId = (await prisma.aircraftCategory.findFirstOrThrow({ where: { id: "MP" } })).id;
  const a = await prisma.aircraft.create({
    data: { sellerId: seller.id, title: `${TAG} avión`, city: "Córdoba", province: "Córdoba", description: "prueba", status: "ACTIVE", year: 2000, categoryId },
  });
  const at = (daysAgo: number) => new Date(now - daysAgo * DAY);
  const view = (daysAgo: number, extra: object = {}) => ({ eventType: "AIRCRAFT_VIEW" as const, aircraftId: a.id, createdAt: at(daysAgo), ...extra });
  await prisma.analyticsEvent.createMany({
    data: [
      // Fuentes (con cookies aceptadas = anonymousId): 2 Google, 1 Instagram, 1 WhatsApp, 1 directo.
      view(1, { anonymousId: "x1", referrer: "https://www.google.com/" }),
      view(1, { anonymousId: "x2", utmSource: "google" }),
      view(2, { anonymousId: "x3", referrer: "https://l.instagram.com/" }),
      view(2, { anonymousId: "x4", referrer: "https://wa.me/" }),
      view(3, { anonymousId: "x5" }),
      // Sin cookies aceptadas: no entra en fuentes, sí en provincias.
      view(3, { region: "X" }),
      view(4, { region: "X" }),
      view(4, { region: "B" }),
      // Comparador y clics desde la Página VA.
      { eventType: "COMPARE_ADD", aircraftId: a.id, createdAt: at(2) },
      { eventType: "COMPARE_ADD", aircraftId: a.id, createdAt: at(3) },
      { eventType: "PROFILE_LISTING_CLICK", aircraftId: a.id, profileUserId: seller.id, createdAt: at(2) },
      // Republicación hace 10 días: 1 vista en los 7 días antes y 4 en los 7 después (las de hace 9, 8 y 4 días).
      view(12),
      view(9),
      view(8),
    ],
  });
  await prisma.republication.create({ data: { userId: seller.id, aircraftId: a.id, createdAt: at(10) } });

  const m = await computeSellerMetrics(seller.id, 30, now, true);
  const f = m.full!;
  check("1. Hay bloque completo", true, !!m.full);
  check("2. Fuentes (solo con cookies)", { SEARCH: 2, SOCIAL: 1, WHATSAPP: 1, DIRECT: 1, OTHER: 0 }, Object.fromEntries(f.sources.map((x) => [x.key, x.count])));
  check("2. Base de las fuentes", 5, f.sourcesBase);
  check("3. Provincias", [{ code: "X", count: 2 }, { code: "B", count: 1 }], f.regions);
  check("4. Comparador del aviso", 2, m.listings.find((l) => l.id === a.id)?.compares);
  check("5. Clics desde la Página VA", 1, f.profileListingClicks.current);
  check("6. Republicación: vistas antes → después", { before: 1, after: 4 }, { before: f.republish.items[0]?.before, after: f.republish.items[0]?.after });
  const pro = await computeSellerMetrics(seller.id, 30, now, false);
  check("7. Nivel Pro: sin bloque completo", false, !!pro.full);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.republication.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.analyticsEvent.deleteMany({ where: { OR: [{ aircraft: { sellerId: { in: userIds } } }, { profileUserId: { in: userIds } }] } });
    await prisma.aircraft.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.table(results.map((r) => ({ caso: r.caso, "": r.ok ? "✓" : "✗", obtenido: r.ok ? "" : r.obtenido })));
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} de ${results.length} fallaron` : `${results.length}/${results.length} bien`);
    if (failed) process.exitCode = 1;
    await prisma.$disconnect();
  });
