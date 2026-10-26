// VA-151: cada número del panel de métricas contra una consulta SQL directa (tabla métrica → panel →
// SQL), con datos de prueba en va_dev. Crea un vendedor con el Empresarial de cortesía, dos
// repuestos, vistas, clics, preguntas, favoritos y visitas al perfil, y borra todo al final.
//
// Uso: npx tsx --require ./scripts/stub-server-only.cjs scripts/verify-seller-metrics.ts
import { prisma } from "@/lib/prisma";
import { computeSellerMetrics } from "@/lib/seller-metrics";
import { hasSellerMetrics } from "@/lib/subscriptions";

const DAY = 86_400_000;
const rows: { metrica: string; panel: string; sql: string; ok: boolean }[] = [];
const check = (metrica: string, panel: number | string, sql: number | string) => rows.push({ metrica, panel: String(panel), sql: String(sql), ok: String(panel) === String(sql) });

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "localhost" || url.pathname !== "/va_dev") throw new Error("Solo contra va_dev local.");
  const now = Date.now();
  const ago = (d: number, h = 12) => new Date(now - d * DAY + h * 3_600_000 - 12 * 3_600_000);
  const categoryId = (await prisma.category.findFirstOrThrow({ where: { parentId: { not: null } }, select: { id: true } })).id;
  // VA-152: las métricas vienen con el Empresarial.
  const va = await prisma.plan.findFirstOrThrow({ where: { tier: "BUSINESS", isUnlimitedAircraft: true, isUnlimitedSpareParts: true, archivedAt: null } });

  const seller = await prisma.user.create({ data: { email: `va151-vendedor-${now}@ventasaeronauticas.test`, name: "Vendedor VA-151" } });
  const buyer = await prisma.user.create({ data: { email: `va151-comprador-${now}@ventasaeronauticas.test`, name: "Comprador VA-151" } });
  const plain = await prisma.user.create({ data: { email: `va151-sin-plan-${now}@ventasaeronauticas.test`, name: "Sin plan VA-151" } });
  const users = [seller.id, buyer.id, plain.id];
  try {
    await prisma.subscription.create({ data: { userId: seller.id, planId: va.id, status: "ACTIVE", source: "MANUAL", currentPeriodStart: new Date(now - DAY), currentPeriodEnd: new Date(now + 30 * DAY) } });
    const mk = (title: string) => prisma.sparePart.create({ data: { sellerId: seller.id, title, city: "Córdoba", province: "Córdoba", description: "Prueba VA-151", categoryId, status: "ACTIVE" } });
    const a = await mk("Repuesto A (VA-151)");
    const b = await mk("Repuesto B (VA-151)");
    const c = await mk("Repuesto C sin vistas (VA-151)");

    // Vistas: 5 de A y 2 de B en los últimos 30 días (2 de A en los últimos 7), 3 de A en el período anterior.
    const view = (id: string, at: Date) => prisma.analyticsEvent.create({ data: { eventType: "SPARE_PART_VIEW", sparePartId: id, anonymousId: `anon-${at.getTime()}-${Math.random()}`, createdAt: at } });
    for (const d of [1, 3, 10, 20, 29]) await view(a.id, ago(d));
    for (const d of [2, 15]) await view(b.id, ago(d));
    for (const d of [35, 40, 50]) await view(a.id, ago(d));
    // Clics: WhatsApp 2 (uno del propio vendedor, que no cuenta), teléfono 1, email 1.
    const click = (type: "WHATSAPP_CLICK" | "PHONE_CLICK" | "EMAIL_CLICK", id: string, at: Date, userId: string | null = buyer.id) =>
      prisma.analyticsEvent.create({ data: { eventType: type, sparePartId: id, userId, createdAt: at } });
    await click("WHATSAPP_CLICK", a.id, ago(2));
    await click("WHATSAPP_CLICK", a.id, ago(3));
    await click("WHATSAPP_CLICK", a.id, ago(4), seller.id);
    await click("PHONE_CLICK", b.id, ago(12));
    await click("EMAIL_CLICK", a.id, ago(40));
    // Preguntas ("Formulario"): 1 de un comprador en el período; 1 del propio vendedor (no cuenta).
    await prisma.question.create({ data: { userId: buyer.id, sparePartId: b.id, question: "¿Sigue disponible?", createdAt: ago(5) } });
    await prisma.question.create({ data: { userId: seller.id, sparePartId: b.id, question: "Prueba del dueño", createdAt: ago(5) } });
    // Favoritos nuevos: 1 en el período.
    await prisma.favorite.create({ data: { userId: buyer.id, sparePartId: a.id, createdAt: ago(6) } });
    // Visitas al perfil: 3 en el período, 1 en el anterior.
    for (const d of [1, 8, 25, 45]) await prisma.analyticsEvent.create({ data: { eventType: "PROFILE_VIEW", profileUserId: seller.id, anonymousId: `p-${d}`, createdAt: ago(d) } });

    const m30 = await computeSellerMetrics(seller.id, 30, now);
    const m7 = await computeSellerMetrics(seller.id, 7, now);
    const from30 = new Date(now - 30 * DAY);
    const from7 = new Date(now - 7 * DAY);
    const prev30 = new Date(now - 60 * DAY);
    const sql = async (q: Promise<{ n: bigint }[]>) => Number((await q)[0].n);

    const views30 = await sql(prisma.$queryRaw`SELECT count(*) AS n FROM "AnalyticsEvent" e JOIN "SparePart" s ON s.id = e."sparePartId" WHERE s."sellerId" = ${seller.id} AND e."eventType" = 'SPARE_PART_VIEW' AND e."createdAt" >= ${from30}`);
    const viewsPrev = await sql(prisma.$queryRaw`SELECT count(*) AS n FROM "AnalyticsEvent" e JOIN "SparePart" s ON s.id = e."sparePartId" WHERE s."sellerId" = ${seller.id} AND e."eventType" = 'SPARE_PART_VIEW' AND e."createdAt" >= ${prev30} AND e."createdAt" < ${from30}`);
    const views7 = await sql(prisma.$queryRaw`SELECT count(*) AS n FROM "AnalyticsEvent" e JOIN "SparePart" s ON s.id = e."sparePartId" WHERE s."sellerId" = ${seller.id} AND e."eventType" = 'SPARE_PART_VIEW' AND e."createdAt" >= ${from7}`);
    const clicks30 = await sql(prisma.$queryRaw`SELECT count(*) AS n FROM "AnalyticsEvent" e JOIN "SparePart" s ON s.id = e."sparePartId" WHERE s."sellerId" = ${seller.id} AND e."eventType" IN ('WHATSAPP_CLICK','PHONE_CLICK','EMAIL_CLICK') AND e."createdAt" >= ${from30} AND (e."userId" IS NULL OR e."userId" <> ${seller.id})`);
    const questions30 = await sql(prisma.$queryRaw`SELECT count(*) AS n FROM "Question" q JOIN "SparePart" s ON s.id = q."sparePartId" WHERE s."sellerId" = ${seller.id} AND q."createdAt" >= ${from30} AND q."userId" <> ${seller.id}`);
    const favs30 = await sql(prisma.$queryRaw`SELECT count(*) AS n FROM "Favorite" f JOIN "SparePart" s ON s.id = f."sparePartId" WHERE s."sellerId" = ${seller.id} AND f."createdAt" >= ${from30}`);
    const visits30 = await sql(prisma.$queryRaw`SELECT count(*) AS n FROM "AnalyticsEvent" WHERE "eventType" = 'PROFILE_VIEW' AND "profileUserId" = ${seller.id} AND "createdAt" >= ${from30}`);
    const wa30 = await sql(prisma.$queryRaw`SELECT count(*) AS n FROM "AnalyticsEvent" e JOIN "SparePart" s ON s.id = e."sparePartId" WHERE s."sellerId" = ${seller.id} AND e."eventType" = 'WHATSAPP_CLICK' AND e."createdAt" >= ${from30} AND e."userId" <> ${seller.id}`);
    const aViews = await sql(prisma.$queryRaw`SELECT count(*) AS n FROM "AnalyticsEvent" WHERE "sparePartId" = ${a.id} AND "eventType" = 'SPARE_PART_VIEW' AND "createdAt" >= ${from30}`);

    check("Vistas (30 días)", m30.totals.views.current, views30);
    check("Vistas (período anterior)", m30.totals.views.previous, viewsPrev);
    check("Vistas (7 días)", m7.totals.views.current, views7);
    check("Variación de vistas", `${m30.totals.views.change} %`, `${Math.round(((views30 - viewsPrev) / viewsPrev) * 100)} %`);
    check("Contactos (clics + preguntas, sin el dueño)", m30.totals.contacts.current, clicks30 + questions30);
    check("Contactos por WhatsApp", m30.channels.find((x) => x.key === "WHATSAPP")!.count, wa30);
    check("Contactos por formulario (preguntas)", m30.channels.find((x) => x.key === "FORM")!.count, questions30);
    check("Favoritos nuevos", m30.totals.favorites.current, favs30);
    check("Visitas a la Página VA", m30.totals.profileVisits.current, visits30);
    check("Vistas por día: suma = total", m30.viewsByDay.reduce((s, d) => s + d.views, 0), views30);
    check("Vistas por día: cantidad de días", m30.viewsByDay.length, 30);
    const la = m30.listings.find((l) => l.id === a.id)!;
    check("Repuesto A: vistas", la.views, aViews);
    check("Repuesto A: tasa de contacto", la.contactRate ?? "—", Math.round(((2 /* WA de compradores */ + 0) / aViews) * 1000) / 10);
    check("Repuesto C: sin vistas", m30.listings.find((l) => l.id === c.id)!.views, 0);
    check("Acceso: vendedor con Empresarial", String(await hasSellerMetrics(seller.id)), "true");
    check("Acceso: usuario sin plan (ni por la action)", String(await hasSellerMetrics(plain.id)), "false");
  } finally {
    await prisma.analyticsEvent.deleteMany({ where: { OR: [{ sparePart: { sellerId: seller.id } }, { profileUserId: seller.id }] } });
    await prisma.question.deleteMany({ where: { userId: { in: users } } });
    await prisma.favorite.deleteMany({ where: { userId: { in: users } } });
    await prisma.sparePart.deleteMany({ where: { sellerId: seller.id } });
    await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
  console.table(rows.map((r) => ({ ...r, ok: r.ok ? "✔" : "✘" })));
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}
main();
