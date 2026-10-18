"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { getDolarRates } from "@/lib/dolar";
import { Resend } from "resend";
import { EMAIL_FROM, getSupportEmail } from "@/lib/mail";
import {
  AnalyticsEventType,
  Prisma,
  AircraftStatus,
  SparePartStatus,
  PaymentStatus,
  SubscriptionStatus
} from "@prisma/client";

const resend = new Resend(process.env.RESEND_API_KEY);

export type PeriodFilter = "today" | "30d" | "all" | "custom";


export interface DateRange {
  startDate?: string;
  endDate?: string;
}

function resolveDateRange(period: PeriodFilter, range?: DateRange) {
  const now = new Date();
  let start = new Date();

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "30d") {
    start.setDate(now.getDate() - 30);
  } else if (period === "all") {
    // Fecha de inicio distante para abarcar todo el histórico
    start = new Date(0);
  } else if (period === "custom" && range?.startDate) {
    start = new Date(range.startDate);
    const end = range.endDate ? new Date(range.endDate) : now;
    return { start, end };
  }

  return { start, end: now };
}

// ---------------------------------------------------------
// Fragmentos SQL compartidos (VA-12). Los totales se calculan en la base con GROUP BY en vez de
// traer todos los eventos a memoria. Los tipos de evento son constantes del código (no vienen del
// usuario), por eso se pueden escribir como literales.
// ---------------------------------------------------------
const VIEW_TYPES: AnalyticsEventType[] = [AnalyticsEventType.AIRCRAFT_VIEW, AnalyticsEventType.SPARE_PART_VIEW];
const CONTACT_TYPES: AnalyticsEventType[] = [AnalyticsEventType.WHATSAPP_CLICK, AnalyticsEventType.PHONE_CLICK, AnalyticsEventType.EMAIL_CLICK];
const sqlTypeList = (types: AnalyticsEventType[]) => Prisma.raw(`(${types.map((t) => `'${t}'`).join(", ")})`);
const VIEW_TYPES_SQL = sqlTypeList(VIEW_TYPES);
const CONTACT_TYPES_SQL = sqlTypeList(CONTACT_TYPES);

// Término buscado, normalizado igual que en logSearch (los eventos viejos usaban otras claves).
const SEARCH_TERM_SQL = Prisma.sql`lower(btrim(coalesce("metadata"->>'query', "metadata"->>'searchQuery', "metadata"->>'term', '')))`;

// Mismo criterio que activeListingWhere() (lib/listing-filters.ts), para consultas en SQL.
const activeListingSql = (now: Date) =>
  Prisma.sql`"status" = 'ACTIVE' AND ("listingExpiresAt" IS NULL OR "listingExpiresAt" >= ${now})`;

const DIRECT_TRAFFIC_LABEL = "Tráfico Directo / App";

async function requireAdmin(message = "Acceso denegado.") {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    throw new Error(message);
  }
  return user;
}

// Dólar oficial (venta) de dolarapi.com, cacheado 10 minutos en lib/dolar.ts. Si la API no
// responde se devuelve null y los montos en dólares se muestran como "sin cotización" en vez de
// convertirse con un número inventado.
async function getUsdArsRate(): Promise<number | null> {
  try {
    const rates = await getDolarRates();
    const oficial = rates.find((r) => r.casa === "oficial");
    return oficial && Number.isFinite(oficial.venta) && oficial.venta > 0 ? oficial.venta : null;
  } catch {
    return null;
  }
}

