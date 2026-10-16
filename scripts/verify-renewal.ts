// VA-105 (14/10): verificación de la renovación paga y del "sin vencimiento" por tipo, contra va_dev.
// Usa avisos del usuario de prueba, guarda sus fechas y las restaura al final. Crea una preferencia
// en la cuenta de prueba de Mercado Pago (no se paga nada).
//
// Uso: npx tsx --require ./scripts/stub-server-only.cjs scripts/verify-renewal.ts
import { prisma } from "@/lib/prisma";
import { renewalPrice } from "@/lib/renewal";
import { resolveProduct, startCheckout } from "@/lib/payments/checkout";
import { activatePurchase } from "@/lib/payments/activation";
import { grantCourtesyPlan, revokeCourtesyPlan } from "@/lib/courtesy-plans";
import { getListingPrices } from "@/lib/listing-prices";
import { syncListingExpiry } from "@/lib/subscriptions";

const USER = "test-va30-user";
const DAY = 86_400_000;
const rows: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
const check = (caso: string, esperado: string, obtenido: string) => rows.push({ caso, esperado, obtenido, ok: esperado === obtenido });
const billing = { kind: "CONSUMIDOR_FINAL", name: "Prueba renovación", docNumber: "", email: "renovacion@ventasaeronauticas.test" };
const days = (d: Date | null) => (d ? `${Math.round((d.getTime() - Date.now()) / DAY)} días` : "sin fecha");

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

  const aircraft = await prisma.aircraft.findFirstOrThrow({ where: { sellerId: USER, status: "ACTIVE" }, select: { id: true, listingExpiresAt: true } });
  const part = await prisma.sparePart.findFirstOrThrow({ where: { sellerId: USER, status: "ACTIVE" }, select: { id: true, listingExpiresAt: true } });
  const original = { aircraft: aircraft.listingExpiresAt, part: part.listingExpiresAt };
  const sub = await prisma.subscription.findUnique({ where: { userId: USER } });
  const settings = await prisma.billingSettings.findUnique({ where: { id: "default" } });
  const started = new Date();

  try {
    const prices = await getListingPrices();
    await prisma.billingSettings.upsert({ where: { id: "default" }, create: { id: "default", renewalPercent: 70 }, update: { renewalPercent: 70 } });

    // 1) Precio: 70% del precio suelto.
    const p = await renewalPrice(USER, "AIRCRAFT");
    check("1. Renovar un avión sin plan: 70% del precio suelto", String(Math.round(prices.AIRCRAFT.amount * 0.7)), String(p.amount));

    // 2) Checkout de la renovación (aviso vencido hace 3 días).
    await prisma.aircraft.update({ where: { id: aircraft.id }, data: { listingExpiresAt: new Date(Date.now() - 3 * DAY) } });
    const product = await resolveProduct(USER, { renew: `aircraft:${aircraft.id}` });
    check("2a. Producto de renovación", `Renovación · ${p.amount}`, "error" in product ? product.error : `${product.name.split(" ")[0]} · ${product.price}`);
    const r = await startCheckout({ userId: USER, userEmail: null, productKey: `renew:aircraft:${aircraft.id}`, billing });
    check("2b. Va a Mercado Pago", "Mercado Pago", r.ok && r.redirectTo.includes("mercadopago") ? "Mercado Pago" : JSON.stringify(r));
    const purchase = await prisma.purchase.findFirstOrThrow({ where: { userId: USER, renewalListingId: aircraft.id, createdAt: { gte: started } } });
    check("2c. La compra sabe qué aviso renueva", `AIRCRAFT · ${aircraft.id}`, `${purchase.renewalKind} · ${purchase.renewalListingId}`);
    await startCheckout({ userId: USER, userEmail: null, productKey: `renew:aircraft:${aircraft.id}`, billing });
    check("2d. Reintentar reutiliza la misma compra", "1", String(await prisma.purchase.count({ where: { userId: USER, renewalListingId: aircraft.id, createdAt: { gte: started } } })));

    // 3) Pago aprobado: 45 días desde hoy (estaba vencido).
    await activatePurchase(purchase.id);
    const renewed = await prisma.aircraft.findUniqueOrThrow({ where: { id: aircraft.id }, select: { listingExpiresAt: true, status: true } });
    check("3. Pago aprobado: activo, vence en 45 días", "ACTIVE · 45 días", `${renewed.status} · ${days(renewed.listingExpiresAt)}`);

    // 4) Porcentaje 0: gratis.
    await prisma.billingSettings.update({ where: { id: "default" }, data: { renewalPercent: 0 } });
    check("4. Porcentaje 0: renovar es gratis", "0", String((await renewalPrice(USER, "AIRCRAFT")).amount));
    await prisma.billingSettings.update({ where: { id: "default" }, data: { renewalPercent: 70 } });

    // 5) Plan Repuestos: los repuestos no vencen ni se cobran; los aviones sí.
    const plan = await prisma.plan.findFirstOrThrow({ where: { name: "Plan Repuestos" } });
    const admin = await prisma.user.findFirstOrThrow({ where: { isAdmin: true }, select: { id: true } });
    await grantCourtesyPlan({ adminId: admin.id, userId: USER, planId: plan.id, until: new Date(Date.now() + 30 * DAY) });
    const afterGrant = {
      part: (await prisma.sparePart.findUniqueOrThrow({ where: { id: part.id } })).listingExpiresAt,
      aircraft: (await prisma.aircraft.findUniqueOrThrow({ where: { id: aircraft.id } })).listingExpiresAt,
    };
    check("5a. Plan Repuestos: el repuesto queda sin vencimiento", "sin fecha", days(afterGrant.part));
    check("5b. Plan Repuestos: el avión sigue venciendo", "45 días", days(afterGrant.aircraft));
    check("5c. Plan Repuestos: renovar un repuesto es gratis", "0 · cubierto", `${(await renewalPrice(USER, "SPARE_PART")).amount} · ${(await renewalPrice(USER, "SPARE_PART")).covered ? "cubierto" : "no"}`);
    check("5d. Plan Repuestos: renovar un avión se cobra", String(Math.round(prices.AIRCRAFT.amount * 0.7)), String((await renewalPrice(USER, "AIRCRAFT")).amount));
    const blocked = await resolveProduct(USER, { renew: `parts:${part.id}` });
    check("5e. No se puede pagar la renovación de algo cubierto", "Este aviso se renueva sin cargo desde tu perfil.", "error" in blocked ? blocked.error : "se cobró");

    // 6) Se quita el plan: el repuesto vuelve a vencer en 45 días.
    await revokeCourtesyPlan(USER);
    check("6. Sin plan: el repuesto vuelve a vencer", "45 días", days((await prisma.sparePart.findUniqueOrThrow({ where: { id: part.id } })).listingExpiresAt));

    // 7) Suscripción VA: todo sin vencimiento.
    const va = await prisma.plan.findFirstOrThrow({ where: { name: "Suscripción VA" } });
    await grantCourtesyPlan({ adminId: admin.id, userId: USER, planId: va.id, until: new Date(Date.now() + 30 * DAY) });
    check(
      "7. Suscripción VA: aviones y repuestos sin vencimiento",
      "sin fecha · sin fecha",
      `${days((await prisma.aircraft.findUniqueOrThrow({ where: { id: aircraft.id } })).listingExpiresAt)} · ${days((await prisma.sparePart.findUniqueOrThrow({ where: { id: part.id } })).listingExpiresAt)}`
    );
  } finally {
    await prisma.purchase.deleteMany({ where: { userId: USER, createdAt: { gte: started } } });
    if (sub) await prisma.subscription.upsert({ where: { userId: USER }, create: sub, update: sub });
    else await prisma.subscription.deleteMany({ where: { userId: USER } });
    if (settings) await prisma.billingSettings.update({ where: { id: "default" }, data: { renewalPercent: settings.renewalPercent } });
    await prisma.aircraft.update({ where: { id: aircraft.id }, data: { listingExpiresAt: original.aircraft, status: "ACTIVE" } });
    await prisma.sparePart.update({ where: { id: part.id }, data: { listingExpiresAt: original.part } });
    // Los otros avisos del usuario de prueba vuelven a tener fecha según su plan (sin plan: 45 días).
    await syncListingExpiry(USER);
    await prisma.billingProfile.deleteMany({ where: { userId: USER } });
    await prisma.$disconnect();
  }
  console.table(rows.map((r) => ({ ...r, ok: r.ok ? "✔" : "✘" })));
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}
main();
