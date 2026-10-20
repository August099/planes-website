// VA-166: la grilla de planes (la de la imagen "Composición de VA", 19/10). La usan /plans, la grilla
// editable de /admin/plans y su vista previa. Sin dependencias de servidor.
//
// Columnas: Base, Pro y Broker / Empresa (con sus 3 opciones). Filas: las de sistema muestran valores que
// salen de las columnas de Plan (cupos, republicaciones, métricas, verificado, destacadas y branding) y
// no se borran; las propias son texto de marketing con ✓ / ✗ o un texto corto por columna.

export type GridColumn = "BASE" | "PRO" | "BROKER";
export const GRID_COLUMNS: GridColumn[] = ["BASE", "PRO", "BROKER"];
export const GRID_COLUMN_LABEL: Record<GridColumn, string> = { BASE: "Base", PRO: "Pro", BROKER: "Broker / Empresa" };

export type SystemKey = "aircraft" | "parts" | "total" | "republish" | "metrics" | "verified" | "featured" | "branding";
export const SYSTEM_KEYS: SystemKey[] = ["aircraft", "parts", "total", "republish", "metrics", "verified", "featured", "branding"];

export type CellKind = "yes" | "no" | "text";
export type GridCell = { kind: CellKind; text?: string };
export type GridRow = { id: string; label: string; systemKey: SystemKey | null; cells: Partial<Record<GridColumn, GridCell>> };

export type VaPage = "NONE" | "BANNER" | "FULL";
export type Metrics = "BASIC" | "PRO" | "FULL";

/** Lo que muestra (y edita) la grilla de cada plan. aircraft/parts: cupo efectivo (null = sin límite). */
export type GridPlan = {
  id: string;
  name: string;
  price: number;
  listPrice: number | null;
  isActive: boolean;
  aircraft: number | null;
  parts: number | null;
  republishesPerYear: number;
  republishAllEveryDays: number | null;
  verified: boolean;
  featured: boolean;
  vaPage: VaPage;
  customDetail: boolean;
  metrics: Metrics;
};

export type BrokerOption = "aircraft" | "parts" | "both";
export type PlansGrid = {
  base: GridPlan;
  pro: GridPlan | null;
  broker: Record<BrokerOption, GridPlan | null>;
  rows: GridRow[];
};

/** Opción del Broker según los interruptores (al menos uno prendido). */
export function brokerOptionFor(pick: { aircraft: boolean; parts: boolean }): BrokerOption | null {
  return pick.aircraft && pick.parts ? "both" : pick.aircraft ? "aircraft" : pick.parts ? "parts" : null;
}

const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
/** Precio en pesos con el formato de la web (lib/format.ts): "AR$ 38.000". */
export const formatArs = (n: number) => `AR$ ${NUMBER.format(n)}`;

const METRICS_TEXT: Record<Metrics, string> = { BASIC: "Básicas", PRO: "Algunas", FULL: "Completas" };
export const METRICS_LABEL: Record<Metrics, string> = { BASIC: "Básicas", PRO: "Pro", FULL: "Completas" };
export const VA_PAGE_LABEL: Record<VaPage, string> = { NONE: "Sin Página VA", BANNER: "Banner en el perfil", FULL: "Página VA completa" };

const limitText = (n: number | null) => (n === null ? "Sin límite" : NUMBER.format(n));

/** La celda de una fila para un plan (null si el plan no existe). */
export function cellFor(row: GridRow, column: GridColumn, plan: GridPlan | null): GridCell | null {
  if (!row.systemKey) return row.cells[column] ?? { kind: "no" };
  if (!plan) return null;
  switch (row.systemKey) {
    case "aircraft":
      return { kind: "text", text: limitText(plan.aircraft) };
    case "parts":
      return { kind: "text", text: limitText(plan.parts) };
    case "total":
      return { kind: "text", text: plan.aircraft === null || plan.parts === null ? "Sin límite" : NUMBER.format(plan.aircraft + plan.parts) };
    case "republish":
      if (plan.republishAllEveryDays) return { kind: "text", text: `Todas, cada ${plan.republishAllEveryDays} días` };
      return plan.republishesPerYear > 0 ? { kind: "text", text: `${plan.republishesPerYear} por año` } : { kind: "no" };
    case "metrics":
      return { kind: "yes", text: METRICS_TEXT[plan.metrics] };
    case "verified":
      return { kind: plan.verified ? "yes" : "no" };
    case "featured":
      return { kind: plan.featured ? "yes" : "no" };
    case "branding":
      if (plan.vaPage === "NONE") return { kind: "no" };
      if (plan.vaPage === "BANNER") return { kind: "text", text: "Banner en el perfil" };
      return { kind: "yes", text: plan.customDetail ? "Página VA completa y detalles personalizados" : "Página VA completa" };
  }
}
