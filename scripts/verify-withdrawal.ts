// VA-150: los 13 casos del arrepentimiento con Mercado Pago SIMULADO (fetch interceptado: pagos,
// reembolsos, preferencias, cancelación del débito, Resend y TusFacturas). Contra va_dev. Crea un
// usuario, planes y avisos de prueba por caso y borra todo al final.
//
// Uso: npx tsx --require ./scripts/stub-server-only.cjs scripts/verify-withdrawal.ts
import { prisma } from "@/lib/prisma";
import { startCheckout, resolveProduct } from "@/lib/payments/checkout";
import { handlePayment } from "@/lib/payments/process";
import { requestWithdrawal, withdrawalUntil, withdrawalPreview, WITHDRAWAL_SUBSCRIPTION_SCOPE } from "@/lib/payments/withdrawal";
import { takeListingAllowance, recordFunding } from "@/lib/balances";
import { syncListingExpiry } from "@/lib/subscriptions";
import { activeListingWhere } from "@/lib/listing-filters";
import { launchBalanceCreateData } from "@/lib/launch-balance";
import { isLaterSubscriptionCharge } from "@/lib/payments/subscription-reversal";

const DAY = 86_400_000;
const rows: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
const check = (caso: string, esperado: string, obtenido: string) => rows.push({ caso, esperado, obtenido, ok: esperado === obtenido });
const billing = { kind: "CONSUMIDOR_FINAL", name: "Prueba arrepentimiento", docNumber: "", email: "arrepentimiento@ventasaeronauticas.test" };

// ---------------------------------------------------------------- Mercado Pago simulado
type FakePay = { id: number; status: string; status_detail: string; transaction_amount: number; transaction_amount_refunded: number; external_reference: string | null; refunds: { id: number; amount: number }[]; date_approved: string; currency_id: string; live_mode: boolean };
const mp = new Map<string, FakePay>();
const calls = { refunds: 0, preapprovalCancel: 0, tusfacturas: 0 };
let seq = 9_000_000;
const realFetch = globalThis.fetch;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  const method = (init?.method ?? "GET").toUpperCase();
  if (url.includes("tusfacturas")) {
    calls.tusfacturas++;
    throw new Error("PROHIBIDO: TusFacturas en una verificación");
  }
  if (url.includes("api.resend.com")) return json({ id: "mail-simulado" });
  if (url.includes("/users/me")) return json({ tags: ["test_user"] });
  if (url.includes("/checkout/preferences")) return json({ id: `pref-${++seq}`, init_point: "https://www.mercadopago.com.ar/checkout/simulado" });
  const refund = url.match(/\/v1\/payments\/(\d+)\/refunds/);
  if (refund && method === "POST") {
    const p = mp.get(refund[1]);
    if (!p) return json({ message: "not found" }, 404);
    if (p.status !== "refunded") {
      calls.refunds++;
      p.refunds.push({ id: ++seq, amount: p.transaction_amount });
      p.status = "refunded";
      p.transaction_amount_refunded = p.transaction_amount;
    }
    return json(p.refunds[p.refunds.length - 1], 201);
  }
  const pay = url.match(/\/v1\/payments\/(\d+)/);
  if (pay) return mp.has(pay[1]) ? json(mp.get(pay[1])) : json({ message: "not found" }, 404);
  if (url.includes("/preapproval/") && method === "PUT") {
    calls.preapprovalCancel++;
    return json({ id: url.split("/preapproval/")[1], status: "cancelled" });
  }
  if (url.includes("mercadopago.com")) throw new Error(`MP no simulado: ${method} ${url}`);
  return realFetch(input, init);
}) as typeof fetch;

function fakeApproved(externalReference: string | null, amount: number, approvedAt = new Date()): string {
  const id = String(++seq);
  mp.set(id, { id: Number(id), status: "approved", status_detail: "accredited", transaction_amount: amount, transaction_amount_refunded: 0, external_reference: externalReference, refunds: [], date_approved: approvedAt.toISOString(), currency_id: "ARS", live_mode: true });
  return id;
}

