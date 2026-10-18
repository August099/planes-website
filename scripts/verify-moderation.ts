// VA-154: verifica la pausa por moderación con datos temporales en va_dev (los borra al final). Los
// mails a Resend se interceptan: no se manda nada, solo se cuentan.
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/verify-moderation.ts
const sentMails: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("api.resend.com")) {
    sentMails.push(JSON.parse(String(init?.body ?? "{}")).subject ?? "");
    return new Response(JSON.stringify({ id: "test" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(input, init);
}) as typeof fetch;

import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { getQuotaUsage } from "@/lib/quota";
import { acknowledgeNotice, ownerNotice, pauseListing, pendingReviews, requestReview, resolveReview, moderationInfoFor } from "@/lib/moderation";

const url = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

const TAG = `mod-test-${Date.now()}`;
const rows: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
const check = (caso: string, esperado: unknown, obtenido: unknown) => {
  const e = JSON.stringify(esperado);
  const o = JSON.stringify(obtenido);
  rows.push({ caso, esperado: e, obtenido: o, ok: e === o });
};
const users: string[] = [];

async function main() {
  const owner = await prisma.user.create({ data: { email: `${TAG}-owner@ventasaeronauticas.test`, name: "Dueño moderación" } });
  const admin = await prisma.user.create({ data: { email: `${TAG}-admin@ventasaeronauticas.test`, name: "Admin moderación", isAdmin: true } });
  users.push(owner.id, admin.id);
  const base = { sellerId: owner.id, city: "Córdoba", province: "Córdoba", description: "prueba", categoryId: "MP", year: 2000, listingStartsAt: new Date() };
  const a1 = await prisma.aircraft.create({ data: { ...base, title: `${TAG} reportado`, status: "ACTIVE" } });
  const report = await prisma.report.create({ data: { aircraftId: a1.id, reason: "Datos falsos" } });

  // Pausar desde el reporte
  check("Motivo obligatorio", false, (await pauseListing({ kind: "AIRCRAFT", id: a1.id, reason: " ", adminId: admin.id })).ok);
  check("Pausar indefinidamente", true, (await pauseListing({ kind: "AIRCRAFT", id: a1.id, reason: "Las fotos no son del avión", adminId: admin.id, reportId: report.id })).ok);
  const after = await prisma.aircraft.findUniqueOrThrow({ where: { id: a1.id }, select: { status: true } });
  check("Estado MODERATED", "MODERATED", after.status);
  check("El reporte queda revisado", "REVIEWED", (await prisma.report.findUniqueOrThrow({ where: { id: report.id } })).status);
  check("No se ve en los listados", 0, await prisma.aircraft.count({ where: { id: a1.id, ...activeListingWhere() } }));
  check("No cuenta en el cupo", 0, (await getQuotaUsage(owner.id)).used.AIRCRAFT);
  check("Mail al dueño (pausa)", true, sentMails.some((s) => s.startsWith("Pausamos tu aviso")));

  // Ventana del dueño
  const n1 = await ownerNotice(owner.id);
  check("Ventana: sale la pausa con el motivo", ["PAUSE", "Las fotos no son del avión"], [n1?.action, n1?.message]);
  check("Ventana: vuelve si no la cierra", "PAUSE", (await ownerNotice(owner.id))?.action);
  await acknowledgeNotice(owner.id, n1!.actionId);
  check("Ventana: una vez cerrada no vuelve", null, await ownerNotice(owner.id));

  // Pedir revisión
  check("Motivo en Mis publicaciones", { reason: "Las fotos no son del avión", reviewRequested: false }, (await moderationInfoFor([{ kind: "AIRCRAFT", id: a1.id }]))[a1.id]);
  check("Otro usuario no puede pedir revisión", false, (await requestReview({ kind: "AIRCRAFT", id: a1.id, userId: admin.id })).ok);
  check("El dueño pide revisión", true, (await requestReview({ kind: "AIRCRAFT", id: a1.id, userId: owner.id, message: "Cambié las fotos" })).ok);
  check("No se pide dos veces", false, (await requestReview({ kind: "AIRCRAFT", id: a1.id, userId: owner.id })).ok);
  const queue = await pendingReviews();
  check("Aparece en Revisiones pendientes", true, queue.some((q) => q.id === a1.id));
  check("Historial: pausa y pedido", ["PAUSE", "REVIEW_REQUESTED"], queue.find((q) => q.id === a1.id)?.history.map((h) => h.action));

  // Mantener pausado
  check("Mantener pausado pide mensaje", false, (await resolveReview({ kind: "AIRCRAFT", id: a1.id, adminId: admin.id, decision: "KEEP_PAUSED" })).ok);
  check("Mantener pausado", true, (await resolveReview({ kind: "AIRCRAFT", id: a1.id, adminId: admin.id, decision: "KEEP_PAUSED", message: "Falta la matrícula en las fotos" })).ok);
  check("Sigue MODERATED", "MODERATED", (await prisma.aircraft.findUniqueOrThrow({ where: { id: a1.id } })).status);
  check("Sale de la cola", false, (await pendingReviews()).some((q) => q.id === a1.id));
  check("Ventana con el mensaje nuevo", ["KEEP_PAUSED", "Falta la matrícula en las fotos"], await ownerNotice(owner.id).then((n) => [n?.action, n?.message]));

  // Reactivar sin cupo → pausado común; con cupo → activo
  await requestReview({ kind: "AIRCRAFT", id: a1.id, userId: owner.id });
  const other = await prisma.aircraft.create({ data: { ...base, title: `${TAG} otro activo`, status: "ACTIVE" } });
  check("Reactivar", true, (await resolveReview({ kind: "AIRCRAFT", id: a1.id, adminId: admin.id, decision: "REACTIVATE" })).ok);
  check("Sin cupo queda pausado común", "PAUSED", (await prisma.aircraft.findUniqueOrThrow({ where: { id: a1.id } })).status);
  const n3 = await ownerNotice(owner.id);
  check("Ventana: reactivado (pausado por cupo)", ["REACTIVATE", "PAUSED"], [n3?.action, n3?.listingStatus]);

  const a2 = await prisma.aircraft.create({ data: { ...base, title: `${TAG} segundo reportado`, status: "ACTIVE" } });
  await prisma.aircraft.update({ where: { id: other.id }, data: { status: "SOLD" } });
  await prisma.aircraft.update({ where: { id: a2.id }, data: { status: "PAUSED" } });
  await pauseListing({ kind: "AIRCRAFT", id: a2.id, reason: "Precio engañoso", adminId: admin.id });
  await requestReview({ kind: "AIRCRAFT", id: a2.id, userId: owner.id });
  await resolveReview({ kind: "AIRCRAFT", id: a2.id, adminId: admin.id, decision: "REACTIVATE", message: "Gracias por corregirlo" });
  check("Con cupo vuelve a activo", "ACTIVE", (await prisma.aircraft.findUniqueOrThrow({ where: { id: a2.id } })).status);
  check("Mails mandados (3 pausas/respuestas + 2 reactivaciones)", 5, sentMails.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.moderationAction.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.report.deleteMany({ where: { aircraft: { sellerId: { in: users } } } });
    await prisma.aircraft.deleteMany({ where: { sellerId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    console.table(rows.map((r) => ({ caso: r.caso, esperado: r.esperado, obtenido: r.obtenido, "": r.ok ? "✓" : "✗" })));
    const failed = rows.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} de ${rows.length} fallaron` : `${rows.length}/${rows.length} bien`);
    if (failed) process.exitCode = 1;
    await prisma.$disconnect();
  });
