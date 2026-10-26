"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getSalesStats, recordSaleAnswer, type SaleAnswer, type SaleKind, type SalesStats } from "@/lib/sales";

// VA-183: respuesta de "¿Lo vendiste gracias a Ventas Aeronáuticas?" y las ventas del admin.

export async function saveSaleAnswerAction(kind: SaleKind, id: string, answer: SaleAnswer) {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false as const, error: "Tenés que iniciar sesión." };
  if (kind !== "AIRCRAFT" && kind !== "SPARE_PART") return { ok: false as const, error: "Aviso inválido." };
  const viaVA = answer?.viaVA === true ? true : answer?.viaVA === false ? false : null;
  const res = await recordSaleAnswer(user.id, kind, String(id ?? ""), { viaVA, price: answer?.price ?? null, currency: answer?.currency });
  if (res.ok) revalidatePath("/admin");
  return res;
}

export type SalesPeriod = "30d" | "90d" | "12m" | "all";
const DAYS: Record<Exclude<SalesPeriod, "all">, number> = { "30d": 30, "90d": 90, "12m": 365 };

export async function getSalesStatsAction(period: SalesPeriod): Promise<SalesStats | null> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return null;
  const from = period === "all" || !(period in DAYS) ? null : new Date(Date.now() - DAYS[period as keyof typeof DAYS] * 86_400_000);
  return getSalesStats(from);
}
