"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { hasSellerMetrics } from "@/lib/subscriptions";
import { getSellerMetrics, METRICS_DAYS, type MetricsDays, type SellerMetrics } from "@/lib/seller-metrics";

// VA-151: el panel pide sus datos acá. Solo el dueño con un plan que incluye las métricas (también de
// cortesía); quien no lo tiene no puede pedirlas aunque llame a la action a mano.
export async function getSellerMetricsAction(days: number): Promise<{ ok: true; data: SellerMetrics } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  if (!(await hasSellerMetrics(user.id))) return { ok: false, error: "Tu plan no incluye las métricas." };
  const period: MetricsDays = METRICS_DAYS.includes(days as MetricsDays) ? (days as MetricsDays) : 30;
  try {
    return { ok: true, data: await getSellerMetrics(user.id, period) };
  } catch (error) {
    console.error("[métricas] error:", error);
    return { ok: false, error: "No pudimos cargar las métricas. Probá de nuevo en unos minutos." };
  }
}
