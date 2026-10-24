// VA-167: verifica republicar (lib/republish.ts) con cuentas de prueba en va_dev. Crea usuarios y avisos
// temporales, prueba los casos de aceptación de la spec y borra todo al final. Solo contra la base local.
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/verify-republish.ts
import { prisma } from "@/lib/prisma";
import { getRepublishStatus, hasRepublishAvailable, periodStart, republishAll, republishListing } from "@/lib/republish";

const url = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

const TAG = `republish-test-${Date.now()}`;
const DAY = 86_400_000;
const results: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
function check(caso: string, esperado: unknown, obtenido: unknown) {
  const e = JSON.stringify(esperado);
  const o = JSON.stringify(obtenido);
  results.push({ caso, esperado: e, obtenido: o, ok: e === o });
}
const userIds: string[] = [];
let aircraftCategory = "";
let partCategory = "";

async function user(name: string, opts: { isAdmin?: boolean; createdAt?: Date } = {}) {
  const u = await prisma.user.create({ data: { name, email: `${TAG}-${name}@test.local`, isAdmin: !!opts.isAdmin, createdAt: opts.createdAt } });
  userIds.push(u.id);
  return u.id;
}
async function aircraft(sellerId: string, createdAt: Date) {
  const a = await prisma.aircraft.create({
    data: { sellerId, title: `${TAG} avión`, city: "Córdoba", province: "Córdoba", description: "prueba", status: "ACTIVE", year: 2000, categoryId: aircraftCategory, createdAt, lastPublishedAt: createdAt },
    select: { id: true },
  });
  return a.id;
}
async function part(sellerId: string, createdAt: Date) {
  const p = await prisma.sparePart.create({
    data: { sellerId, title: `${TAG} repuesto`, city: "Córdoba", province: "Córdoba", description: "prueba", status: "ACTIVE", categoryId: partCategory, createdAt, lastPublishedAt: createdAt },
    select: { id: true },
  });
  return p.id;
}
/** El primero de "Más recientes" (igual que /aircraft). */
async function firstRecent() {
  return (await prisma.aircraft.findFirst({ where: { status: "ACTIVE" }, orderBy: { lastPublishedAt: "desc" }, select: { id: true } }))?.id;
}

async function main() {
  aircraftCategory = (await prisma.aircraftCategory.findFirstOrThrow({ where: { id: "MP" } })).id;
  partCategory = (await prisma.category.findFirstOrThrow({ where: { children: { none: {} } } })).id;
  const now = new Date();
  const old = new Date(now.getTime() - 200 * DAY);

  // 1. Base: 2 por año; la 3.ª no.
  const base = await user("base", { createdAt: new Date(now.getTime() - 30 * DAY) });
  const a1 = await aircraft(base, old);
  const p1 = await part(base, old);
  const p2 = await part(base, old);
  const s0 = await getRepublishStatus(base);
  check("1. Base: saldo inicial", { mode: "COUNT", remaining: 2 }, { mode: s0.mode, remaining: s0.mode === "COUNT" ? s0.remaining : null });
  check("1. Base: hay disponibles (punto y cartel)", true, hasRepublishAvailable(s0));
  check("1. Base: 1.ª republicación", true, (await republishListing(base, "AIRCRAFT", a1)).ok);
  check("2. El republicado queda primero en Más recientes", a1, await firstRecent());
  const again = await republishListing(base, "AIRCRAFT", a1);
  check("3. Mismo aviso antes de 7 días: no", false, again.ok);
  const sw = await getRepublishStatus(base);
  const wait = sw.mode === "COUNT" ? sw.waiting[a1] : undefined;
  check("3. VA-178: el republicado figura en espera 7 días (el detalle oculta la franja)", 7, wait ? Math.round((wait.getTime() - Date.now()) / DAY) : null);
  check("3. VA-178: otro aviso no está en espera", undefined, sw.mode === "COUNT" ? sw.waiting[p1] : "?");
  check("1. Base: 2.ª republicación (otro aviso)", true, (await republishListing(base, "SPARE_PART", p1)).ok);
  const third = await republishListing(base, "SPARE_PART", p2);
  check("1. Base: la 3.ª no", false, third.ok);
  const s1 = await getRepublishStatus(base);
  check("1. Base: sin saldo, sin cartel", false, hasRepublishAvailable(s1));

  // 4. Al cumplirse el año se reponen (y no se acumulan): las republicaciones del año anterior no cuentan.
  const anchor = new Date(now.getTime() - 400 * DAY);
  const start = periodStart(anchor, now);
  check("4. Año en curso: empieza en el último aniversario", true, start <= now && start > new Date(now.getTime() - 366 * DAY));
  const veteran = await user("veterana", { createdAt: anchor });
  const v1 = await aircraft(veteran, old);
  await prisma.republication.createMany({ data: [0, 1].map(() => ({ userId: veteran, aircraftId: v1, createdAt: new Date(start.getTime() - DAY) })) });
  const sv = await getRepublishStatus(veteran);
  check("4. Año nuevo: se reponen 2 (no 4)", 2, sv.mode === "COUNT" ? sv.remaining : null);

  // 5. Pausar y reactivar no republica.
  const before = (await prisma.aircraft.findUniqueOrThrow({ where: { id: v1 }, select: { lastPublishedAt: true } })).lastPublishedAt;
  await prisma.aircraft.update({ where: { id: v1 }, data: { status: "PAUSED" } });
  await prisma.aircraft.update({ where: { id: v1 }, data: { status: "ACTIVE" } });
  const after = (await prisma.aircraft.findUniqueOrThrow({ where: { id: v1 }, select: { lastPublishedAt: true } })).lastPublishedAt;
  check("5. Pausar y reactivar no cambia el orden", before.toISOString(), after.toISOString());
  await prisma.aircraft.update({ where: { id: v1 }, data: { status: "PAUSED" } });
  check("5. Un pausado no se republica", false, (await republishListing(veteran, "AIRCRAFT", v1)).ok);

  // 6. Admin (como el Broker): "Republicar todas" y el botón se bloquea 30 días.
  const admin = await user("admin", { isAdmin: true });
  const ad1 = await aircraft(admin, old);
  await part(admin, old);
  const sa = await getRepublishStatus(admin);
  check("6. Admin: modo Republicar todas", { mode: "ALL", available: true }, { mode: sa.mode, available: hasRepublishAvailable(sa) });
  check("6. Admin: aviso por aviso, no", false, (await republishListing(admin, "AIRCRAFT", ad1)).ok);
  const all = await republishAll(admin);
  check("6. Republicar todas: 2 avisos", { ok: true, republished: 2 }, all);
  check("6. Primero en Más recientes", ad1, await firstRecent());
  const blocked = await republishAll(admin);
  check("6. Se bloquea 30 días", false, blocked.ok);
  const sb = await getRepublishStatus(admin);
  const days = sb.mode === "ALL" && sb.availableAt ? Math.round((sb.availableAt.getTime() - now.getTime()) / DAY) : null;
  check("6. Disponible de nuevo en 30 días", 30, days);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.republication.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.aircraft.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.sparePart.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.table(results.map((r) => ({ caso: r.caso, esperado: r.esperado, obtenido: r.obtenido, "": r.ok ? "✓" : "✗" })));
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} de ${results.length} fallaron` : `${results.length}/${results.length} bien`);
    if (failed) process.exitCode = 1;
    await prisma.$disconnect();
  });
