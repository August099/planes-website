// VA-183: ventas (lib/sales.ts) con avisos temporales en va_dev; borra todo al final.
//
//   npx tsx --env-file=.env --require ./scripts/stub-server-only.cjs scripts/verify-sales.ts
import { prisma } from "@/lib/prisma";
import { CLEARED_SALE, getSalesStats, recordSaleAnswer, saleSnapshot } from "@/lib/sales";

const url = new URL(process.env.RUNTIME_DATABASE_URL ?? "");
if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");

const TAG = `sales-test-${Date.now()}`;
const results: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
function check(caso: string, esperado: unknown, obtenido: unknown) {
  const e = JSON.stringify(esperado);
  const o = JSON.stringify(obtenido);
  results.push({ caso, esperado: e, obtenido: o, ok: e === o });
}
const userIds: string[] = [];

async function main() {
  const before = await getSalesStats(null);
  const seller = (await prisma.user.create({ data: { name: "vendedor", email: `${TAG}-v@test.local` } })).id;
  const other = (await prisma.user.create({ data: { name: "otro", email: `${TAG}-o@test.local` } })).id;
  userIds.push(seller, other);
  const categoryId = (await prisma.aircraftCategory.findFirstOrThrow({ where: { id: "MP" } })).id;
  const partCategoryId = (await prisma.category.findFirstOrThrow({ where: { children: { none: {} } } })).id;
  const base = { city: "Córdoba", province: "Córdoba", description: "prueba", sellerId: seller };
  const a1 = await prisma.aircraft.create({ data: { ...base, title: `${TAG} a1`, year: 2000, categoryId, price: 100000 } });
  const a2 = await prisma.aircraft.create({ data: { ...base, title: `${TAG} a2`, year: 2000, categoryId, price: 50000 } });
  const p1 = await prisma.sparePart.create({ data: { ...base, title: `${TAG} p1`, categoryId: partCategoryId, price: 2000000, inPesos: true } });

  // Marcar vendidos (como setListingStatusAction).
  const s1 = await saleSnapshot(a1);
  check("1. Avión: precio publicado en dólares, sin respuesta", { price: 100000, cur: "USD", via: null, declared: false }, { price: s1.soldPrice, cur: s1.soldCurrency, via: s1.soldViaVA, declared: s1.soldPriceDeclared });
  check("1. Cotización oficial del día guardada", true, (s1.soldArsPerUsd ?? 0) > 0);
  await prisma.aircraft.update({ where: { id: a1.id }, data: { status: "SOLD", ...s1 } });
  await prisma.aircraft.update({ where: { id: a2.id }, data: { status: "SOLD", ...(await saleSnapshot(a2)) } });
  const sp = await saleSnapshot(p1);
  check("1. Repuesto en pesos: moneda ARS", "ARS", sp.soldCurrency);
  await prisma.sparePart.update({ where: { id: p1.id }, data: { status: "SOLD", ...sp, soldArsPerUsd: 1000 } });

  // Respuestas.
  check("2. Otro usuario no puede responder", false, (await recordSaleAnswer(other, "AIRCRAFT", a1.id, { viaVA: true })).ok);
  check("2. Dueño: Sí y precio declarado", true, (await recordSaleAnswer(seller, "AIRCRAFT", a1.id, { viaVA: true, price: 90000, currency: "USD" })).ok);
  check("2. Precio inválido: no", false, (await recordSaleAnswer(seller, "AIRCRAFT", a2.id, { viaVA: false, price: -5 })).ok);
  check("2. Dueño del repuesto: Sí, sin precio", true, (await recordSaleAnswer(seller, "SPARE_PART", p1.id, { viaVA: true })).ok);
  // a2 queda sin respuesta (cerró la ventana).

  const after = await getSalesStats(null);
  const d = (k: "aircraft" | "parts") => ({
    count: after[k].count - before[k].count,
    usd: after[k].usd - before[k].usd,
    via: after[k].viaVA.count - before[k].viaVA.count,
    viaUsd: after[k].viaVA.usd - before[k].viaVA.usd,
    sinRespuesta: after[k].unanswered - before[k].unanswered,
  });
  check("3. Aviones: 2 ventas, US$ 140.000, 1 gracias a VA (90.000), 1 sin respuesta", { count: 2, usd: 140000, via: 1, viaUsd: 90000, sinRespuesta: 1 }, d("aircraft"));
  check("3. Repuestos: AR$ 2.000.000 a 1.000 = US$ 2.000, gracias a VA", { count: 1, usd: 2000, via: 1, viaUsd: 2000, sinRespuesta: 0 }, d("parts"));

  // Volver a publicar: la venta se borra y no cuenta.
  await prisma.aircraft.update({ where: { id: a2.id }, data: { status: "ACTIVE", ...CLEARED_SALE } });
  const relisted = await getSalesStats(null);
  check("4. Volver a publicar: deja de contar", before.aircraft.count + 1, relisted.aircraft.count);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.aircraft.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.sparePart.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.table(results.map((r) => ({ caso: r.caso, esperado: r.esperado, obtenido: r.obtenido, "": r.ok ? "✓" : "✗" })));
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `${failed} de ${results.length} fallaron` : `${results.length}/${results.length} bien`);
    if (failed) process.exitCode = 1;
    await prisma.$disconnect();
  });