// =========================================================
// DASHBOARD DE MÉTRICAS (KPIs) - PESOS ARGENTINOS (ARS)
// =========================================================
export async function getDashboardMetrics() {
  await requireAdmin("Acceso denegado. Se requieren permisos de administrador.");

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    usdArs,
    activeSubscriptions,
    thisMonthPurchases,
    lastMonthPurchases,
    mauRows,
    activeAircrafts,
    activeSpareParts,
    publisherRows,
    contactsGenerated,
    soldAircrafts,
    soldSpareParts,
  ] = await Promise.all([
    getUsdArsRate(),
    prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      select: { plan: { select: { price: true, billingInterval: true } } },
    }),
    prisma.purchase.aggregate({
      where: { paymentStatus: PaymentStatus.APPROVED, createdAt: { gte: startOfThisMonth } },
      _sum: { finalPrice: true },
    }),
    prisma.purchase.aggregate({
      where: { paymentStatus: PaymentStatus.APPROVED, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
      _sum: { finalPrice: true },
    }),
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(DISTINCT "userId")::int AS n FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${thirtyDaysAgo} AND "userId" IS NOT NULL`,
    prisma.aircraft.count({ where: activeListingWhere(now) }),
    prisma.sparePart.count({ where: activeListingWhere(now) }),
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(DISTINCT "sellerId")::int AS n FROM (
        SELECT "sellerId" FROM "Aircraft" WHERE ${activeListingSql(now)}
        UNION ALL
        SELECT "sellerId" FROM "SparePart" WHERE ${activeListingSql(now)}
      ) t`,
    prisma.analyticsEvent.count({
      where: { eventType: { in: [...CONTACT_TYPES, AnalyticsEventType.CONTACT_SELLER] } },
    }),
    prisma.aircraft.aggregate({ where: { status: AircraftStatus.SOLD }, _sum: { price: true }, _count: true }),
    prisma.sparePart.groupBy({
      by: ["inPesos"],
      where: { status: SparePartStatus.SOLD },
      _sum: { price: true },
      _count: true,
    }),
  ]);

  // Los planes y las compras están en dólares: sin cotización no se pueden pasar a pesos.
  const toPesos = (usd: number) => (usdArs === null ? null : usd * usdArs);

  let mrrUsd = 0;
  activeSubscriptions.forEach((sub) => {
    const price = Number(sub.plan.price) || 0;
    mrrUsd += sub.plan.billingInterval === "YEARLY" ? price / 12 : price;
  });

  const revThisMonth = Number(thisMonthPurchases._sum.finalPrice) || 0;
  const revLastMonth = Number(lastMonthPurchases._sum.finalPrice) || 0;
  const revenueGrowth = revLastMonth > 0 ? ((revThisMonth - revLastMonth) / revLastMonth) * 100 : 0;

  // GMV: aviones siempre en dólares; repuestos en pesos o dólares según `inPesos`.
  let gmvUsd = Number(soldAircrafts._sum.price) || 0;
  let gmvArs = 0;
  let soldSparePartsCount = 0;
  soldSpareParts.forEach((group) => {
    const sum = Number(group._sum.price) || 0;
    if (group.inPesos) gmvArs += sum;
    else gmvUsd += sum;
    soldSparePartsCount += group._count;
  });
  const gmvUsdInPesos = toPesos(gmvUsd);
  const mrr = toPesos(mrrUsd);

  return {
    mrr,
    arr: mrr === null ? null : mrr * 12,
    revenueGrowth: Number(revenueGrowth.toFixed(1)),
    mau: mauRows[0]?.n ?? 0,
    activePublishers: publisherRows[0]?.n ?? 0,
    activeListings: activeAircrafts + activeSpareParts,
    contactsGenerated,
    completedSales: soldAircrafts._count + soldSparePartsCount,
    gmv: gmvUsdInPesos === null ? null : gmvUsdInPesos + gmvArs,
    usdArsRate: usdArs,
    // EBITDA, retención y CAC necesitan datos que el sistema todavía no tiene (costos, gasto en
    // marketing, historial de renovaciones). Antes se mostraban 45 %, 78 % y $15.000 inventados.
    ebitda: null as number | null,
    retentionRate: null as number | null,
    cac: null as number | null,
  };
}

// =========================================================
// RESPALDO Y PURGA AUTOMÁTICA DE ANALÍTICAS (>90 DÍAS)
// =========================================================
const CSV_BATCH_SIZE = 5000;
const CSV_HEADER =
  "ID,Fecha,Tipo_Evento,ID_Usuario,ID_Anonimo,ID_Aeronave,ID_Repuesto,Referrer,UTM_Source,UTM_Medium,UTM_Campaign,Metadata\n";

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function ninetyDaysAgoCutoff() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  return cutoff;
}

