// VA-181: arrepentimiento de suscripciones, de punta a punta en va_dev (sin Mercado Pago ni mails: se
// reemplazan). Crea cuentas, suscripciones y pagos temporales y borra todo al final.
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/verify-withdrawal.ts
import { prisma } from "@/lib/prisma";
import { requestWithdrawal, withdrawalPreview, withdrawalUntil } from "@/lib/payments/withdrawal";
import { isLaterSubscriptionCharge, revertSubscriptionCharge } from "@/lib/payments/subscription-reversal";
import { getAccountPlan } from "@/lib/plan-benefits";
import { getRepublishStatus } from "@/lib/republish";
import { loadFeaturedSellerIds } from "@/lib/featured";

const url = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

const TAG = `withdrawal-test-${Date.now()}`;
const DAY = 86_400_000;
const BROKER_ALL = "cmvdftp1h000390v7gajo331z"; // Broker / Empresa · Todo ilimitado (va_dev)
const results: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
function check(caso: string, esperado: unknown, obtenido: unknown) {
  const e = JSON.stringify(esperado);
  const o = JSON.stringify(obtenido);
  results.push({ caso, esperado: e, obtenido: o, ok: e === o });
}
const userIds: string[] = [];
let refunds = 0;
const fakeDeps = {
  refund: async () => {
    refunds++;
    await new Promise((r) => setTimeout(r, 50));
  },
  getMpPayment: async () => ({ status: "refunded", transaction_amount: 85000, transaction_amount_refunded: 85000, refunds: [] }),
  sendMail: async () => {},
};

/** Cuenta Broker con suscripción vigente, N aviones activos y su primer cobro aprobado hace `daysAgo` días. */
async function broker(name: string, aircraft: number, daysAgo: number) {
  const now = Date.now();
  const u = await prisma.user.create({ data: { name, email: `${TAG}-${name}@test.local`, createdAt: new Date(now - 60 * DAY) } });
  userIds.push(u.id);
  const sub = await prisma.subscription.create({
    data: { userId: u.id, planId: BROKER_ALL, status: "ACTIVE", currentPeriodStart: new Date(now - daysAgo * DAY), currentPeriodEnd: new Date(now + 20 * DAY), mpSubscriptionId: null },
  });
  const categoryId = (await prisma.aircraftCategory.findFirstOrThrow({ where: { id: "MP" } })).id;
  const ids: string[] = [];
  for (let i = 0; i < aircraft; i++) {
    // El primero es el más viejo.
    const created = new Date(now - (40 - i) * DAY);
    const a = await prisma.aircraft.create({
      data: { sellerId: u.id, title: `${TAG} avión ${i + 1}`, city: "Córdoba", province: "Córdoba", description: "prueba", status: "ACTIVE", year: 2000, categoryId, createdAt: created, listingStartsAt: created, lastPublishedAt: created },
      select: { id: true },
    });
    ids.push(a.id);
  }
  const payment = await prisma.payment.create({
    data: { mpPaymentId: `${TAG}-${name}-1`, status: "approved", amount: 85000, approvedAt: new Date(now - daysAgo * DAY), subscriptionId: sub.id, raw: { authorizedPayment: { preapproval_id: `pre-${TAG}-${name}` } } },
  });
  return { userId: u.id, subId: sub.id, paymentId: payment.id, ids };
}
const activeIds = async (userId: string) => (await prisma.aircraft.findMany({ where: { sellerId: userId, status: "ACTIVE" }, select: { id: true } })).map((a) => a.id);

