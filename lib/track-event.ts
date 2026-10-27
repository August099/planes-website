import "server-only";
import { AnalyticsEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAnalyticsContext } from "@/lib/analytics-context";

// 27/10 (socio): eventos de negocio para el panel admin (altas de cuenta, ventas, republicaciones, pagos,
// suscripciones). Nunca corta el flujo que lo llama: si falla, solo queda en el log.
// - withContext: suma visitante, origen y provincia (solo cuando lo dispara una persona, no un webhook).
// - onceKey: no repite el evento si ya hay uno del mismo tipo con esa clave (los webhooks se reintentan).
export async function trackEvent(
  eventType: AnalyticsEventType,
  data: { userId?: string | null; aircraftId?: string | null; sparePartId?: string | null; metadata?: Record<string, unknown> } = {},
  opts: { withContext?: boolean; onceKey?: string } = {}
): Promise<void> {
  try {
    if (opts.onceKey) {
      const dup = await prisma.analyticsEvent.findFirst({
        where: { eventType, metadata: { path: ["key"], equals: opts.onceKey } },
        select: { id: true },
      });
      if (dup) return;
    }
    const context = opts.withContext ? await getAnalyticsContext() : {};
    await prisma.analyticsEvent.create({
      data: {
        eventType,
        userId: data.userId ?? null,
        aircraftId: data.aircraftId ?? null,
        sparePartId: data.sparePartId ?? null,
        metadata: { ...(data.metadata ?? {}), ...(opts.onceKey ? { key: opts.onceKey } : {}) } as Prisma.InputJsonValue,
        ...context,
      },
    });
  } catch (error) {
    console.error(`Error al registrar el evento ${eventType}:`, error);
  }
}