// Arma el CSV de los eventos anteriores a `cutoff` leyendo de a 5.000 (cursor por id), en vez de
// traerlos todos en una sola consulta.
async function buildOldEventsCsv(cutoff: Date) {
  const rows: string[] = [];
  let cursor: string | undefined;

  for (;;) {
    const batch = await prisma.analyticsEvent.findMany({
      where: { createdAt: { lt: cutoff } },
      select: {
        id: true,
        createdAt: true,
        eventType: true,
        userId: true,
        anonymousId: true,
        aircraftId: true,
        sparePartId: true,
        referrer: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        metadata: true,
      },
      orderBy: { id: "asc" },
      take: CSV_BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    for (const ev of batch) {
      rows.push(
        [
          ev.id,
          ev.createdAt.toISOString(),
          ev.eventType,
          ev.userId,
          ev.anonymousId,
          ev.aircraftId,
          ev.sparePartId,
          ev.referrer,
          ev.utmSource,
          ev.utmMedium,
          ev.utmCampaign,
          JSON.stringify(ev.metadata || {}),
        ]
          .map(csvCell)
          .join(",")
      );
    }

    if (batch.length < CSV_BATCH_SIZE) break;
    cursor = batch[batch.length - 1].id;
  }

  return { content: CSV_HEADER + rows.join("\n"), count: rows.length };
}

export async function archiveAndPurgeOldAnalytics() {
  const user = await requireAdmin("Acceso denegado. Se requieren permisos de administrador.");

  // Fecha de corte fija: se borra exactamente lo que entró en el respaldo.
  const ninetyDaysAgo = ninetyDaysAgoCutoff();

  // 1 y 2. Planilla CSV con los eventos de más de 90 días
  const { content: csvContent, count } = await buildOldEventsCsv(ninetyDaysAgo);

  if (count === 0) {
    return { success: true, message: "No hay eventos antiguos para purgar.", purgedCount: 0 };
  }

  const fileName = `analiticas_historicas_${ninetyDaysAgo.toISOString().split("T")[0]}.csv`;

  const recipient = user.email || getSupportEmail();
  if (!recipient) {
    throw new Error("No hay un email de destino para el respaldo. La purga fue cancelada.");
  }

  try {
    // 3. Enviar planilla por Email antes de borrar
    const { error: sendError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [recipient],
      subject: `📊 Resumen y Archivo de Analíticas (>90 días) - ${count} registros`,
      html: `
        <h2>Resumen de Purga de Analíticas</h2>
        <p>Se han respaldado y purgado <strong>${count} registros</strong> anteriores al ${ninetyDaysAgo.toLocaleDateString('es-AR')}.</p>
        <p>Adjunto a este correo encontrarás la planilla CSV con el desglose completo.</p>
      `,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(csvContent).toString("base64"),
        },
      ],
    });

    // Resend no lanza excepción si falla: sin este chequeo se borraba todo sin respaldo.
    if (sendError) {
      throw new Error(`Resend: ${sendError.message}`);
    }

    // 4. Borrar registros de la base de datos tras envío exitoso
    const deleteResult = await prisma.analyticsEvent.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    });

    return {
      success: true,
      purgedCount: deleteResult.count,
      message: `Se exportaron y purgaron ${deleteResult.count} eventos exitosamente.`,
    };
  } catch (error) {
    console.error("Error en el proceso de archivado/purga:", error);
    throw new Error("No se pudo respaldar la información. La purga fue cancelada por seguridad.");
  }
}