async function main() {
  const now = new Date();
  const p = (days: number) => ({ status: "approved", amount: 1, refundedAmount: 0, approvedAt: new Date(now.getTime() - days * DAY), withdrawalRequestedAt: null });

  // 1. Plazo: 10 días corridos desde el pago.
  check("1. Día 1: se puede", true, !!withdrawalUntil(p(1), now));
  check("1. Día 10 (9,9 días): se puede", true, !!withdrawalUntil(p(9.9), now));
  check("1. Día 11: no", false, !!withdrawalUntil(p(10.1), now));
  check("1. 2.º cobro del mismo débito (FIRST_CHARGE): no", false, !!withdrawalUntil(p(1), now, { laterSubscriptionCharge: true }));

  // 2. Broker con 30 aviones: elige cuál queda; doble clic → una sola devolución.
  const a = await broker("a", 30, 3);
  check("2. Antes: Broker, destacado y página completa", { kind: "BROKER", featured: true, vaPage: "FULL" }, await getAccountPlan(a.userId).then((x) => ({ kind: x.kind, featured: x.featured, vaPage: x.vaPage })));
  check("2. Antes: en la lista de destacadas", true, (await loadFeaturedSellerIds()).includes(a.userId));
  const preview = await withdrawalPreview(a.userId, a.paymentId);
  check("2. Vista previa: elegir 1 de 30 aviones", { kind: "AIRCRAFT", limit: 1, n: 30 }, preview.ok ? { kind: preview.keep[0]?.kind, limit: preview.keep[0]?.limit, n: preview.keep[0]?.listings.length } : preview.error);
  check("2. Vista previa: avisa qué se pierde (destacadas, página, republicaciones)", [true, true, true], preview.ok ? [/destacados/, /página personalizada/, /republicaciones/].map((r) => preview.lines.some((l) => r.test(l))) : null);
  check("2. Elegir 2 con cupo 1: no", false, (await requestWithdrawal(a.userId, a.paymentId, { AIRCRAFT: [a.ids[5], a.ids[6]] }, fakeDeps)).ok);
  const chosen = a.ids[12];
  const [r1, r2] = await Promise.all([
    requestWithdrawal(a.userId, a.paymentId, { AIRCRAFT: [chosen] }, fakeDeps),
    requestWithdrawal(a.userId, a.paymentId, { AIRCRAFT: [chosen] }, fakeDeps),
  ]);
  check("2. Doble clic: una sola devolución", { oks: 1, refunds: 1 }, { oks: [r1, r2].filter((r) => r.ok).length, refunds });
  check("2. Queda activo solo el elegido", [chosen], await activeIds(a.userId));
  const sub = await prisma.subscription.findUniqueOrThrow({ where: { id: a.subId }, select: { status: true } });
  check("2. Suscripción terminada", "CANCELLED", sub.status);
  const after = await getAccountPlan(a.userId);
  check("2. Después: Base, sin destacadas ni página ni detalle propio", { kind: "BASE", featured: false, vaPage: "NONE", customDetail: false, verified: false }, { kind: after.kind, featured: after.featured, vaPage: after.vaPage, customDetail: after.customDetail, verified: after.verified });
  check("2. Después: fuera de la lista de destacadas", false, (await loadFeaturedSellerIds()).includes(a.userId));
  const rs = await getRepublishStatus(a.userId);
  check("2. Después: republicaciones de Base, no \"Republicar todas\"", "COUNT", rs.mode);
  const pay = await prisma.payment.findUniqueOrThrow({ where: { id: a.paymentId }, select: { status: true, withdrawalRequestedAt: true } });
  check("2. Pago marcado como devuelto", { status: "refunded", requested: true }, { status: pay.status, requested: !!pay.withdrawalRequestedAt });
  check("2. No se puede pedir otra vez", false, (await requestWithdrawal(a.userId, a.paymentId, {}, fakeDeps)).ok);

  // 3. Sin elegir (o reembolso por webhook / contracargo): se pausan los más nuevos.
  const b = await broker("b", 5, 2);
  await revertSubscriptionCharge(b.paymentId);
  check("3. Webhook de reembolso: queda el más viejo", [b.ids[0]], await activeIds(b.userId));
  await revertSubscriptionCharge(b.paymentId);
  check("3. Webhook repetido: no cambia nada", [b.ids[0]], await activeIds(b.userId));

  // 4. 2.º cobro del débito: no se ofrece el botón (FIRST_CHARGE).
  const c = await broker("c", 1, 40);
  const second = await prisma.payment.create({
    data: { mpPaymentId: `${TAG}-c-2`, status: "approved", amount: 85000, approvedAt: new Date(now.getTime() - 2 * DAY), subscriptionId: c.subId, raw: { authorizedPayment: { preapproval_id: `pre-${TAG}-c` } } },
  });
  check("4. El 2.º cobro se reconoce como siguiente", true, await isLaterSubscriptionCharge({ ...second, raw: second.raw }));
  check("4. Arrepentirse del 2.º cobro: no", false, (await requestWithdrawal(c.userId, second.id, {}, fakeDeps)).ok);
  check("4. Arrepentirse del 1.º a los 40 días: no", false, (await requestWithdrawal(c.userId, c.paymentId, {}, fakeDeps)).ok);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const subs = await prisma.subscription.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
    await prisma.payment.deleteMany({ where: { subscriptionId: { in: subs.map((s) => s.id) } } });
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.aircraft.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.table(results.map((r) => ({ caso: r.caso, esperado: r.esperado, obtenido: r.obtenido, "": r.ok ? "✓" : "✗" })));
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} de ${results.length} fallaron` : `${results.length}/${results.length} bien`);
    if (failed) process.exitCode = 1;
    await prisma.$disconnect();
  });
