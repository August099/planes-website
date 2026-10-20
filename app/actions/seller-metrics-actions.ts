"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { getAccountPlan } from "@/lib/plan-benefits";
import { FULL_DAYS, getSellerMetrics, MAX_CUSTOM_DAYS, PRO_DAYS, type MetricsDays, type SellerMetrics } from "@/lib/seller-metrics";

const DAY = 86_400_000;
type Result = { ok: true; data: SellerMetrics } | { ok: false; error: string };

// VA-151 / VA-171: el panel pide sus datos acá. Solo el dueño con métricas en su plan (nivel Pro o completo;
// también de cortesía y los admins). El nivel completo (Broker) suma 90 días, un rango propio y sus
// secciones; quien no lo tiene no puede pedirlas aunque llame a la action a mano.
export async function getSellerMetricsAction(period: number | { from: string; to: string }): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  const plan = await getAccountPlan(user.id);
  if (plan.metrics === "BASIC") return { ok: false, error: "Tu plan no incluye las métricas." };
  const full = plan.metrics === "FULL";

  let days: number;
  let endMs: number | undefined;
  if (typeof period === "number") {
    const allowed: MetricsDays[] = full ? FULL_DAYS : PRO_DAYS;
    days = allowed.includes(period as MetricsDays) ? period : 30;
  } else {
    if (!full) return { ok: false, error: "El rango propio es del plan Broker / Empresa." };
    const from = Date.parse(`${period.from}T00:00:00-03:00`);
    const to = Date.parse(`${period.to}T00:00:00-03:00`) + DAY; // hasta el final del día elegido
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return { ok: false, error: "Elegí un rango de fechas válido." };
    days = Math.round((to - from) / DAY);
    if (days > MAX_CUSTOM_DAYS) return { ok: false, error: `El rango puede ser de hasta ${MAX_CUSTOM_DAYS} días.` };
    if (from < Date.now() - MAX_CUSTOM_DAYS * DAY) return { ok: false, error: "Los datos se conservan 13 meses." };
    endMs = Math.min(to, Date.now());
  }

  try {
    return { ok: true, data: await getSellerMetrics(user.id, { days, endMs }, full) };
  } catch (error) {
    console.error("[métricas] error:", error);
    return { ok: false, error: "No pudimos cargar las métricas. Probá de nuevo en unos minutos." };
  }
}
