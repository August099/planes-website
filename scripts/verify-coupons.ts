// VA-105 · 2: verificación de cupones de punta a punta contra va_dev, con el checkout real
// (startCheckout), la reserva con la fila bloqueada y la activación. Los pagos con monto crean una
// preferencia en la cuenta de prueba de Mercado Pago (no se paga nada). Borra todo al final.
//
// Uso: npx tsx --require ./scripts/stub-server-only.cjs scripts/verify-coupons.ts
import { prisma } from "@/lib/prisma";
import { startCheckout } from "@/lib/payments/checkout";
import { activatePurchase } from "@/lib/payments/activation";
import { COUPON_RESERVATION_MINUTES } from "@/lib/coupons";

const U1 = "test-va30-user";
const U2 = "va105-cupones-2";
const PREFIX = "VCP";
const rows: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
const check = (caso: string, esperado: string, obtenido: string) => rows.push({ caso, esperado, obtenido, ok: obtenido.includes(esperado) });
const billing = { kind: "CONSUMIDOR_FINAL", name: "Prueba cupones", docNumber: "", email: "cupones@ventasaeronauticas.test" };

type Opts = { code: string; discountType?: "FULL_DISCOUNT" | "PERCENTAGE" | "FIXED_AMOUNT"; value?: number; scope?: "ALL" | "AIRCRAFT" | "SPARE_PART"; maxUses?: number | null; perUser?: number; startsAt?: Date; expiresAt?: Date; isActive?: boolean };
const coupon = (o: Opts) =>
  prisma.coupon.create({
    data: {
      code: `${PREFIX}${o.code}`,
      discountType: o.discountType ?? "FULL_DISCOUNT",
      discountValue: o.value ?? 0,
      scope: o.scope ?? "ALL",
      maxUses: o.maxUses === undefined ? 10 : o.maxUses,
      maxUsesPerUser: o.perUser ?? 5,
      startsAt: o.startsAt,
      expiresAt: o.expiresAt,
      isActive: o.isActive ?? true,
    },
  });
