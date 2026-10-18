// VA-105 · 1.1 y 1.2: verificación de la facturación contra va_dev con el código real (checkout,
// activación, cola y emisión). Nunca llama a TusFacturas: fetch queda interceptado y falla si alguien
// lo intenta. Crea datos de prueba y los borra al final.
//
// Uso (PowerShell o bash, con las variables de .env y .env.local cargadas):
//   npx tsx --require ./scripts/stub-server-only.cjs scripts/verify-billing.ts
import { prisma } from "@/lib/prisma";
import { startCheckout } from "@/lib/payments/checkout";
import { activatePurchase } from "@/lib/payments/activation";
import { queueInvoice } from "@/lib/payments/invoices";
import { processInvoice } from "@/lib/billing/issue";
import { isTestPayment } from "@/lib/billing/guard";
import { mpAccountIsTest } from "@/lib/payments/mp-account";

const USER = "test-va30-user";
const rows: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
const check = (caso: string, esperado: string, obtenido: string) => rows.push({ caso, esperado, obtenido, ok: esperado === obtenido });

// Ninguna llamada a TusFacturas, pase lo que pase.
const realFetch = globalThis.fetch;
let tusfacturasCalls = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input instanceof Request ? input.url : input).includes("tusfacturas")) {
    tusfacturasCalls++;
    throw new Error("PROHIBIDO: se intentó llamar a TusFacturas en una verificación");
  }
  return realFetch(input, init);
}) as typeof fetch;

const billing = { kind: "CONSUMIDOR_FINAL", name: "Usuario de prueba VA-30", docNumber: "", email: "prueba.va30@ventasaeronauticas.test" };

