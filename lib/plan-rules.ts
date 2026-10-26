// VA-80 / VA-152 / VA-166: textos de un plan. La edición de los planes es la grilla de /admin/plans
// (reglas en lib/plan-grid-rules.ts).

type Counts = { tier?: string | null; aircraftListingsCount: number; sparePartsListingsCount: number; isUnlimitedAircraft: boolean; isUnlimitedSpareParts: boolean };
type Free = { AIRCRAFT: number; SPARE_PART: number };

function n(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** "3 aviones y 10 repuestos activos" / "Aviones ilimitados y 3 repuestos". El Broker usa el cupo de Base en lo no ilimitado. */
export function defaultUsageText(p: Counts, free: Free = { AIRCRAFT: 1, SPARE_PART: 3 }) {
  const broker = p.tier === "BUSINESS";
  const a = p.isUnlimitedAircraft ? null : broker ? free.AIRCRAFT : p.aircraftListingsCount;
  const r = p.isUnlimitedSpareParts ? null : broker ? free.SPARE_PART : p.sparePartsListingsCount;
  if (a === null && r === null) return "Aviones y repuestos ilimitados";
  const left = a === null ? "Aviones ilimitados" : n(a, "avión", "aviones");
  const right = r === null ? "repuestos ilimitados" : n(r, "repuesto", "repuestos");
  return `${left} y ${right}${a !== null && r !== null ? " activos" : ""}`;
}