// =========================================================
// REPORTES Y ANALÍTICAS EXISTENTES
// =========================================================
export async function getDashboardOverview(period: PeriodFilter = "30d", range?: DateRange) {
  await requireAdmin("Acceso denegado. Se requieren permisos de administrador.");

  const { start, end } = resolveDateRange(period, range);

  const dateWhere = {
    createdAt: {
      gte: start,
      lte: end,
    },
  };

  const [
    eventTotals,
    activeAircraftCount,
    activePartsCount,
    newAircraftCount,
    newPartsCount,
    leadCount,
    sparePartLeadCount,
    dailyRows,
  ] = await Promise.all([
    // Visitantes únicos: cookie va_anon (VA-15); si un evento no la tiene, cuenta el usuario.
    prisma.$queryRaw<
      {
        visitors: number;
        users: number;
        aircraftViews: number;
        partsViews: number;
        whatsapp: number;
        phone: number;
        email: number;
      }[]
    >`
      SELECT
        COUNT(DISTINCT COALESCE("anonymousId", 'user:' || "userId"))::int AS "visitors",
        COUNT(DISTINCT "userId")::int AS "users",
        COUNT(*) FILTER (WHERE "eventType" = 'AIRCRAFT_VIEW')::int AS "aircraftViews",
        COUNT(*) FILTER (WHERE "eventType" = 'SPARE_PART_VIEW')::int AS "partsViews",
        COUNT(*) FILTER (WHERE "eventType" = 'WHATSAPP_CLICK')::int AS "whatsapp",
        COUNT(*) FILTER (WHERE "eventType" = 'PHONE_CLICK')::int AS "phone",
        COUNT(*) FILTER (WHERE "eventType" = 'EMAIL_CLICK')::int AS "email"
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}`,
    prisma.aircraft.count({ where: activeListingWhere() }),
    prisma.sparePart.count({ where: activeListingWhere() }),
    prisma.aircraft.count({ where: dateWhere }),
    prisma.sparePart.count({ where: dateWhere }),
    prisma.lead.count({ where: dateWhere }),
    prisma.sparePartLead.count({ where: dateWhere }),
    // Gráfico diario agrupado en la base (antes se traían todos los eventos del período).
    prisma.$queryRaw<{ date: string; views: number; contacts: number }[]>`
      SELECT
        to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS "date",
        COUNT(*) FILTER (WHERE "eventType" IN ${VIEW_TYPES_SQL})::int AS "views",
        COUNT(*) FILTER (WHERE "eventType" IN ${CONTACT_TYPES_SQL})::int AS "contacts"
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
      GROUP BY 1
      ORDER BY 1`,
  ]);

  const totals = eventTotals[0];

  const viewsBreakdown = {
    aircraftViews: totals?.aircraftViews ?? 0,
    partsViews: totals?.partsViews ?? 0,
  };

  const contactsBreakdown = {
    whatsapp: totals?.whatsapp ?? 0,
    phone: totals?.phone ?? 0,
    email: totals?.email ?? 0,
    formLeads: leadCount + sparePartLeadCount,
  };

  return {
    period,
    range: { start: start.toISOString(), end: end.toISOString() },
    kpis: {
      uniqueVisitors: totals?.visitors ?? 0,
      identifiedUsers: totals?.users ?? 0,
      activeListings: activeAircraftCount + activePartsCount,
      newListings: newAircraftCount + newPartsCount,
      totalViews: viewsBreakdown.aircraftViews + viewsBreakdown.partsViews,
      totalContacts:
        contactsBreakdown.whatsapp +
        contactsBreakdown.phone +
        contactsBreakdown.email +
        contactsBreakdown.formLeads,
    },
    viewsBreakdown,
    contactsBreakdown,
    chartData: dailyRows,
  };
}

type ListingKind = "A" | "S";
type ListingDetail = {
  id: string;
  title: string;
  type: "Aeronave" | "Repuesto";
  price: number | null;
  inPesos: boolean;
  status: string;
  createdAt: Date;
  detailUrl: string;
};
const listingKey = (kind: ListingKind, id: string) => `${kind}:${id}`;