const pay = (userId: string, code: string, plan = "plan-aircraft-3") => startCheckout({ userId, userEmail: null, productKey: `plan:${plan}`, couponCode: code, billing });
const result = (r: Awaited<ReturnType<typeof pay>>) => (r.ok ? (r.redirectTo.includes("mercadopago") ? "OK → Mercado Pago" : "OK → activada sin pagar") : `Error: ${r.error}`);

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");
  const started = new Date();
  await prisma.user.upsert({ where: { id: U2 }, create: { id: U2, email: `${U2}@ventasaeronauticas.test`, name: "Segundo usuario de prueba" }, update: {} });

  // Los packs "plan-aircraft-3" y "plan-parts-5" se borraron al cargar los planes reales (VA-105):
  // el script crea los suyos (mismos ids y precios) y los borra al final.
  const tempPlans: string[] = [];
  for (const p of [
    { id: "plan-aircraft-3", name: "Pack 3 aviones (verificación)", type: "AIRCRAFT_PACK" as const, price: 72000, aircraftListingsCount: 3 },
    { id: "plan-parts-5", name: "Pack 5 repuestos (verificación)", type: "SPARE_PART_PACK" as const, price: 50000, sparePartsListingsCount: 5 },
  ]) {
    if (await prisma.plan.findUnique({ where: { id: p.id } })) continue;
    await prisma.plan.create({ data: { ...p, isActive: true, billingType: "ONE_TIME" } });
    tempPlans.push(p.id);
  }
  try {
    // 1) Guardado ≠ usado: lo guarda en el perfil (uso sin compra) y lo puede usar igual con límite 1.
    const c1 = await coupon({ code: "GUARDA", perUser: 1 });
    await prisma.couponUsage.create({ data: { couponId: c1.id, userId: U1 } });
    check("1. Guardado en el perfil y usado al pagar (límite 1 por usuario)", "OK → activada sin pagar", result(await pay(U1, `${PREFIX}GUARDA`)));
    const u1 = await prisma.couponUsage.findMany({ where: { couponId: c1.id } });
    check("1b. El uso guardado se consume (no se duplica)", "1 uso, con compra", `${u1.length} uso, ${u1[0]?.purchaseId ? "con compra" : "sin compra"}`);

    // 2) Solo consume el pago aprobado: rechazado o abandonado libera la reserva.
    const c2 = await coupon({ code: "RECHAZO", discountType: "PERCENTAGE", value: 10, maxUses: 1 });
    check("2. Pago con cupón (reserva el último uso)", "OK → Mercado Pago", result(await pay(U1, `${PREFIX}RECHAZO`)));
    check("2b. Otro usuario mientras está reservado", "Error: Este cupón ya alcanzó su límite de usos.", result(await pay(U2, `${PREFIX}RECHAZO`)));
    await prisma.purchase.updateMany({ where: { couponId: c2.id, userId: U1 }, data: { paymentStatus: "REJECTED" } });
    check("2c. Pago rechazado: libera el uso", "OK → Mercado Pago", result(await pay(U2, `${PREFIX}RECHAZO`)));
    // Abandonado: la compra pendiente vence a los 30 minutos.
    const c2d = await coupon({ code: "ABANDONO", discountType: "PERCENTAGE", value: 10, maxUses: 1 });
    await pay(U1, `${PREFIX}ABANDONO`);
    await prisma.$executeRaw`UPDATE "Purchase" SET "updatedAt" = now() - (${COUPON_RESERVATION_MINUTES + 1} || ' minutes')::interval WHERE "couponId" = ${c2d.id}`;
    check("2d. Pago abandonado (más de 30 min): libera el uso", "OK → Mercado Pago", result(await pay(U2, `${PREFIX}ABANDONO`)));
    const c2r = await prisma.coupon.findUniqueOrThrow({ where: { id: c2.id } });
    check("2e. Sin pagos aprobados no se cuenta ningún uso", "0 usos", `${c2r.currentUses} usos`);
    // Aprobado: consume.
    const pending = await prisma.purchase.findFirstOrThrow({ where: { couponId: c2.id, userId: U2 } });
    await activatePurchase(pending.id);
    check("2f. Pago aprobado: consume el uso", "1 usos", `${(await prisma.coupon.findUniqueOrThrow({ where: { id: c2.id } })).currentUses} usos`);

    // 3) Límites.
    const c3 = await coupon({ code: "AGOTADO", maxUses: 1 });
    await prisma.coupon.update({ where: { id: c3.id }, data: { currentUses: 1 } });
    check("3a. maxUses global agotado", "Error: Este cupón ya alcanzó su límite de usos.", result(await pay(U1, `${PREFIX}AGOTADO`)));
    await coupon({ code: "PORUSER", perUser: 1 });
    await pay(U1, `${PREFIX}PORUSER`);
    check("3b. Ya usado por vos (límite por usuario)", "Error: Ya usaste este cupón todas las veces permitidas.", result(await pay(U1, `${PREFIX}PORUSER`)));
    await coupon({ code: "VENCIDO", expiresAt: new Date(Date.now() - 60_000) });
    check("3c. Vencido (fecha y hora)", "Error: Este cupón venció.", result(await pay(U1, `${PREFIX}VENCIDO`)));
    await coupon({ code: "FUTURO", startsAt: new Date(Date.now() + 3_600_000) });
    check("3d. Todavía no vigente", "Error: Este cupón todavía no está vigente.", result(await pay(U1, `${PREFIX}FUTURO`)));
    await coupon({ code: "INACTIVO", isActive: false });
    check("3e. Inactivo", "Error: El cupón no existe o no está activo.", result(await pay(U1, `${PREFIX}INACTIVO`)));
    check("3f. Inexistente", "Error: El cupón no existe o no está activo.", result(await pay(U1, `${PREFIX}NOEXISTE`)));
    await coupon({ code: "AVION", scope: "AIRCRAFT" });
    check("3g. Cupón de avión en un pack de repuestos", "Error: Este cupón es solo para publicaciones de aeronaves.", result(await pay(U1, `${PREFIX}AVION`, "plan-parts-5")));
    check("3h. Cupón de avión en un pack de aviones", "OK", result(await pay(U1, `${PREFIX}AVION`)));

    // 4) Concurrencia: dos usuarios por el último uso a la vez.
    await coupon({ code: "ULTIMO", maxUses: 1 });
    const [a, b] = await Promise.all([pay(U1, `${PREFIX}ULTIMO`), pay(U2, `${PREFIX}ULTIMO`)]);
    const okCount = [a, b].filter((r) => r.ok).length;
    const loser = [a, b].find((r) => !r.ok);
    check("4. Dos usuarios por el último uso a la vez", "1 lo consigue · Error: Este cupón ya alcanzó su límite de usos.", `${okCount} lo consigue · ${loser ? result(loser) : "ninguno falló"}`);

    // 5) Mayúsculas y espacios.
    await coupon({ code: "MAYUS" });
    check("5. Código en minúsculas y con espacios", "OK", result(await pay(U2, `  ${PREFIX.toLowerCase()}mayus  `)));

    // 6) Montos.
    await coupon({ code: "PORC", discountType: "PERCENTAGE", value: 10 });
    await pay(U2, `${PREFIX}PORC`);
    const p6 = await prisma.purchase.findFirstOrThrow({ where: { userId: U2, coupon: { code: `${PREFIX}PORC` } } });
    check("6a. 10% de AR$ 72.000", "64800", String(Number(p6.finalPrice)));
    await coupon({ code: "FIJO", discountType: "FIXED_AMOUNT", value: 5000 });
    await pay(U2, `${PREFIX}FIJO`);
    const p6b = await prisma.purchase.findFirstOrThrow({ where: { userId: U2, coupon: { code: `${PREFIX}FIJO` } } });
    check("6b. AR$ 5.000 fijos sobre AR$ 72.000", "67000", String(Number(p6b.finalPrice)));
    await coupon({ code: "FIJOMAYOR", discountType: "FIXED_AMOUNT", value: 100000 });
    const r6c = await pay(U2, `${PREFIX}FIJOMAYOR`);
    const p6c = await prisma.purchase.findFirstOrThrow({ where: { userId: U2, coupon: { code: `${PREFIX}FIJOMAYOR` } } });
    check("6c. Descuento mayor que el precio: nunca negativo", "0 · OK → activada sin pagar", `${Number(p6c.finalPrice)} · ${result(r6c)}`);

    // 7) Cupón del 100%: sin Mercado Pago, sin factura y con finalPrice 0.
    await coupon({ code: "CIEN" });
    const r7 = await pay(U2, `${PREFIX}CIEN`);
    const p7 = await prisma.purchase.findFirstOrThrow({ where: { userId: U2, coupon: { code: `${PREFIX}CIEN` } }, include: { payments: { include: { invoices: true } } } });
    check("7. Cupón del 100%", "0 · OK → activada sin pagar · 0 facturas", `${Number(p7.finalPrice)} · ${result(r7)} · ${p7.payments.flatMap((p) => p.invoices).length} facturas`);

    // 9) El admin ve quién lo usó (misma consulta que getAdminCoupons).
    const withUsages = await prisma.coupon.findUniqueOrThrow({
      where: { code: `${PREFIX}CIEN` },
      include: { usages: { where: { purchaseId: { not: null } }, select: { User: { select: { name: true } } } } },
    });
    check("9. El admin ve cuántos usos y de quién", "1 uso · Segundo usuario de prueba", `${withUsages.currentUses} uso · ${withUsages.usages.map((u) => u.User.name).join(", ")}`);
  } finally {
    const cleanupPlans = async () => {
      await prisma.creditLot.deleteMany({ where: { purchase: { planId: { in: tempPlans } } } });
      await prisma.plan.deleteMany({ where: { id: { in: tempPlans } } });
    };
    const purchases = await prisma.purchase.findMany({ where: { userId: { in: [U1, U2] }, createdAt: { gte: started } }, select: { id: true } });
    const ids = purchases.map((p) => p.id);
    await prisma.couponUsage.deleteMany({ where: { OR: [{ purchaseId: { in: ids } }, { Coupon: { code: { startsWith: PREFIX } } }] } });
    await prisma.creditLot.deleteMany({ where: { purchaseId: { in: ids } } });
    await prisma.listingFunding.deleteMany({ where: { purchaseId: { in: ids } } });
    await prisma.purchase.deleteMany({ where: { id: { in: ids } } });
    await cleanupPlans();
    await prisma.coupon.deleteMany({ where: { code: { startsWith: PREFIX } } });
    await prisma.billingProfile.deleteMany({ where: { userId: { in: [U1, U2] } } });
    await prisma.user.delete({ where: { id: U2 } });
    await prisma.$disconnect();
  }
  console.table(rows.map((r) => ({ ...r, ok: r.ok ? "✔" : "✘" })));
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}
main();
