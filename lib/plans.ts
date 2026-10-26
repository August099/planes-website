import "server-only";
import { unstable_cache } from "next/cache";
import type { Plan, PlanGridRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SYSTEM_KEYS, type GridCell, type GridColumn, type GridPlan, type GridRow, type PlansGrid, type SystemKey } from "@/lib/plan-grid";

// VA-152 / VA-166: datos de la grilla de /plans (Base, Pro y las 3 opciones del Broker, con las filas de
// la grilla), editables desde /admin/plans. Un plan pago sin precio o inactivo no se muestra.
export const PLANS_TAG = "plans";

/** Un plan de la base como columna de la grilla (cupo efectivo: el Broker usa el de Base en lo no ilimitado). */
export function toGridPlan(p: Plan, base: { aircraft: number; parts: number }): GridPlan {
  const broker = p.tier === "BUSINESS";
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    listPrice: p.listPrice === null ? null : Number(p.listPrice),
    isActive: p.isActive,
    aircraft: p.isUnlimitedAircraft ? null : broker ? base.aircraft : p.aircraftListingsCount,
    parts: p.isUnlimitedSpareParts ? null : broker ? base.parts : p.sparePartsListingsCount,
    republishesPerYear: p.republishesPerYear,
    republishAllEveryDays: p.republishAllEveryDays,
    verified: p.includesVerifiedBadge,
    featured: p.includesFeatured,
    vaPage: p.vaPageLevel,
    customDetail: p.includesCustomDetail,
    metrics: p.metricsLevel,
  };
}

export function toGridRow(r: PlanGridRow): GridRow {
  const key = SYSTEM_KEYS.includes(r.systemKey as SystemKey) ? (r.systemKey as SystemKey) : null;
  return { id: r.id, label: r.label, systemKey: key, cells: (r.cells ?? {}) as Partial<Record<GridColumn, GridCell>> };
}

/** La grilla completa, con todos los planes (activos o no): la usa el admin. */
export async function loadPlansGrid(): Promise<PlansGrid & { all: Plan[] }> {
  const [plans, rows] = await Promise.all([
    prisma.plan.findMany({ where: { tier: { not: null }, archivedAt: null }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    prisma.planGridRow.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
  ]);
  const baseRow = plans.find((p) => p.tier === "BASE");
  const base = { aircraft: baseRow?.aircraftListingsCount ?? 1, parts: baseRow?.sparePartsListingsCount ?? 3 };
  const grid = (p: Plan | undefined) => (p ? toGridPlan(p, base) : null);
  const option = (a: boolean, r: boolean) => plans.find((p) => p.tier === "BUSINESS" && p.isUnlimitedAircraft === a && p.isUnlimitedSpareParts === r);
  return {
    all: plans,
    base: grid(baseRow) ?? { id: "", name: "Base", price: 0, listPrice: null, isActive: true, aircraft: base.aircraft, parts: base.parts, republishesPerYear: 2, republishAllEveryDays: null, verified: false, featured: false, vaPage: "NONE", customDetail: false, metrics: "BASIC" },
    pro: grid(plans.find((p) => p.tier === "PRO")),
    broker: { aircraft: grid(option(true, false)), parts: grid(option(false, true)), both: grid(option(true, true)) },
    rows: rows.map(toGridRow),
  };
}

/** Lo que ve /plans: solo los planes pagos activos y con precio. */
export const getPlansPage = unstable_cache(
  async (): Promise<PlansGrid> => {
    const { base, pro, broker, rows } = await loadPlansGrid();
    const sellable = (p: GridPlan | null) => (p && p.isActive && p.price > 0 ? p : null);
    return {
      base,
      pro: sellable(pro),
      broker: { aircraft: sellable(broker.aircraft), parts: sellable(broker.parts), both: sellable(broker.both) },
      rows,
    };
  },
  ["plans-page", "va187"],
  { tags: [PLANS_TAG, "quota"], revalidate: 3600 }
);
