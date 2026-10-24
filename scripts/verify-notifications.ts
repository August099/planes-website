// VA-179: notificaciones del perfil. Datos faltantes, moderación (cartel, ventana y "Pedir revisión") y
// republicaciones, con cuentas temporales en va_dev; borra todo al final. El punto de preguntas sin responder
// y el refresco del header se prueban en el navegador (usan la caché de Next).
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/verify-notifications.ts
import { prisma } from "@/lib/prisma";
import { missingProfileFields } from "@/lib/account-data";
import { acknowledgeNotice, moderationInfoFor, ownerNotice, pauseListing, requestReview, resolveReview } from "@/lib/moderation";
import { getRepublishStatus, hasRepublishAvailable, republishListing } from "@/lib/republish";

const url = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

const TAG = `notif-test-${Date.now()}`;
const DAY = 86_400_000;
const results: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
function check(caso: string, esperado: unknown, obtenido: unknown) {
  const e = JSON.stringify(esperado);
  const o = JSON.stringify(obtenido);
  results.push({ caso, esperado: e, obtenido: o, ok: e === o });
}
const userIds: string[] = [];

async function user(name: string, data: { isAdmin?: boolean; phone?: string | null; city?: string | null; createdAt?: Date } = {}) {
  const u = await prisma.user.create({
    data: { name, email: `${TAG}-${name}@test.local`, isAdmin: !!data.isAdmin, phone: data.phone ?? null, city: data.city ?? null, province: data.city ?? null, emailVerified: new Date(), passwordHash: "x", createdAt: data.createdAt },
  });
  userIds.push(u.id);
  return u.id;
}

async function main() {
  const categoryId = (await prisma.aircraftCategory.findFirstOrThrow({ where: { id: "MP" } })).id;
  const now = new Date();

  // 1. Datos faltantes: se apagan apenas se completan (sin caché).
  const owner = await user("owner", { createdAt: new Date(now.getTime() - 30 * DAY) });
  check("1. Sin teléfono ni ciudad: cartel", ["phone", "city", "province"], await missingProfileFields(owner));
  await prisma.user.update({ where: { id: owner }, data: { phone: "5493510000000", city: "Córdoba", province: "Córdoba" } });
  check("1. Completos: sin cartel en el momento", [], await missingProfileFields(owner));
  await prisma.user.update({ where: { id: owner }, data: { emailVerified: null } });
  check("1. Email sin verificar: cartel", ["emailVerified"], await missingProfileFields(owner));
  await prisma.user.update({ where: { id: owner }, data: { emailVerified: new Date() } });
  check("1. Email verificado (link o reset): sin cartel en el momento", [], await missingProfileFields(owner));

  // 2. Moderación: pausa → cartel con motivo y ventana; cerrar la ventana; pedir revisión; reactivar.
  const admin = await user("admin", { isAdmin: true });
  const listing = await prisma.aircraft.create({
    data: { sellerId: owner, title: `${TAG} avión`, city: "Córdoba", province: "Córdoba", description: "prueba", status: "ACTIVE", year: 2000, categoryId },
    select: { id: true },
  });
  const item = [{ kind: "AIRCRAFT" as const, id: listing.id }];
  check("2. Pausa del admin: ok", true, (await pauseListing({ kind: "AIRCRAFT", id: listing.id, reason: "Fotos de otro avión", adminId: admin })).ok);
  check("2. Mis publicaciones: \"Pausado por moderación\" con el motivo", { reason: "Fotos de otro avión", reviewRequested: false }, (await moderationInfoFor(item))[listing.id]);
  const n1 = await ownerNotice(owner);
  check("2. Ventana al dueño: pausa", "PAUSE", n1?.action);
  await acknowledgeNotice(owner, n1!.actionId);
  check("2. Ventana cerrada: no vuelve", null, await ownerNotice(owner));
  check("2. Pedir revisión: ok", true, (await requestReview({ kind: "AIRCRAFT", id: listing.id, userId: owner })).ok);
  check("2. Botón pasa a \"Revisión pedida\" (motivo sigue)", { reason: "Fotos de otro avión", reviewRequested: true }, (await moderationInfoFor(item))[listing.id]);
  check("2. Admin reactiva: ok", true, (await resolveReview({ kind: "AIRCRAFT", id: listing.id, adminId: admin, decision: "REACTIVATE" })).ok);
  const after = await prisma.aircraft.findUniqueOrThrow({ where: { id: listing.id }, select: { status: true } });
  check("2. Reactivado: sale de moderación", { status: "ACTIVE", info: { reason: null, reviewRequested: false } }, { status: after.status, info: (await moderationInfoFor(item))[listing.id] });
  check("2. Ventana al dueño: reactivado", "REACTIVATE", (await ownerNotice(owner))?.action);

  // 3. Republicaciones: el punto y el cartel se apagan sin saldo; el aviso republicado queda en espera.
  const s0 = await getRepublishStatus(owner);
  check("3. Con saldo: punto y cartel", true, hasRepublishAvailable(s0));
  await republishListing(owner, "AIRCRAFT", listing.id);
  const s1 = await getRepublishStatus(owner);
  check("3. Después de republicar: el aviso en espera", true, s1.mode === "COUNT" && !!s1.waiting[listing.id]);
  const second = await prisma.aircraft.create({
    data: { sellerId: owner, title: `${TAG} avión 2`, city: "Córdoba", province: "Córdoba", description: "prueba", status: "ACTIVE", year: 2000, categoryId },
    select: { id: true },
  });
  await republishListing(owner, "AIRCRAFT", second.id);
  check("3. Sin saldo: se apagan el punto y el cartel", false, hasRepublishAvailable(await getRepublishStatus(owner)));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.republication.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.moderationAction.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.aircraft.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.table(results.map((r) => ({ caso: r.caso, esperado: r.esperado, obtenido: r.obtenido, "": r.ok ? "✓" : "✗" })));
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} de ${results.length} fallaron` : `${results.length}/${results.length} bien`);
    if (failed) process.exitCode = 1;
    await prisma.$disconnect();
  });
