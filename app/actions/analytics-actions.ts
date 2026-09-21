"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AnalyticsEventType } from "@prisma/client";

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