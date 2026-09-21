"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
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

// =========================================================
// DASHBOARD DE MÉTRICAS (KPIs) - PESOS ARGENTINOS (ARS)
// =========================================================
export async function getDashboardMetrics() {
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) {
    throw new Error("Acceso denegado. Se requieren permisos de administrador.");
  }

  // Tasa de cambio de referencia para conversiones de USD a ARS
  const EXCHANGE_RATE_USD_ARS = 1200; 

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // 1 & 2: MRR y ARR en ARS
  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: SubscriptionStatus.ACTIVE },
    include: { plan: true }
  });
  
  let mrrInPesos = 0;
  activeSubscriptions.forEach(sub => {
    const price = Number(sub.plan.price) || 0;
    const priceInPesos = price * EXCHANGE_RATE_USD_ARS;
    
    if (sub.plan.billingInterval === 'YEARLY') {
      mrrInPesos += priceInPesos / 12;
    } else {
      mrrInPesos += priceInPesos;
    }
  });
  const arrInPesos = mrrInPesos * 12;

  // 4: Crecimiento de ingresos (% Mes/Año en ARS)
  const thisMonthPurchases = await prisma.purchase.aggregate({
    where: { paymentStatus: PaymentStatus.APPROVED, createdAt: { gte: startOfThisMonth } },
    _sum: { finalPrice: true }
  });
  const lastMonthPurchases = await prisma.purchase.aggregate({
    where: { paymentStatus: PaymentStatus.APPROVED, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
    _sum: { finalPrice: true }
  });
  
  const revThisMonth = (Number(thisMonthPurchases._sum.finalPrice) || 0) * EXCHANGE_RATE_USD_ARS;
  const revLastMonth = (Number(lastMonthPurchases._sum.finalPrice) || 0) * EXCHANGE_RATE_USD_ARS;
  const revenueGrowth = revLastMonth > 0 ? ((revThisMonth - revLastMonth) / revLastMonth) * 100 : 0;

  // 5: Usuarios Activos Mensuales (MAU)
  const mauData = await prisma.analyticsEvent.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: thirtyDaysAgo },
      userId: { not: null }
    }
  });
  const mau = mauData.length;

  // 7: Publicaciones Activas
  const activeAircrafts = await prisma.aircraft.count({ where: { status: AircraftStatus.ACTIVE } });
  const activeSpareParts = await prisma.sparePart.count({ where: { status: SparePartStatus.ACTIVE } });
  const activeListings = activeAircrafts + activeSpareParts;

  // 6: Publicadores Activos
  const aircraftSellers = await prisma.aircraft.findMany({
    where: { status: AircraftStatus.ACTIVE },
    select: { sellerId: true },
    distinct: ['sellerId']
  });
  const sparePartSellers = await prisma.sparePart.findMany({
    where: { status: SparePartStatus.ACTIVE },
    select: { sellerId: true },
    distinct: ['sellerId']
  });
  const uniquePublishers = new Set([
    ...aircraftSellers.map(s => s.sellerId),
    ...sparePartSellers.map(s => s.sellerId)
  ]);
  const activePublishers = uniquePublishers.size;

  // 8: Contactos generados
  const contactsGenerated = await prisma.analyticsEvent.count({
    where: {
      eventType: { 
        in: [
          AnalyticsEventType.WHATSAPP_CLICK, 
          AnalyticsEventType.PHONE_CLICK, 
          AnalyticsEventType.EMAIL_CLICK, 
          AnalyticsEventType.CONTACT_SELLER
        ] 
      }
    }
  });

  // 9 & 10: Ventas y GMV (Volumen Facilitado en ARS)
  const soldAircraftsList = await prisma.aircraft.findMany({
    where: { status: AircraftStatus.SOLD },
    select: { price: true }
  });
  const soldSparePartsList = await prisma.sparePart.findMany({
    where: { status: SparePartStatus.SOLD },
    select: { price: true, inPesos: true }
  });

  let gmvInPesos = 0;
  soldAircraftsList.forEach(item => {
    gmvInPesos += (Number(item.price) || 0) * EXCHANGE_RATE_USD_ARS;
  });

  soldSparePartsList.forEach(item => {
    const price = Number(item.price) || 0;
    if (item.inPesos) {
      gmvInPesos += price;
    } else {
      gmvInPesos += price * EXCHANGE_RATE_USD_ARS;
    }
  });

  const completedSales = soldAircraftsList.length + soldSparePartsList.length;

  return {
    mrr: mrrInPesos,
    arr: arrInPesos,
    ebitda: 45,
    revenueGrowth: Number(revenueGrowth.toFixed(1)),
    mau,
    activePublishers,
    activeListings,
    contactsGenerated,
    completedSales,
    gmv: gmvInPesos,
    retentionRate: 78,
    cac: 15000
  };
}

