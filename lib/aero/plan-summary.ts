// VA-191: combustible y avisos del plan, compartidos por el briefing en pantalla y el PDF. Puro y con tests.
// No hay valores reglamentarios por defecto: la reserva la carga el piloto.
import { fuelNeeded } from "@/lib/aero/formulas";
import { enduranceHhmm, type PlanDraft } from "@/lib/aero/fpl";
import { draftNumber } from "@/lib/aero/plan-schema";
import type { SunCheck } from "@/lib/aero/route";

const UNIT = { L: "L", GAL: "gal", KG: "kg" } as const;
const one = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
const AR = "America/Argentina/Buenos_Aires";
const clock = (d: Date | null) => (d ? d.toLocaleTimeString("es-AR", { timeZone: AR, hour: "2-digit", minute: "2-digit", hour12: false }) : "");

export function planFuel(draft: PlanDraft, hours: number | null) {
  const perHour = draftNumber(draft.aircraft.fuelPerHour);
  if (hours === null || perHour === null || perHour <= 0) return null;
  const unit = UNIT[draft.aircraft.fuelUnit];
  const fuel = fuelNeeded({ hours, perHour, taxi: draftNumber(draft.flight.taxiFuel) ?? 0, reserve: { kind: "minutes", value: draftNumber(draft.flight.reserveMinutes) ?? 0 } });
  const hasReserve = draftNumber(draft.flight.reserveMinutes) !== null;
  return {
    ...fuel,
    unit,
    hasReserve,
    lines: [`Vuelo: ${one(fuel.trip)} ${unit}`, `Rodaje: ${one(fuel.taxi)} ${unit}`, hasReserve ? `Reserva (${draft.flight.reserveMinutes} min): ${one(fuel.reserve)} ${unit}` : "Reserva: sin cargar", `Total: ${one(fuel.total)} ${unit}`],
  };
}

export function planWarnings(draft: PlanDraft, hours: number | null, sun: SunCheck | null): string[] {
  const out: string[] = [];
  if (sun?.afterDusk) out.push(`Llegás de noche: después del fin del crepúsculo civil en el destino (${clock(sun.dusk)}).`);
  else if (sun?.afterSunset) out.push(`Llegás después de la puesta del sol en el destino (${clock(sun.sunset)}).`);
  else if (sun?.beforeSunrise) out.push("Llegás antes de la salida del sol en el destino.");

  const fuel = planFuel(draft, hours);
  const onBoard = draftNumber(draft.flight.fuelOnBoard);
  if (fuel && onBoard !== null && onBoard < fuel.total) out.push(`El combustible a bordo (${one(onBoard)} ${fuel.unit}) no alcanza para el total calculado (${one(fuel.total)} ${fuel.unit}).`);

  const endurance = enduranceHhmm(draft.flight.endurance);
  if (endurance && hours !== null) {
    const available = Number(endurance.slice(0, 2)) * 60 + Number(endurance.slice(2));
    const reserve = draftNumber(draft.flight.reserveMinutes) ?? 0;
    if (available < hours * 60 + reserve) out.push("La autonomía es menor que el tiempo de vuelo más la reserva.");
  }
  return out;
}
