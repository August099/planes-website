"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AnalyticsEventType } from "@prisma/client";
import { activeListingWhere } from "@/lib/listing-filters";

export async function logContactClick(
  entityId: string,
  entityType: "AIRCRAFT" | "SPARE_PART",
  eventType: AnalyticsEventType
) {
  const session = await auth();

  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType,
        userId: session?.user?.id ?? null,
        aircraftId: entityType === "AIRCRAFT" ? entityId : null,
        sparePartId: entityType === "SPARE_PART" ? entityId : null,
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
// del mismo usuario dentro de 30 minutos.
export async function logListingView(entityType: "AIRCRAFT" | "SPARE_PART", entityId: string) {
  if (typeof entityId !== "string" || entityId.length === 0 || entityId.length > 64) return;
  if (entityType !== "AIRCRAFT" && entityType !== "SPARE_PART") return;

  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const isAircraft = entityType === "AIRCRAFT";
    const where = { id: entityId, ...activeListingWhere() };
    const listing = isAircraft
      ? await prisma.aircraft.findFirst({ where, select: { sellerId: true } })
      : await prisma.sparePart.findFirst({ where, select: { sellerId: true } });

    if (!listing || listing.sellerId === userId) return;

    const eventType = isAircraft ? AnalyticsEventType.AIRCRAFT_VIEW : AnalyticsEventType.SPARE_PART_VIEW;
    const target = isAircraft ? { aircraftId: entityId } : { sparePartId: entityId };

    if (userId) {
      const recent = await prisma.analyticsEvent.findFirst({
        where: { eventType, userId, ...target, createdAt: { gte: new Date(Date.now() - VIEW_DEDUP_MS) } },
        select: { id: true },
      });
      if (recent) return;
    }

    await prisma.analyticsEvent.create({ data: { eventType, userId, ...target } });
  } catch (error) {
    console.error("Error al registrar la vista:", error);
  }
}