// Publicaciones con vistas y contactos del período (VA-12): la tabla viene paginada desde la base
// y los "Top 5" se calculan con GROUP BY, en vez de traer todas las publicaciones y filtrar los
// eventos de cada una en memoria. Contactos = clics en WhatsApp/teléfono/email + consultas por
// formulario, todo dentro del período.
export async function getListingsAnalytics(
  period: PeriodFilter = "30d",
  range?: DateRange,
  page = 1,
  pageSize = 10
) {
  await requireAdmin();

  const { start, end } = resolveDateRange(period, range);
  const dateWhere = { createdAt: { gte: start, lte: end } };
  const size = Math.min(50, Math.max(1, Math.floor(Number(pageSize)) || 10));

  const [aircraftTotal, sparePartTotal] = await Promise.all([prisma.aircraft.count(), prisma.sparePart.count()]);
  const totalItems = aircraftTotal + sparePartTotal;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(Number(page)) || 1));
  const offset = (currentPage - 1) * size;

  const [pageRows, topViewedRows, topContactedRows] = await Promise.all([
    prisma.$queryRaw<{ id: string; kind: ListingKind }[]>`
      SELECT "id", "kind" FROM (
        SELECT "id", 'A' AS "kind", "createdAt" FROM "Aircraft"
        UNION ALL
        SELECT "id", 'S' AS "kind", "createdAt" FROM "SparePart"
      ) t
      ORDER BY "createdAt" DESC, "id"
      LIMIT ${Prisma.raw(String(size))} OFFSET ${Prisma.raw(String(offset))}`,
    prisma.$queryRaw<{ id: string; kind: ListingKind; n: number }[]>`
      SELECT
        COALESCE("aircraftId", "sparePartId") AS "id",
        CASE WHEN "aircraftId" IS NOT NULL THEN 'A' ELSE 'S' END AS "kind",
        COUNT(*)::int AS "n"
      FROM "AnalyticsEvent"
      WHERE "eventType" IN ${VIEW_TYPES_SQL}
        AND "createdAt" >= ${start} AND "createdAt" <= ${end}
        AND ("aircraftId" IS NOT NULL OR "sparePartId" IS NOT NULL)
      GROUP BY 1, 2
      ORDER BY "n" DESC, "id"
      LIMIT 5`,
    prisma.$queryRaw<{ id: string; kind: ListingKind; n: number }[]>`
      SELECT "id", "kind", SUM("n")::int AS "n" FROM (
        SELECT "aircraftId" AS "id", 'A' AS "kind", COUNT(*) AS "n" FROM "AnalyticsEvent"
        WHERE "eventType" IN ${CONTACT_TYPES_SQL} AND "aircraftId" IS NOT NULL
          AND "createdAt" >= ${start} AND "createdAt" <= ${end}
        GROUP BY 1
        UNION ALL
        SELECT "sparePartId", 'S', COUNT(*) FROM "AnalyticsEvent"
        WHERE "eventType" IN ${CONTACT_TYPES_SQL} AND "sparePartId" IS NOT NULL
          AND "createdAt" >= ${start} AND "createdAt" <= ${end}
        GROUP BY 1
        UNION ALL
        SELECT "aircraftId", 'A', COUNT(*) FROM "Lead"
        WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
        GROUP BY 1
        UNION ALL
        SELECT "sparePartId", 'S', COUNT(*) FROM "SparePartLead"
        WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
        GROUP BY 1
      ) t
      GROUP BY 1, 2
      ORDER BY "n" DESC, "id"
      LIMIT 5`,
  ]);

  const pageAircraftIds = pageRows.filter((r) => r.kind === "A").map((r) => r.id);
  const pageSparePartIds = pageRows.filter((r) => r.kind === "S").map((r) => r.id);
  const allAircraftIds = new Set(pageAircraftIds);
  const allSparePartIds = new Set(pageSparePartIds);
  for (const row of [...topViewedRows, ...topContactedRows]) {
    (row.kind === "A" ? allAircraftIds : allSparePartIds).add(row.id);
  }

  const [aircrafts, spareParts, aircraftEvents, sparePartEvents, aircraftLeads, sparePartLeads] = await Promise.all([
    prisma.aircraft.findMany({
      where: { id: { in: [...allAircraftIds] } },
      select: { id: true, title: true, price: true, status: true, createdAt: true },
    }),
    prisma.sparePart.findMany({
      where: { id: { in: [...allSparePartIds] } },
      select: { id: true, title: true, price: true, inPesos: true, status: true, createdAt: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["aircraftId", "eventType"],
      where: { ...dateWhere, aircraftId: { in: pageAircraftIds }, eventType: { in: [...VIEW_TYPES, ...CONTACT_TYPES] } },
      _count: true,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["sparePartId", "eventType"],
      where: { ...dateWhere, sparePartId: { in: pageSparePartIds }, eventType: { in: [...VIEW_TYPES, ...CONTACT_TYPES] } },
      _count: true,
    }),
    prisma.lead.groupBy({ by: ["aircraftId"], where: { ...dateWhere, aircraftId: { in: pageAircraftIds } }, _count: true }),
    prisma.sparePartLead.groupBy({
      by: ["sparePartId"],
      where: { ...dateWhere, sparePartId: { in: pageSparePartIds } },
      _count: true,
    }),
  ]);

  // Vistas y contactos de cada publicación de la página, indexados por id.
  const metrics = new Map<string, { views: number; contacts: number }>();
  const metricFor = (key: string) => {
    let m = metrics.get(key);
    if (!m) {
      m = { views: 0, contacts: 0 };
      metrics.set(key, m);
    }
    return m;
  };
  const addEvent = (key: string, eventType: AnalyticsEventType, count: number) => {
    if (VIEW_TYPES.includes(eventType)) metricFor(key).views += count;
    else metricFor(key).contacts += count;
  };
  aircraftEvents.forEach((e) => e.aircraftId && addEvent(listingKey("A", e.aircraftId), e.eventType, e._count));
  sparePartEvents.forEach((e) => e.sparePartId && addEvent(listingKey("S", e.sparePartId), e.eventType, e._count));
  aircraftLeads.forEach((l) => (metricFor(listingKey("A", l.aircraftId)).contacts += l._count));
  sparePartLeads.forEach((l) => (metricFor(listingKey("S", l.sparePartId)).contacts += l._count));

  const details = new Map<string, ListingDetail>();
  aircrafts.forEach((item) =>
    details.set(listingKey("A", item.id), {
      id: item.id,
      title: item.title,
      type: "Aeronave",
      price: item.price ? Number(item.price) : null,
      inPesos: false,
      status: item.status,
      createdAt: item.createdAt,
      detailUrl: `/aircraft/${item.id}`,
    })
  );
  spareParts.forEach((item) =>
    details.set(listingKey("S", item.id), {
      id: item.id,
      title: item.title,
      type: "Repuesto",
      price: item.price ? Number(item.price) : null,
      inPesos: item.inPesos,
      status: item.status,
      createdAt: item.createdAt,
      detailUrl: `/spareparts/sparepart-details/${item.id}`,
    })
  );

  const listings = pageRows
    .map((row) => {
      const key = listingKey(row.kind, row.id);
      const detail = details.get(key);
      if (!detail) return null;
      const m = metrics.get(key) ?? { views: 0, contacts: 0 };
      return { ...detail, views: m.views, contacts: m.contacts };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Une cada fila del ranking con los datos de su publicación (las que ya no existen se descartan).
  const withDetail = (rows: { id: string; kind: ListingKind; n: number }[]) =>
    rows.flatMap((row) => {
      const detail = details.get(listingKey(row.kind, row.id));
      return detail ? [{ detail, n: row.n }] : [];
    });

  return {
    listings,
    mostViewed: withDetail(topViewedRows).map(({ detail, n }) => ({ ...detail, views: n })),
    mostContacted: withDetail(topContactedRows).map(({ detail, n }) => ({ ...detail, contacts: n })),
    page: currentPage,
    pageSize: size,
    totalItems,
    totalPages,
  };
}

// Términos más buscados, agrupados en la base (VA-12). Se devuelven los 200 más frecuentes.
export async function getSearchesAnalytics(period: PeriodFilter = "30d", range?: DateRange) {
  await requireAdmin();

  const { start, end } = resolveDateRange(period, range);

  const [totalSearches, topSearches] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: start, lte: end }, eventType: AnalyticsEventType.SEARCH },
    }),
    prisma.$queryRaw<{ term: string; count: number; lastSearched: Date }[]>`
      SELECT "term", COUNT(*)::int AS "count", MAX("createdAt") AS "lastSearched" FROM (
        SELECT ${SEARCH_TERM_SQL} AS "term", "createdAt" FROM "AnalyticsEvent"
        WHERE "eventType" = 'SEARCH' AND "createdAt" >= ${start} AND "createdAt" <= ${end}
      ) t
      WHERE "term" <> ''
      GROUP BY "term"
      ORDER BY "count" DESC, "term"
      LIMIT 200`,
  ]);

  return {
    totalSearches,
    topSearches,
  };
}