// =========================================================
// RESPALDO Y PURGA AUTOMÁTICA DE ANALÍTICAS (>90 DÍAS)
// =========================================================
export async function archiveAndPurgeOldAnalytics() {
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) {
    throw new Error("Acceso denegado. Se requieren permisos de administrador.");
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // 1. Obtener eventos con más de 90 días
  const oldEvents = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { lt: ninetyDaysAgo },
    },
    select: {
      id: true,
      eventType: true,
      userId: true,
      aircraftId: true,
      sparePartId: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (oldEvents.length === 0) {
    return { success: true, message: "No hay eventos antiguos para purgar.", purgedCount: 0 };
  }

  // 2. Generar planilla CSV
  const csvHeader = "ID,Fecha,Tipo_Evento,ID_Usuario,ID_Aeronave,ID_Repuesto,Metadata\n";
  const csvRows = oldEvents.map((ev) => {
    const metaStr = JSON.stringify(ev.metadata || {}).replace(/"/g, '""');
    return `"${ev.id}","${ev.createdAt.toISOString()}","${ev.eventType}","${ev.userId || ''}","${ev.aircraftId || ''}","${ev.sparePartId || ''}","${metaStr}"`;
  }).join("\n");

  const csvContent = csvHeader + csvRows;
  const fileName = `analiticas_historicas_${ninetyDaysAgo.toISOString().split("T")[0]}.csv`;

  try {
    // 3. Enviar planilla por Email antes de borrar
    await resend.emails.send({
      from: "Ventas Aeronáuticas <contacto@tu-dominio.com>",
      to: [user.email || "soporte@tu-dominio.com"],
      subject: `📊 Resumen y Archivo de Analíticas (>90 días) - ${oldEvents.length} registros`,
      html: `
        <h2>Resumen de Purga de Analíticas</h2>
        <p>Se han respaldado y purgado <strong>${oldEvents.length} registros</strong> anteriores al ${ninetyDaysAgo.toLocaleDateString('es-AR')}.</p>
        <p>Adjunto a este correo encontrarás la planilla CSV con el desglose completo.</p>
      `,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(csvContent).toString("base64"),
        },
      ],
    });

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
  } catch (error: any) {
    console.error("Error en el proceso de archivado/purga:", error);
    throw new Error("No se pudo respaldar la información. La purga fue cancelada por seguridad.");
  }
}

