"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { AnalyticsEventType, Prisma } from "@prisma/client";

export type PeriodFilter = "today" | "7d" | "30d" | "custom";

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

// DISCLAIMER: no da errores y parece que funca pero hay que probarlo con trafico posta
// tengo dudas con las cosas que requieren calculos de hora, porque Gemini me recomendaba importar Clock, veremos...

function resolveDateRange(period: PeriodFilter, range?: DateRange) {
  const now = new Date();
  let start = new Date();

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "7d") {
    start.setDate(now.getDate() - 7);
  } else if (period === "30d") {
    start.setDate(now.getDate() - 30);
  } else if (period === "custom" && range?.startDate) {
    start = new Date(range.startDate);
    const end = range.endDate ? new Date(range.endDate) : now;
    return { start, end };
  }

  return { start, end: now };
}

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
    // 1. Visitantes únicos (ahora si entendí bien lo de la sesión jijo) anonymous es como sessionid
    prisma.analyticsEvent.groupBy({
      by: [Prisma.AnalyticsEventScalarFieldEnum.anonymousId],
      where: dateWhere,
    }),

    // 2. Usuarios identificados
    prisma.analyticsEvent.groupBy({
      by: [Prisma.AnalyticsEventScalarFieldEnum.userId],
      where: {
        ...dateWhere,
        userId: { not: null },
      },
    }),

    // 3. Totales activos
    prisma.aircraft.count({ where: { status: "ACTIVE" } }),
    prisma.sparePart.count({ where: { status: "ACTIVE" } }),

    // 4. Nuevas publicaciones
    prisma.aircraft.count({ where: dateWhere }),
    prisma.sparePart.count({ where: dateWhere }),

    // 5. Vistas
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

    // 6. Clics de contacto
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

    // 7. Leads reales
    prisma.lead.count({ where: dateWhere }),
    prisma.sparePartLead.count({ where: dateWhere }),

    // 8. Registros para el gráfico diario
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

  // 1. Obtener todas las aeronaves y repuestos con sus contadores de leads
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
    // Eventos de interacción en aeronaves
    prisma.analyticsEvent.groupBy({
      by: ["aircraftId", "eventType"] as any,
      where: {
        ...dateWhere,
        aircraftId: { not: null },
      },
      _count: true,
    }),
    // Eventos de interacción en repuestos
    prisma.analyticsEvent.groupBy({
      by: ["sparePartId", "eventType"] as any,
      where: {
        ...dateWhere,
        sparePartId: { not: null },
      },
      _count: true,
    }),
  ]);

  // Consolidar métricas por Aeronave
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

  // Consolidar métricas por Repuesto
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

  // Métricas destacadas
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

  // Obtener eventos de búsqueda
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

  // Agrupar términos de búsqueda
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
    // Clics de contacto registrados en AnalyticsEvent
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

    // Leads de Aeronaves
    prisma.lead.findMany({
      where: dateWhere,
      include: {
        aircraft: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Leads de Repuestos
    prisma.sparePartLead.findMany({
      where: dateWhere,
      include: {
        sparePart: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Cuentas por canal
  const channels = {
    whatsapp: interactionEvents.filter((e) => e.eventType === AnalyticsEventType.WHATSAPP_CLICK).length,
    phone: interactionEvents.filter((e) => e.eventType === AnalyticsEventType.PHONE_CLICK).length,
    email: interactionEvents.filter((e) => e.eventType === AnalyticsEventType.EMAIL_CLICK).length,
    formLeads: aircraftLeads.length + sparePartLeads.length,
  };

  // Consolidar leads para listado reciente
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
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      eventType: true,
    },
  });

  const referrerMap: Record<string, { views: number; contacts: number }> = {};
  const utmMap: Record<string, { views: number; contacts: number }> = {};

  events.forEach((ev) => {
    const isContact = (
      ev.eventType === AnalyticsEventType.WHATSAPP_CLICK ||
      ev.eventType === AnalyticsEventType.PHONE_CLICK ||
      ev.eventType === AnalyticsEventType.EMAIL_CLICK
    );

    // 1. Agrupar por Referrer
    const ref = ev.referrer && ev.referrer.trim() !== "" ? ev.referrer : "Directo / Desconocido";
    if (!referrerMap[ref]) {
      referrerMap[ref] = { views: 0, contacts: 0 };
    }
    referrerMap[ref].views += 1;
    if (isContact) referrerMap[ref].contacts += 1;

    // 2. Agrupar por Parámetros UTM (gracias shat)
    if (ev.utmSource) {
      const utmKey = `${ev.utmSource} / ${ev.utmMedium || "none"} (${ev.utmCampaign || "sin campaña"})`;
      if (!utmMap[utmKey]) {
        utmMap[utmKey] = { views: 0, contacts: 0 };
      }
      utmMap[utmKey].views += 1;
      if (isContact) utmMap[utmKey].contacts += 1;
    }
  });

  const topReferrers = Object.keys(referrerMap)
    .map((ref) => ({
      source: ref,
      views: referrerMap[ref].views,
      contacts: referrerMap[ref].contacts,
    }))
    .sort((a, b) => b.views - a.views);

  const topUtms = Object.keys(utmMap)
    .map((utm) => ({
      campaign: utm,
      views: utmMap[utm].views,
      contacts: utmMap[utm].contacts,
    }))
    .sort((a, b) => b.views - a.views);

  return {
    topReferrers,
    topUtms,
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

  // Búsquedas sin oferta coincidente
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

  // Mapeo de vistas y contactos por publicación
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

  // Alto tráfico, baja conversión (Vistas > 5 y 0 o 1 contacto)
  const highTrafficLowConversion = itemsList
    .filter((i) => i.views >= 5 && i.contacts <= 1)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Alta eficiencia (Ratio conversión > 20% con al menos 2 contactos)
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