async function approve(purchaseId: string, mpPaymentId: string) {
  const purchase = await prisma.purchase.findUniqueOrThrow({ where: { id: purchaseId } });
  const liveMode = true; // las cuentas de prueba de MP informan live_mode=true
  const payment = await prisma.payment.create({
    data: {
      mpPaymentId,
      status: "approved",
      amount: purchase.finalPrice,
      approvedAt: new Date(),
      purchaseId,
      liveMode,
      isTest: isTestPayment({ liveMode, mpAccountIsTest: await mpAccountIsTest() }),
    },
  });
  await activatePurchase(purchaseId);
  await queueInvoice({ paymentId: payment.id, amount: Number(purchase.finalPrice), description: purchase.description, receiver: purchase.billingSnapshot, periodFrom: new Date(), periodTo: new Date() });
  return payment;
}

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");
  // Peor caso a propósito: todo "de producción" salvo VERCEL_ENV y la cuenta de prueba de MP.
  process.env.BILLING_ENABLED = "true";
  process.env.TUSFACTURAS_MODE = "production";
  delete process.env.VERCEL_ENV;

  const created = { coupons: [] as string[], purchases: [] as string[], payments: [] as string[] };
  // El pack "plan-aircraft-3" ya no existe (VA-105 / VA-152): el script crea uno temporal de pago único
  // con el mismo id y precio, y lo borra al final.
  const tempPlan = !(await prisma.plan.findUnique({ where: { id: "plan-aircraft-3" } }));
  if (tempPlan) {
    await prisma.plan.create({ data: { id: "plan-aircraft-3", name: "Pack 3 aviones (verificación)", type: "AIRCRAFT_PACK", price: 72000, aircraftListingsCount: 3, isActive: true, billingType: "ONE_TIME" } });
  }
  try {
    const c100 = await prisma.coupon.create({ data: { code: "VERIF100", discountType: "FULL_DISCOUNT", scope: "ALL", maxUses: 10, maxUsesPerUser: 5 } });
    const c50 = await prisma.coupon.create({ data: { code: "VERIF50", discountType: "PERCENTAGE", discountValue: 50, scope: "ALL", maxUses: 10, maxUsesPerUser: 5 } });
    created.coupons.push(c100.id, c50.id);

    // 1) Cupón del 100%: se activa sin Mercado Pago y sin fila Invoice.
    const r1 = await startCheckout({ userId: USER, userEmail: null, productKey: "plan:plan-aircraft-3", couponCode: "verif100", billing });
    const p1 = await prisma.purchase.findFirstOrThrow({ where: { userId: USER, couponId: c100.id }, include: { payments: { include: { invoices: true } } } });
    created.purchases.push(p1.id);
    check("Cupón 100%: total y activación", "0 · activada · sin Mercado Pago", `${Number(p1.finalPrice)} · ${p1.activatedAt ? "activada" : "no activada"} · ${r1.ok && r1.redirectTo.startsWith("/payment/status") ? "sin Mercado Pago" : "pasó por MP"}`);
    check("Cupón 100%: sin factura", "0 facturas", `${p1.payments.flatMap((p) => p.invoices).length} facturas`);

    // 2) Cupón del 50%: factura por la mitad (simulada: no hay VERCEL_ENV=production y la cuenta es de prueba).
    const r2 = await startCheckout({ userId: USER, userEmail: null, productKey: "plan:plan-aircraft-3", couponCode: " Verif50 ", billing });
    const p2 = await prisma.purchase.findFirstOrThrow({ where: { userId: USER, couponId: c50.id } });
    created.purchases.push(p2.id);
    check("Cupón 50%: va a Mercado Pago por la mitad", "36000 · a Mercado Pago", `${Number(p2.finalPrice)} · ${r2.ok && r2.redirectTo.includes("mercadopago") ? "a Mercado Pago" : "no"}`);
    const pay2 = await approve(p2.id, "verif-pago-50");
    created.payments.push(pay2.id);
    const inv2 = await prisma.invoice.findUniqueOrThrow({ where: { invoicedPaymentId: pay2.id } });
    const st2 = await processInvoice(inv2.id);
    const inv2b = await prisma.invoice.findUniqueOrThrow({ where: { id: inv2.id } });
    const sent = (inv2b.requestPayload as { comprobante?: { total?: number; tipo?: string } } | null)?.comprobante;
    check("Cupón 50%: factura por lo cobrado", "36000 · FACTURA C", `${Number(inv2b.total)} · ${sent?.tipo ?? "?"}`);
    check("Pago de prueba: nunca factura real", "ISSUED_SIMULATED · simulated · 0 llamadas a TusFacturas", `${st2} · ${inv2b.mode} · ${tusfacturasCalls} llamadas a TusFacturas`);
    check("Pago de prueba: marcado como prueba", "isTest", pay2.isTest ? "isTest" : "no");

    // 3) Reenvío del webhook: misma factura, una sola emisión.
    await Promise.all([1, 2, 3].map(() => queueInvoice({ paymentId: pay2.id, amount: 36000, description: "x", receiver: null, periodFrom: new Date(), periodTo: new Date() })));
    await Promise.all([processInvoice(inv2.id), processInvoice(inv2.id), processInvoice(inv2.id)]);
    const all2 = await prisma.invoice.findMany({ where: { paymentId: pay2.id } });
    check("Reenvío del webhook: una sola factura", "1 factura · 1 intento", `${all2.length} factura · ${all2[0].attempts} intento`);

    // 4) BILLING_ENABLED=false: queda PENDING y no se procesa (así se hace el pago real de prueba).
    process.env.BILLING_ENABLED = "false";
    const p4 = await prisma.purchase.create({ data: { userId: USER, planId: "plan-aircraft-3", description: "Verificación BILLING_ENABLED=false", originalPrice: 72000, finalPrice: 72000 } });
    created.purchases.push(p4.id);
    const pay4 = await approve(p4.id, "verif-pago-off");
    created.payments.push(pay4.id);
    const inv4 = await prisma.invoice.findUniqueOrThrow({ where: { invoicedPaymentId: pay4.id } });
    const st4 = await processInvoice(inv4.id);
    check("BILLING_ENABLED=false: queda pendiente", "PENDING · 0 intentos", `${st4} · ${(await prisma.invoice.findUniqueOrThrow({ where: { id: inv4.id } })).attempts} intentos`);
  } finally {
    await prisma.invoice.deleteMany({ where: { paymentId: { in: created.payments } } });
    await prisma.payment.deleteMany({ where: { id: { in: created.payments } } });
    await prisma.couponUsage.deleteMany({ where: { purchaseId: { in: created.purchases } } });
    await prisma.purchase.deleteMany({ where: { id: { in: created.purchases } } });
    await prisma.coupon.deleteMany({ where: { id: { in: created.coupons } } });
    if (tempPlan) await prisma.plan.deleteMany({ where: { id: "plan-aircraft-3", purchases: { none: {} } } });
    await prisma.billingProfile.deleteMany({ where: { userId: USER } });
    await prisma.$disconnect();
  }
  console.table(rows.map((r) => ({ ...r, ok: r.ok ? "✔" : "✘" })));
  if (rows.some((r) => !r.ok) || tusfacturasCalls > 0) process.exitCode = 1;
}
main();