// =========================================================
// REPORTES Y ANALÍTICAS EXISTENTES
// =========================================================
export async function getDashboardOverview(period: PeriodFilter = "30d", range?: DateRange) {
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) {
    throw new Error("Acceso denegado. Se requieren permisos de administrador.");
  }

  const { start, end } = resolveDateRange(period, range);

  const dateWhere = {
    createdAt: {
      gte: start,
      lte: end,
    },
  };

  const [
    uniqueSessions,
    uniqueUsers,
    activeAircraftCount,
    activePartsCount,
    newAircraftCount,
    newPartsCount,
    viewEvents,
    contactEvents,
    leadCount,
    sparePartLeadCount,
    timelineEvents,
  ] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: [Prisma.AnalyticsEventScalarFieldEnum.anonymousId],
      where: dateWhere,
    }),
    prisma.analyticsEvent.groupBy({
      by: [Prisma.AnalyticsEventScalarFieldEnum.userId],
      where: {
        ...dateWhere,
        userId: { not: null },
      },
    }),
    prisma.aircraft.count({ where: { status: "ACTIVE" } }),
    prisma.sparePart.count({ where: { status: "ACTIVE" } }),
    prisma.aircraft.count({ where: dateWhere }),
    prisma.sparePart.count({ where: dateWhere }),
    prisma.analyticsEvent.groupBy({
      by: [Prisma.AnalyticsEventScalarFieldEnum.eventType],
      where: {
        ...dateWhere,
        eventType: { 
          in: [AnalyticsEventType.AIRCRAFT_VIEW, AnalyticsEventType.SPARE_PART_VIEW] 
        },
      },
      _count: true,
    }),
    prisma.analyticsEvent.groupBy({
      by: [Prisma.AnalyticsEventScalarFieldEnum.eventType],
      where: {
        ...dateWhere,
        eventType: { 
          in: [
            AnalyticsEventType.WHATSAPP_CLICK, 
            AnalyticsEventType.PHONE_CLICK, 
            AnalyticsEventType.EMAIL_CLICK
          ] 
        },
      },
      _count: true,
    }),
    prisma.lead.count({ where: dateWhere }),
    prisma.sparePartLead.count({ where: dateWhere }),
    prisma.analyticsEvent.findMany({
      where: dateWhere,
      select: {
        createdAt: true,
        eventType: true,
      },
    }),
  ]);

  const viewsBreakdown = {
    aircraftViews: viewEvents.find((v) => v.eventType === AnalyticsEventType.AIRCRAFT_VIEW)?._count || 0,
    partsViews: viewEvents.find((v) => v.eventType === AnalyticsEventType.SPARE_PART_VIEW)?._count || 0,
  };

  const contactsBreakdown = {
    whatsapp: contactEvents.find((c) => c.eventType === AnalyticsEventType.WHATSAPP_CLICK)?._count || 0,
    phone: contactEvents.find((c) => c.eventType === AnalyticsEventType.PHONE_CLICK)?._count || 0,
    email: contactEvents.find((c) => c.eventType === AnalyticsEventType.EMAIL_CLICK)?._count || 0,
    formLeads: leadCount + sparePartLeadCount,
  };

  const dailyActivityMap: Record<string, { views: number; contacts: number }> = {};

  timelineEvents.forEach((ev) => {
    const day = ev.createdAt.toISOString().split("T")[0];
    if (!dailyActivityMap[day]) {
      dailyActivityMap[day] = { views: 0, contacts: 0 };
    }

    if (
      ev.eventType === AnalyticsEventType.AIRCRAFT_VIEW || 
      ev.eventType === AnalyticsEventType.SPARE_PART_VIEW
    ) {
      dailyActivityMap[day].views += 1;
    } else if (
      ev.eventType === AnalyticsEventType.WHATSAPP_CLICK || 
      ev.eventType === AnalyticsEventType.PHONE_CLICK || 
      ev.eventType === AnalyticsEventType.EMAIL_CLICK
    ) {
      dailyActivityMap[day].contacts += 1;
    }
  });

  const chartData = Object.keys(dailyActivityMap)
    .sort()
    .map((date) => ({
      date,
      views: dailyActivityMap[date].views,
      contacts: dailyActivityMap[date].contacts,
    }));

  return {
    period,
    range: { start: start.toISOString(), end: end.toISOString() },
    kpis: {
      uniqueVisitors: uniqueSessions.length,
      identifiedUsers: uniqueUsers.length,
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
    chartData,
  };
}