// ---------------------------------------------------------------- Datos de prueba
const created = { users: [] as string[], plans: [] as string[], coupons: [] as string[] };
let categoryId = "";

async function newUser(tag: string, withLaunch = false) {
  const u = await prisma.user.create({
    data: { email: `va150-${tag}-${Date.now()}@ventasaeronauticas.test`, name: `Prueba VA-150 ${tag}`, ...(withLaunch ? launchBalanceCreateData() : {}) },
  });
  created.users.push(u.id);
  return u;
}

async function part(userId: string, data: Partial<{ status: "ACTIVE" | "PENDING_PAYMENT"; listingExpiresAt: Date | null }> = {}) {
  return prisma.sparePart.create({
    data: { sellerId: userId, title: `Repuesto VA-150 ${++seq}`, city: "Córdoba", province: "Córdoba", description: "Prueba VA-150", categoryId, status: data.status ?? "ACTIVE", listingExpiresAt: data.listingExpiresAt === undefined ? new Date(Date.now() + 45 * DAY) : data.listingExpiresAt },
  });
}

/** Igual que createListing: toma el permiso según el orden único y registra con qué se pagó. */
async function publish(userId: string) {
  const funding = await takeListingAllowance(userId, "SPARE_PART");
  const l = await part(userId, funding ? {} : { status: "PENDING_PAYMENT", listingExpiresAt: null });
  if (funding) await recordFunding(prisma, { userId, kind: "SPARE_PART", listingId: l.id, reason: "PUBLISH", funding });
  return l;
}

async function pay(userId: string, productKey: string, couponCode?: string) {
  const r = await startCheckout({ userId, userEmail: null, productKey, couponCode, billing });
  if (!r.ok) throw new Error(`checkout ${productKey}: ${r.error}`);
  const purchase = await prisma.purchase.findFirstOrThrow({ where: { userId }, orderBy: { updatedAt: "desc" } });
  const mpId = fakeApproved(purchase.id, Number(purchase.finalPrice));
  await handlePayment(mpId);
  const payment = await prisma.payment.findUniqueOrThrow({ where: { mpPaymentId: mpId } });
  return { purchase, payment, mpId };
}

const status = async (id: string) => (await prisma.sparePart.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;
const balance = async (userId: string) => (await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { sparePartsListingsBalance: true } })).sparePartsListingsBalance;
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 16) : "sin fecha");

