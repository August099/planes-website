"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AnalyticsEventType } from "@prisma/client";
import { activeListingWhere } from "@/lib/listing-filters";
import { getAnalyticsContext } from "@/lib/analytics-context";

const CONTACT_EVENTS = new Set<AnalyticsEventType>([
  AnalyticsEventType.PHONE_CLICK,
  AnalyticsEventType.WHATSAPP_CLICK,
  AnalyticsEventType.EMAIL_CLICK,
]);

const validId = (id: unknown): id is string => typeof id === "string" && id.length > 0 && id.length <= 64;

// Clic en llamar / WhatsApp / email del vendedor. Solo acepta esos tres tipos (antes se podía
// registrar cualquier evento desde el navegador) y guarda visitante y origen (VA-15).
export async function logContactClick(
  entityId: string,
  entityType: "AIRCRAFT" | "SPARE_PART" | "HANGAR",
  eventType: AnalyticsEventType
) {
  if (!validId(entityId) || !CONTACT_EVENTS.has(eventType)) return;
  if (entityType !== "AIRCRAFT" && entityType !== "SPARE_PART" && entityType !== "HANGAR") return;

  try {
    const [session, context] = await Promise.all([auth(), getAnalyticsContext()]);
    await prisma.analyticsEvent.create({
      data: {
        eventType,
        userId: session?.user?.id ?? null,
        ...context,
        aircraftId: entityType === "AIRCRAFT" ? entityId : null,
        sparePartId: entityType === "SPARE_PART" ? entityId : null,
        hangarId: entityType === "HANGAR" ? entityId : null, // VA-84
      },
    });
  } catch (error) {
    console.error("Error al registrar evento de contacto:", error);
  }
}

const VIEW_DEDUP_MS = 30 * 60 * 1000;

// Vista de una publicación (VA-17). La llama TrackListingView al montar el detalle en el
// navegador, una vez por pestaña: así no suman los re-renders del servidor (refresh, server
// actions, volver atrás), el prefetch ni los bots sin JS. No cuenta al dueño ni repite la vista
// del mismo usuario (o del mismo visitante anónimo, VA-15) dentro de 30 minutos.
export async function logListingView(entityType: "AIRCRAFT" | "SPARE_PART", entityId: string) {
  if (!validId(entityId)) return;
  if (entityType !== "AIRCRAFT" && entityType !== "SPARE_PART") return;

  try {
    const [session, context] = await Promise.all([auth(), getAnalyticsContext()]);
    const userId = session?.user?.id ?? null;
    const isAircraft = entityType === "AIRCRAFT";
    const where = { id: entityId, ...activeListingWhere() };
    const listing = isAircraft
      ? await prisma.aircraft.findFirst({ where, select: { sellerId: true } })
      : await prisma.sparePart.findFirst({ where, select: { sellerId: true } });

    if (!listing || listing.sellerId === userId) return;

    const eventType = isAircraft ? AnalyticsEventType.AIRCRAFT_VIEW : AnalyticsEventType.SPARE_PART_VIEW;
    const target = isAircraft ? { aircraftId: entityId } : { sparePartId: entityId };
    const who = userId ? { userId } : context.anonymousId ? { anonymousId: context.anonymousId } : null;

    if (who) {
      const recent = await prisma.analyticsEvent.findFirst({
        where: { eventType, ...who, ...target, createdAt: { gte: new Date(Date.now() - VIEW_DEDUP_MS) } },
        select: { id: true },
      });
      if (recent) return;
    }

    await prisma.analyticsEvent.create({ data: { eventType, userId, ...context, ...target } });
  } catch (error) {
    console.error("Error al registrar la vista:", error);
  }
}

export type SearchOrigin = "HEADER_SUBMIT" | "HEADER_RESULT_CLICK" | "SEARCH_PAGE";

// Búsqueda (VA-15). Se registra solo cuando la persona busca de verdad (Enter, botón, clic en un
// resultado o la página /search), no en cada tecla: antes "cessna 182" dejaba eventos de "ce",
// "cess", "cessna"… y ensuciaba "búsquedas sin resultados" y "oportunidades".
export async function logSearch(query: string, resultsCount: number, origin: SearchOrigin, searchType?: string) {
  const cleanQuery = typeof query === "string" ? query.trim().toLowerCase().slice(0, 200) : "";
  if (cleanQuery.length < 2) return;
  if (!["HEADER_SUBMIT", "HEADER_RESULT_CLICK", "SEARCH_PAGE"].includes(origin)) return;

  try {
    const [session, context] = await Promise.all([auth(), getAnalyticsContext()]);
    await prisma.analyticsEvent.create({
      data: {
        eventType: AnalyticsEventType.SEARCH,
        userId: session?.user?.id ?? null,
        ...context,
        metadata: {
          query: cleanQuery,
          resultsCount: Number.isFinite(resultsCount) ? Math.max(0, Math.trunc(resultsCount)) : 0,
          ...(searchType ? { searchType: String(searchType).slice(0, 20) } : {}),
          origin,
        },
      },
    });
  } catch (error) {
    console.error("Error al registrar la búsqueda:", error);
  }
}