export async function getListingsAnalytics(period: PeriodFilter = "30d", range?: DateRange) {
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) {
    throw new Error("Acceso denegado.");
  }

  const { start, end } = resolveDateRange(period, range);
  const dateWhere = { createdAt: { gte: start, lte: end } };

  const [aircrafts, spareParts, aircraftEvents, sparePartEvents] = await Promise.all([
    prisma.aircraft.findMany({
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        createdAt: true,
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sparePart.findMany({
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        createdAt: true,
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["aircraftId", "eventType"] as any,
      where: {
        ...dateWhere,
        aircraftId: { not: null },
      },
      _count: true,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["sparePartId", "eventType"] as any,
      where: {
        ...dateWhere,
        sparePartId: { not: null },
      },
      _count: true,
    }),
  ]);

  const aircraftListings = aircrafts.map((item) => {
    const itemEvents = aircraftEvents.filter((e: any) => e.aircraftId === item.id);
    const views = itemEvents.find((e: any) => e.eventType === AnalyticsEventType.AIRCRAFT_VIEW)?._count || 0;
    const whatsappClicks = itemEvents.find((e: any) => e.eventType === AnalyticsEventType.WHATSAPP_CLICK)?._count || 0;
    const phoneClicks = itemEvents.find((e: any) => e.eventType === AnalyticsEventType.PHONE_CLICK)?._count || 0;
    const emailClicks = itemEvents.find((e: any) => e.eventType === AnalyticsEventType.EMAIL_CLICK)?._count || 0;
    
    return {
      id: item.id,
      title: item.title,
      type: "Aeronave",
      price: item.price ? Number(item.price) : null,
      status: item.status,
      createdAt: item.createdAt,
      views,
      contacts: whatsappClicks + phoneClicks + emailClicks + item._count.leads,
      detailUrl: `/planes/plane-details/${item.id}`,
    };
  });

  const sparePartListings = spareParts.map((item) => {
    const itemEvents = sparePartEvents.filter((e: any) => e.sparePartId === item.id);
    const views = itemEvents.find((e: any) => e.eventType === AnalyticsEventType.SPARE_PART_VIEW)?._count || 0;
    const whatsappClicks = itemEvents.find((e: any) => e.eventType === AnalyticsEventType.WHATSAPP_CLICK)?._count || 0;
    const phoneClicks = itemEvents.find((e: any) => e.eventType === AnalyticsEventType.PHONE_CLICK)?._count || 0;
    const emailClicks = itemEvents.find((e: any) => e.eventType === AnalyticsEventType.EMAIL_CLICK)?._count || 0;

    return {
      id: item.id,
      title: item.title,
      type: "Repuesto",
      price: item.price ? Number(item.price) : null,
      status: item.status,
      createdAt: item.createdAt,
      views,
      contacts: whatsappClicks + phoneClicks + emailClicks + item._count.leads,
      detailUrl: `/spareparts/sparepart-details/${item.id}`,
    };
  });

  const allListings = [...aircraftListings, ...sparePartListings];

  const mostViewed = [...allListings].sort((a, b) => b.views - a.views).slice(0, 5);
  const mostContacted = [...allListings].sort((a, b) => b.contacts - a.contacts).slice(0, 5);

  return {
    listings: allListings,
    mostViewed,
    mostContacted,
  };
}

export async function getSearchesAnalytics(period: PeriodFilter = "30d", range?: DateRange) {
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) {
    throw new Error("Acceso denegado.");
  }

  const { start, end } = resolveDateRange(period, range);

  const searchEvents = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      eventType: AnalyticsEventType.SEARCH,
    },
    select: {
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const termCounts: Record<string, { count: number; lastSearched: Date }> = {};

  searchEvents.forEach((ev) => {
    const meta = ev.metadata as any;
    const query = meta?.query || meta?.searchQuery || meta?.term;

    if (query && typeof query === "string" && query.trim() !== "") {
      const cleanTerm = query.trim().toLowerCase();
      if (!termCounts[cleanTerm]) {
        termCounts[cleanTerm] = { count: 0, lastSearched: ev.createdAt };
      }
      termCounts[cleanTerm].count += 1;
    }
  });

  const topSearches = Object.keys(termCounts)
    .map((term) => ({
      term,
      count: termCounts[term].count,
      lastSearched: termCounts[term].lastSearched,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSearches: searchEvents.length,
    topSearches,
  };
}

export async function getContactsAnalytics(period: PeriodFilter = "30d", range?: DateRange) {
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) {
    throw new Error("Acceso denegado.");
  }

  const { start, end } = resolveDateRange(period, range);
  const dateWhere = { createdAt: { gte: start, lte: end } };

  const [
    interactionEvents,
    aircraftLeads,
    sparePartLeads,
  ] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: {
        ...dateWhere,
        eventType: {
          in: [
            AnalyticsEventType.WHATSAPP_CLICK,
            AnalyticsEventType.PHONE_CLICK,
            AnalyticsEventType.EMAIL_CLICK,
          ],
        },
      },
      select: {
        eventType: true,
        aircraftId: true,
        sparePartId: true,
        createdAt: true,
      },
    }),

    prisma.lead.findMany({
      where: dateWhere,
      include: {
        aircraft: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.sparePartLead.findMany({
      where: dateWhere,
      include: {
        sparePart: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const channels = {
    whatsapp: interactionEvents.filter((e) => e.eventType === AnalyticsEventType.WHATSAPP_CLICK).length,
    phone: interactionEvents.filter((e) => e.eventType === AnalyticsEventType.PHONE_CLICK).length,
    email: interactionEvents.filter((e) => e.eventType === AnalyticsEventType.EMAIL_CLICK).length,
    formLeads: aircraftLeads.length + sparePartLeads.length,
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
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    channels,
    totalInteractions: channels.whatsapp + channels.phone + channels.email + channels.formLeads,
    recentLeads,
  };
}

export async function getTrafficSourcesAnalytics(period: PeriodFilter = "30d", range?: DateRange) {
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) {
    throw new Error("Acceso denegado. Se requieren permisos de administrador.");
  }

  const { start, end } = resolveDateRange(period, range);

  const events = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: start, lte: end },
    },
    select: {
      referrer: true,
      userId: true,
      eventType: true,
    },
  });

  const referrerMap: Record<string, { views: number; contacts: number }> = {};
  
  let registeredViews = 0;
  let registeredContacts = 0;
  let anonymousViews = 0;
  let anonymousContacts = 0;

  events.forEach((ev) => {
    const isContact = (
      ev.eventType === AnalyticsEventType.WHATSAPP_CLICK ||
      ev.eventType === AnalyticsEventType.PHONE_CLICK ||
      ev.eventType === AnalyticsEventType.EMAIL_CLICK
    );

    // 1. Conteo por Sitio de Origen (Referrer)
    let ref = ev.referrer && ev.referrer.trim() !== "" ? ev.referrer : "Tráfico Directo / App";
    // Limpiar dominio para que se vea más prolijo (ej: https://www.google.com/ -> google.com)
    try {
      if (ref.startsWith("http")) {
        const url = new URL(ref);
        ref = url.hostname.replace("www.", "");
      }
    } catch (e) {}

    if (!referrerMap[ref]) {
      referrerMap[ref] = { views: 0, contacts: 0 };
    }
    referrerMap[ref].views += 1;
    if (isContact) referrerMap[ref].contacts += 1;

    // 2. Conteo por Tipo de Usuario (Registrado vs Anónimo)
    if (ev.userId) {
      registeredViews += 1;
      if (isContact) registeredContacts += 1;
    } else {
      anonymousViews += 1;
      if (isContact) anonymousContacts += 1;
    }
  });

  const topReferrers = Object.keys(referrerMap)
    .map((ref) => ({
      source: ref,
      views: referrerMap[ref].views,
      contacts: referrerMap[ref].contacts,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10); // Top 10 orígenes

  return {
    topReferrers,
    userSegmentation: {
      registered: { views: registeredViews, contacts: registeredContacts },
      anonymous: { views: anonymousViews, contacts: anonymousContacts },
    },
  };
}

export async function getOpportunitiesAnalytics(period: PeriodFilter = "30d", range?: DateRange) {
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) {
    throw new Error("Acceso denegado.");
  }

  const { start, end } = resolveDateRange(period, range);
  const dateWhere = { createdAt: { gte: start, lte: end } };

  const [searchEvents, viewEvents, contactEvents, activeAircraft, activeParts] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { ...dateWhere, eventType: AnalyticsEventType.SEARCH },
      select: { metadata: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        ...dateWhere,
        eventType: { in: [AnalyticsEventType.AIRCRAFT_VIEW, AnalyticsEventType.SPARE_PART_VIEW] },
      },
      select: { aircraftId: true, sparePartId: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        ...dateWhere,
        eventType: { in: [AnalyticsEventType.WHATSAPP_CLICK, AnalyticsEventType.PHONE_CLICK, AnalyticsEventType.EMAIL_CLICK] },
      },
      select: { aircraftId: true, sparePartId: true },
    }),
    prisma.aircraft.findMany({ where: { status: "ACTIVE" }, select: { id: true, title: true } }),
    prisma.sparePart.findMany({ where: { status: "ACTIVE" }, select: { id: true, title: true } }),
  ]);

  const allTitles = [...activeAircraft, ...activeParts].map((p) => p.title.toLowerCase());
  const unmatchedSearchesMap: Record<string, number> = {};

  searchEvents.forEach((ev) => {
    const meta = ev.metadata as any;
    const term = (meta?.query || meta?.searchQuery || meta?.term || "").trim().toLowerCase();

    if (term.length > 2) {
      const hasOffer = allTitles.some((title) => title.includes(term));
      if (!hasOffer) {
        unmatchedSearchesMap[term] = (unmatchedSearchesMap[term] || 0) + 1;
      }
    }
  });

  const highDemandNoSupply = Object.keys(unmatchedSearchesMap)
    .map((term) => ({ term, count: unmatchedSearchesMap[term] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const itemMetricsMap: Record<string, { id: string; title: string; type: string; views: number; contacts: number }> = {};

  activeAircraft.forEach((a) => {
    itemMetricsMap[a.id] = { id: a.id, title: a.title, type: "Aeronave", views: 0, contacts: 0 };
  });
  activeParts.forEach((p) => {
    itemMetricsMap[p.id] = { id: p.id, title: p.title, type: "Repuesto", views: 0, contacts: 0 };
  });

  viewEvents.forEach((ev) => {
    const id = ev.aircraftId || ev.sparePartId;
    if (id && itemMetricsMap[id]) itemMetricsMap[id].views += 1;
  });

  contactEvents.forEach((ev) => {
    const id = ev.aircraftId || ev.sparePartId;
    if (id && itemMetricsMap[id]) itemMetricsMap[id].contacts += 1;
  });

  const itemsList = Object.values(itemMetricsMap);

  const highTrafficLowConversion = itemsList
    .filter((i) => i.views >= 5 && i.contacts <= 1)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const highEfficiency = itemsList
    .filter((i) => i.contacts >= 2 && (i.contacts / i.views) >= 0.2)
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
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) {
    throw new Error("Acceso denegado.");
  }

  const whereClause: any = {};
  if (typeFilter && typeFilter !== "ALL") {
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
  const user = await getCurrentUser();
  if (!user || !(user as any).isAdmin) {
    throw new Error("Acceso denegado.");
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const oldEvents = await prisma.analyticsEvent.findMany({
    where: { createdAt: { lt: ninetyDaysAgo } },
    orderBy: { createdAt: "asc" },
  });

  const csvHeader = "ID,Fecha,Tipo_Evento,ID_Usuario,ID_Aeronave,ID_Repuesto,Metadata\n";
  const csvRows = oldEvents.map((ev) => {
    const metaStr = JSON.stringify(ev.metadata || {}).replace(/"/g, '""');
    return `"${ev.id}","${ev.createdAt.toISOString()}","${ev.eventType}","${ev.userId || ''}","${ev.aircraftId || ''}","${ev.sparePartId || ''}","${metaStr}"`;
  }).join("\n");

  return {
    filename: `analiticas_90d_al_${ninetyDaysAgo.toISOString().split("T")[0]}.csv`,
    content: csvHeader + csvRows,
    count: oldEvents.length,
  };
}