export async function getContactsAnalytics(period: PeriodFilter = "30d", range?: DateRange) {
  await requireAdmin();

  const { start, end } = resolveDateRange(period, range);
  const dateWhere = { createdAt: { gte: start, lte: end } };
  const RECENT_LEADS = 50;

  const [channelCounts, aircraftLeadCount, sparePartLeadCount, aircraftLeads, sparePartLeads] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["eventType"],
      where: { ...dateWhere, eventType: { in: CONTACT_TYPES } },
      _count: true,
    }),
    prisma.lead.count({ where: dateWhere }),
    prisma.sparePartLead.count({ where: dateWhere }),
    prisma.lead.findMany({
      where: dateWhere,
      include: {
        aircraft: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_LEADS,
    }),
    prisma.sparePartLead.findMany({
      where: dateWhere,
      include: {
        sparePart: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_LEADS,
    }),
  ]);

  const channelCount = (type: AnalyticsEventType) => channelCounts.find((c) => c.eventType === type)?._count ?? 0;
  const channels = {
    whatsapp: channelCount(AnalyticsEventType.WHATSAPP_CLICK),
    phone: channelCount(AnalyticsEventType.PHONE_CLICK),
    email: channelCount(AnalyticsEventType.EMAIL_CLICK),
    formLeads: aircraftLeadCount + sparePartLeadCount,
  };

  const recentLeads = [
    ...aircraftLeads.map((l) => ({
      id: l.id,
      buyerName: l.buyerName,
      buyerEmail: l.buyerEmail,
      buyerPhone: l.buyerPhone,
      message: l.message,
      productTitle: l.aircraft.title,
      productType: "Aeronave",
      createdAt: l.createdAt,
    })),
    ...sparePartLeads.map((l) => ({
      id: l.id,
      buyerName: l.buyerName,
      buyerEmail: l.buyerEmail,
      buyerPhone: l.buyerPhone,
      message: l.message,
      productTitle: l.sparePart.title,
      productType: "Repuesto",
      createdAt: l.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, RECENT_LEADS);

  return {
    channels,
    totalInteractions: channels.whatsapp + channels.phone + channels.email + channels.formLeads,
    recentLeads,
  };
}

// Orígenes del tráfico agrupados en la base (VA-12). El origen es el dominio del referrer externo
// (sin "www."); si no hay referrer pero llegó con utm_source (VA-15), se usa ese.
export async function getTrafficSourcesAnalytics(period: PeriodFilter = "30d", range?: DateRange) {
  await requireAdmin("Acceso denegado. Se requieren permisos de administrador.");

  const { start, end } = resolveDateRange(period, range);

  const rows = await prisma.$queryRaw<{ source: string; registered: boolean; events: number; contacts: number }[]>`
    SELECT "source", "registered", COUNT(*)::int AS "events", COUNT(*) FILTER (WHERE "isContact")::int AS "contacts"
    FROM (
      SELECT
        COALESCE(
          lower(substring(btrim("referrer") from '^[A-Za-z][A-Za-z0-9+.-]*://(?:www[.])?([^/:?#]+)')),
          NULLIF(btrim("referrer"), ''),
          NULLIF(lower(btrim("utmSource")), ''),
          ${DIRECT_TRAFFIC_LABEL}
        ) AS "source",
        ("userId" IS NOT NULL) AS "registered",
        ("eventType" IN ${CONTACT_TYPES_SQL}) AS "isContact"
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    ) t
    GROUP BY 1, 2`;

  const referrerMap = new Map<string, { views: number; contacts: number }>();
  const userSegmentation = {
    registered: { views: 0, contacts: 0 },
    anonymous: { views: 0, contacts: 0 },
  };

  rows.forEach((row) => {
    const entry = referrerMap.get(row.source) ?? { views: 0, contacts: 0 };
    entry.views += row.events;
    entry.contacts += row.contacts;
    referrerMap.set(row.source, entry);

    const segment = row.registered ? userSegmentation.registered : userSegmentation.anonymous;
    segment.views += row.events;
    segment.contacts += row.contacts;
  });

  const topReferrers = [...referrerMap.entries()]
    .map(([source, m]) => ({ source, views: m.views, contacts: m.contacts }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10); // Top 10 orígenes

  return {
    topReferrers,
    userSegmentation,
  };
}

export async function getOpportunitiesAnalytics(period: PeriodFilter = "30d", range?: DateRange) {
  await requireAdmin();

  const { start, end } = resolveDateRange(period, range);
  const now = new Date();

  const [highDemandNoSupply, itemRows, activeAircraft, activeParts] = await Promise.all([
    // Búsquedas sin oferta: términos de más de 2 letras que no aparecen en el título de ninguna
    // publicación activa. Se agrupa primero y se compara una vez por término, en la base.
    prisma.$queryRaw<{ term: string; count: number }[]>`
      WITH "terms" AS (
        SELECT "term", COUNT(*)::int AS "count" FROM (
          SELECT ${SEARCH_TERM_SQL} AS "term" FROM "AnalyticsEvent"
          WHERE "eventType" = 'SEARCH' AND "createdAt" >= ${start} AND "createdAt" <= ${end}
        ) s
        WHERE length("term") > 2
        GROUP BY "term"
      )
      SELECT "term", "count" FROM "terms" t
      WHERE NOT EXISTS (
          SELECT 1 FROM "Aircraft" a WHERE ${activeListingSql(now)} AND strpos(lower(a."title"), t."term") > 0
        )
        AND NOT EXISTS (
          SELECT 1 FROM "SparePart" p WHERE ${activeListingSql(now)} AND strpos(lower(p."title"), t."term") > 0
        )
      ORDER BY "count" DESC, "term"
      LIMIT 5`,
    prisma.$queryRaw<{ id: string; views: number; contacts: number }[]>`
      SELECT
        COALESCE("aircraftId", "sparePartId") AS "id",
        COUNT(*) FILTER (WHERE "eventType" IN ${VIEW_TYPES_SQL})::int AS "views",
        COUNT(*) FILTER (WHERE "eventType" IN ${CONTACT_TYPES_SQL})::int AS "contacts"
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
        AND ("aircraftId" IS NOT NULL OR "sparePartId" IS NOT NULL)
        AND ("eventType" IN ${VIEW_TYPES_SQL} OR "eventType" IN ${CONTACT_TYPES_SQL})
      GROUP BY 1`,
    prisma.aircraft.findMany({ where: activeListingWhere(now), select: { id: true, title: true } }),
    prisma.sparePart.findMany({ where: activeListingWhere(now), select: { id: true, title: true } }),
  ]);

  const itemMetrics = new Map<string, { views: number; contacts: number }>(
    itemRows.map((row) => [row.id, { views: row.views, contacts: row.contacts }])
  );

  const itemsList = [
    ...activeAircraft.map((a) => ({ id: a.id, title: a.title, type: "Aeronave" })),
    ...activeParts.map((p) => ({ id: p.id, title: p.title, type: "Repuesto" })),
  ].map((item) => ({ ...item, ...(itemMetrics.get(item.id) ?? { views: 0, contacts: 0 }) }));

  const highTrafficLowConversion = itemsList
    .filter((i) => i.views >= 5 && i.contacts <= 1)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const highEfficiency = itemsList
    .filter((i) => i.views > 0 && i.contacts >= 2 && (i.contacts / i.views) >= 0.2)
    .map((i) => ({ ...i, ratio: Math.round((i.contacts / i.views) * 100) }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 5);

  return {
    highDemandNoSupply,
    highTrafficLowConversion,
    highEfficiency,
  };
}

export async function getLiveEvents(typeFilter?: string) {
  await requireAdmin();

  // Solo filtra por un tipo de evento que exista (antes cualquier texto llegaba a Prisma).
  const whereClause: Prisma.AnalyticsEventWhereInput = {};
  if (typeFilter && (Object.values(AnalyticsEventType) as string[]).includes(typeFilter)) {
    whereClause.eventType = typeFilter as AnalyticsEventType;
  }

  const events = await prisma.analyticsEvent.findMany({
    where: whereClause,
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      eventType: true,
      anonymousId: true,
      userId: true,
      aircraftId: true,
      sparePartId: true,
      metadata: true,
      createdAt: true,
    },
  });

  return events;
}

// Descarga directa del CSV de datos antiguos (>90 días)
export async function exportOldAnalyticsCSV() {
  await requireAdmin();

  const ninetyDaysAgo = ninetyDaysAgoCutoff();
  const { content, count } = await buildOldEventsCsv(ninetyDaysAgo);

  return {
    filename: `analiticas_90d_al_${ninetyDaysAgo.toISOString().split("T")[0]}.csv`,
    content,
    count,
  };
}