async function subscriptionWith(userId: string, planName: string, preapproval: string, approvedAt = new Date()) {
  const plan = await prisma.plan.findFirstOrThrow({ where: { name: planName } });
  const sub = await prisma.subscription.create({
    data: { userId, planId: plan.id, status: "ACTIVE", source: "MERCADOPAGO", mpSubscriptionId: preapproval, mpStatus: "authorized", currentPeriodStart: approvedAt, currentPeriodEnd: new Date(approvedAt.getTime() + 30 * DAY) },
  });
  const mpId = fakeApproved(null, Number(plan.price), approvedAt);
  const payment = await prisma.payment.create({
    data: { mpPaymentId: mpId, status: "approved", amount: plan.price, approvedAt, subscriptionId: sub.id, liveMode: true, isTest: true, raw: { authorizedPayment: { preapproval_id: preapproval } } },
  });
  await syncListingExpiry(userId); // lo mismo que hace el cobro aprobado
  return { sub, payment, plan };
}

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");
  categoryId = (await prisma.category.findFirstOrThrow({ where: { parentId: { not: null } }, select: { id: true } })).id;
  const pack = await prisma.plan.create({ data: { name: `Pack VA-150 ${Date.now()}`, type: "SPARE_PART_PACK", price: 30000, sparePartsListingsCount: 3, isActive: true, billingType: "ONE_TIME" } });
  created.plans.push(pack.id);

  try {
    // 1) Aviso suelto.
    {
      const u = await newUser("suelto");
      const l = await part(u.id, { status: "PENDING_PAYMENT", listingExpiresAt: null });
      const { payment } = await pay(u.id, `listing:parts:${l.id}`);
      const before = await status(l.id);
      const r = await requestWithdrawal(u.id, payment.id);
      const visible = await prisma.sparePart.count({ where: { id: l.id, ...activeListingWhere() } });
      check("1. Aviso suelto pagado → arrepentimiento", "ACTIVE → PENDING_PAYMENT · fuera del sitio", `${before} → ${r.ok ? await status(l.id) : r.error} · ${visible ? "visible" : "fuera del sitio"}`);
    }

    // 2) Pack de 3, publica 2.
    {
      const u = await newUser("pack");
      const { payment } = await pay(u.id, `plan:${pack.id}`);
      const a = await publish(u.id);
      const b = await publish(u.id);
      await requestWithdrawal(u.id, payment.id);
      const lot = await prisma.creditLot.findFirstOrThrow({ where: { userId: u.id, source: "PACK" } });
      check("2. Pack de 3, publica 2 → arrepentimiento", "saldo 0 · lote 0 · PENDING_PAYMENT y PENDING_PAYMENT", `saldo ${await balance(u.id)} · lote ${lot.remaining} · ${await status(a.id)} y ${await status(b.id)}`);
    }

    // 3) Lanzamiento 1 + pack 3, publica 2.
    {
      const u = await newUser("lanzamiento", true);
      const { payment } = await pay(u.id, `plan:${pack.id}`);
      const first = await publish(u.id);
      const second = await publish(u.id);
      const f1 = await prisma.listingFunding.findFirstOrThrow({ where: { listingId: first.id } });
      await requestWithdrawal(u.id, payment.id);
      check(
        "3. Lanzamiento 1 + pack 3, publica 2 → arrepentimiento del pack",
        "1.º del lanzamiento: ACTIVE · 2.º: PENDING_PAYMENT · saldo 0",
        `1.º del ${f1.source === "LAUNCH_BALANCE" ? "lanzamiento" : f1.source}: ${await status(first.id)} · 2.º: ${await status(second.id)} · saldo ${await balance(u.id)}`
      );
    }

    // 4) Suscripción: publica 5 y "renueva" 1 viejo (la suscripción lo deja sin vencimiento).
    {
      const u = await newUser("suscripcion");
      const oldExpiry = new Date(Date.now() + 12 * DAY);
      const old = await part(u.id, { listingExpiresAt: oldExpiry });
      const { sub, payment } = await subscriptionWith(u.id, "Plan Repuestos", "pre-va150-4", new Date(Date.now() - 60_000));
      const five = [];
      for (let i = 0; i < 5; i++) five.push(await publish(u.id));
      const oldDuring = (await prisma.sparePart.findUniqueOrThrow({ where: { id: old.id } })).listingExpiresAt;
      const cancelsBefore = calls.preapprovalCancel;
      await requestWithdrawal(u.id, payment.id);
      const s = await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } });
      const statuses = await Promise.all(five.map((l) => status(l.id)));
      const oldAfter = (await prisma.sparePart.findUniqueOrThrow({ where: { id: old.id } })).listingExpiresAt;
      check(
        "4. Suscripción: publica 5 y renueva 1 viejo → arrepentimiento",
        `CANCELLED · débito cancelado · 5 en PENDING_PAYMENT · viejo: sin fecha → ${iso(oldExpiry)}`,
        `${s.status} · ${calls.preapprovalCancel > cancelsBefore ? "débito cancelado" : "débito sigue"} · ${statuses.filter((x) => x === "PENDING_PAYMENT").length} en PENDING_PAYMENT · viejo: ${iso(oldDuring)} → ${iso(oldAfter)}`
      );
    }

    // 5) Renovación pagada.
    {
      const u = await newUser("renovacion");
      const original = new Date(Date.now() - 2 * DAY);
      const l = await part(u.id, { listingExpiresAt: original });
      const { payment } = await pay(u.id, `renew:parts:${l.id}`);
      const renewed = (await prisma.sparePart.findUniqueOrThrow({ where: { id: l.id } })).listingExpiresAt;
      const renewedExpected = new Date(Date.now() + 45 * DAY); // estaba vencido: 45 días desde hoy
      await requestWithdrawal(u.id, payment.id);
      const after = (await prisma.sparePart.findUniqueOrThrow({ where: { id: l.id } })).listingExpiresAt;
      check("5. Renovación pagada → arrepentimiento", `renovado a ${iso(renewedExpected)} → vuelve a ${iso(original)} (vencido)`, `renovado a ${iso(renewed)} → vuelve a ${iso(after)}${after && after < new Date() ? " (vencido)" : ""}`);
    }

    // 6) Destacado (todavía no se vende: se simula la compra y su consumo).
    {
      const u = await newUser("destacado");
      const l = await part(u.id);
      const until = new Date(Date.now() + 7 * DAY);
      await prisma.sparePart.update({ where: { id: l.id }, data: { featuredUntil: until } });
      const purchase = await prisma.purchase.create({ data: { userId: u.id, description: "Destacado 7 días (simulado)", originalPrice: 5000, finalPrice: 5000, featuredDays: 7, featuredKind: "SPARE_PART", featuredListingId: l.id, paymentStatus: "PENDING" } });
      await recordFunding(prisma, { userId: u.id, kind: "SPARE_PART", listingId: l.id, reason: "FEATURED", funding: { source: "SINGLE_PAYMENT", purchaseId: purchase.id }, previousFeaturedUntil: null });
      const mpId = fakeApproved(purchase.id, 5000);
      await handlePayment(mpId);
      const payment = await prisma.payment.findUniqueOrThrow({ where: { mpPaymentId: mpId } });
      await requestWithdrawal(u.id, payment.id);
      const after = (await prisma.sparePart.findUniqueOrThrow({ where: { id: l.id } })).featuredUntil;
      check("6. Destacado → arrepentimiento (compra simulada)", "sin destacado", after && after > new Date() ? `destacado hasta ${iso(after)}` : "sin destacado");
    }

    // 7) Cambio de plan: se arrepiente del primer cobro del plan nuevo.
    {
      const u = await newUser("cambio");
      const { sub } = await subscriptionWith(u.id, "Plan Repuestos", "pre-va150-viejo", new Date(Date.now() - 5 * DAY));
      const before = await publish(u.id); // con el plan viejo
      const va = await prisma.plan.findFirstOrThrow({ where: { name: "Suscripción VA" } });
      await prisma.subscription.update({ where: { id: sub.id }, data: { planId: va.id, mpSubscriptionId: "pre-va150-nuevo" } });
      const mpId = fakeApproved(null, Number(va.price));
      const newCharge = await prisma.payment.create({ data: { mpPaymentId: mpId, status: "approved", amount: va.price, approvedAt: new Date(), subscriptionId: sub.id, liveMode: true, isTest: true, raw: { authorizedPayment: { preapproval_id: "pre-va150-nuevo" } } } });
      const after = await publish(u.id); // con el plan nuevo
      const r = await requestWithdrawal(u.id, newCharge.id);
      const s = await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } });
      check(
        "7. Cambio de plan → arrepentimiento del plan nuevo",
        "permitido · CANCELLED · el del plan nuevo: PENDING_PAYMENT · el del plan viejo: ACTIVE",
        `${r.ok ? "permitido" : r.error} · ${s.status} · el del plan nuevo: ${await status(after.id)} · el del plan viejo: ${await status(before.id)}`
      );
    }

    // 8) Reembolso a mano desde el panel de Mercado Pago (sin el botón) = webhook.
    {
      const u = await newUser("manual");
      const l = await part(u.id, { status: "PENDING_PAYMENT", listingExpiresAt: null });
      const { mpId } = await pay(u.id, `listing:parts:${l.id}`);
      const p = mp.get(mpId)!;
      p.status = "refunded";
      p.transaction_amount_refunded = p.transaction_amount;
      p.refunds.push({ id: ++seq, amount: p.transaction_amount });
      await handlePayment(mpId);
      // Y un cobro de suscripción reembolsado a mano.
      const u2 = await newUser("manual-sub");
      const { sub, payment } = await subscriptionWith(u2.id, "Plan Repuestos", "pre-va150-8", new Date(Date.now() - 60_000));
      const pub = await publish(u2.id);
      const sp = mp.get(payment.mpPaymentId)!;
      sp.status = "refunded";
      sp.transaction_amount_refunded = sp.transaction_amount;
      await handlePayment(payment.mpPaymentId);
      const s = await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } });
      check("8. Reembolso a mano en MP (sin botón): aviso suelto y cobro de suscripción", "PENDING_PAYMENT · CANCELLED y PENDING_PAYMENT", `${await status(l.id)} · ${s.status} y ${await status(pub.id)}`);
    }

    // 9) Doble clic y webhook a la vez.
    {
      const u = await newUser("doble");
      const { payment, mpId } = await pay(u.id, `plan:${pack.id}`);
      await publish(u.id);
      const refundsBefore = calls.refunds;
      const results = await Promise.all([requestWithdrawal(u.id, payment.id), requestWithdrawal(u.id, payment.id), handlePayment(mpId).catch(() => null)]);
      await handlePayment(mpId); // el webhook del reembolso, después
      await handlePayment(mpId); // y un reenvío
      const reverted = await prisma.listingFunding.count({ where: { userId: u.id, revertedAt: { not: null } } });
      const lot = await prisma.creditLot.findFirstOrThrow({ where: { userId: u.id, source: "PACK" } });
      check(
        "9. Doble clic + webhook simultáneo + reenvío",
        "1 reembolso · 1 pedido aceptado · 1 aviso revertido · lote 0 · saldo 0",
        `${calls.refunds - refundsBefore} reembolso · ${results.filter((r) => r && "ok" in r && r.ok).length} pedido aceptado · ${reverted} aviso revertido · lote ${lot.remaining} · saldo ${await balance(u.id)}`
      );
    }

    // 10) Un aviso pendiente por arrepentimiento no se reactiva renovándolo (solo pagando).
    {
      const u = await newUser("reactivar");
      const l = await part(u.id, { status: "PENDING_PAYMENT", listingExpiresAt: null });
      const { payment } = await pay(u.id, `listing:parts:${l.id}`);
      await requestWithdrawal(u.id, payment.id);
      const renew = await resolveProduct(u.id, { renew: `parts:${l.id}` });
      const repay = await resolveProduct(u.id, { listing: `parts:${l.id}` });
      check(
        "10. Reactivar un aviso pendiente renovándolo / pagándolo",
        "renovar: Este aviso no se puede renovar. · pagar: se puede",
        `renovar: ${"error" in renew ? renew.error : "se cobró"} · pagar: ${"error" in repay ? repay.error : "se puede"}`
      );
    }

    // 11) Día 11 y pago de $0; regla de suscripciones.
    {
      const base = { status: "approved", amount: 1000, refundedAmount: 0, withdrawalRequestedAt: null };
      const day11 = withdrawalUntil({ ...base, approvedAt: new Date(Date.now() - 11 * DAY) });
      const day9 = withdrawalUntil({ ...base, approvedAt: new Date(Date.now() - 9 * DAY) });
      const zero = withdrawalUntil({ ...base, amount: 0, approvedAt: new Date() });
      const u = await newUser("cobros");
      const { sub } = await subscriptionWith(u.id, "Plan Repuestos", "pre-va150-11", new Date(Date.now() - 31 * DAY));
      const second = await prisma.payment.create({ data: { mpPaymentId: fakeApproved(null, 50000), status: "approved", amount: 50000, approvedAt: new Date(), subscriptionId: sub.id, raw: { authorizedPayment: { preapproval_id: "pre-va150-11" } } } });
      const later = await isLaterSubscriptionCharge(second);
      const preview = await withdrawalPreview(u.id, second.id);
      check(
        `11. Día 11 · día 9 · $0 · 2.º cobro de la suscripción (regla ${WITHDRAWAL_SUBSCRIPTION_SCOPE})`,
        "sin botón · con botón · sin botón · sin botón",
        `${day11 ? "con botón" : "sin botón"} · ${day9 ? "con botón" : "sin botón"} · ${zero ? "con botón" : "sin botón"} · ${later && !preview.ok ? "sin botón" : "con botón"}`
      );
    }

    // 12) Cupón usado en el pago.
    {
      const u = await newUser("cupon");
      const c = await prisma.coupon.create({ data: { code: `VA150${Date.now() % 100000}`, discountType: "PERCENTAGE", discountValue: 10, maxUses: 5, maxUsesPerUser: 1 } });
      created.coupons.push(c.id);
      const l = await part(u.id, { status: "PENDING_PAYMENT", listingExpiresAt: null });
      const { payment } = await pay(u.id, `listing:parts:${l.id}`, c.code);
      const usesBefore = (await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } })).currentUses;
      await requestWithdrawal(u.id, payment.id);
      const usesAfter = (await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } })).currentUses;
      const usages = await prisma.couponUsage.count({ where: { couponId: c.id } });
      check("12. Cupón usado en el pago → arrepentimiento", "usos 1 → 0 · 0 registros de uso", `usos ${usesBefore} → ${usesAfter} · ${usages} registros de uso`);
    }

    // 13) Factura emitida → nota de crédito; pendiente → descartada.
    {
      const u = await newUser("factura");
      const l1 = await part(u.id, { status: "PENDING_PAYMENT", listingExpiresAt: null });
      const p1 = await pay(u.id, `listing:parts:${l1.id}`);
      const inv1 = await prisma.invoice.findUniqueOrThrow({ where: { invoicedPaymentId: p1.payment.id } });
      await prisma.invoice.update({ where: { id: inv1.id }, data: { status: "ISSUED", number: 1, pointOfSale: 3, cae: "SIMULADO", mode: "production" } });
      await requestWithdrawal(u.id, p1.payment.id);
      const notes = await prisma.invoice.count({ where: { originalInvoiceId: inv1.id, kind: "NOTA_CREDITO_C" } });
      const l2 = await part(u.id, { status: "PENDING_PAYMENT", listingExpiresAt: null });
      const p2 = await pay(u.id, `listing:parts:${l2.id}`);
      const inv2Before = (await prisma.invoice.findUniqueOrThrow({ where: { invoicedPaymentId: p2.payment.id } })).status;
      await requestWithdrawal(u.id, p2.payment.id);
      const inv2After = (await prisma.invoice.findUniqueOrThrow({ where: { invoicedPaymentId: p2.payment.id } })).status;
      check("13. Factura emitida → nota de crédito; pendiente → descartada", `1 nota de crédito · ${inv2Before} → SKIPPED · 0 llamadas a TusFacturas`, `${notes} nota de crédito · ${inv2Before} → ${inv2After} · ${calls.tusfacturas} llamadas a TusFacturas`);
    }
  } finally {
    const users = created.users;
    await prisma.invoice.deleteMany({ where: { payment: { OR: [{ purchase: { userId: { in: users } } }, { subscription: { userId: { in: users } } }] } } });
    await prisma.payment.deleteMany({ where: { OR: [{ purchase: { userId: { in: users } } }, { subscription: { userId: { in: users } } }] } });
    await prisma.couponUsage.deleteMany({ where: { userId: { in: users } } });
    await prisma.listingFunding.deleteMany({ where: { userId: { in: users } } });
    await prisma.creditLot.deleteMany({ where: { userId: { in: users } } });
    await prisma.sparePart.deleteMany({ where: { sellerId: { in: users } } });
    await prisma.purchase.deleteMany({ where: { userId: { in: users } } });
    await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
    await prisma.billingProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.coupon.deleteMany({ where: { id: { in: created.coupons } } });
    await prisma.plan.deleteMany({ where: { id: { in: created.plans } } });
    await prisma.$disconnect();
  }
  console.table(rows.map((r) => ({ ...r, ok: r.ok ? "✔" : "✘" })));
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}
main();
