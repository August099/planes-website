import { z } from "zod";
import type { PlanDraft } from "@/lib/aero/fpl";
import { buildLegs, totalHours, type LegWind, type RoutePoint } from "@/lib/aero/route";
import { localToUtc } from "@/lib/aero/fpl";

// VA-191: forma válida de un plan, para guardarlo y para armar el PDF. Lo que viene del navegador no se da por bueno.
const short = z.string().max(120);
const codes = z.array(z.string().max(4)).max(16);

const pointSchema = z.object({
  kind: z.enum(["AD", "HELIPORT", "LAD", "LADH", "COORD"]),
  code: z.string().max(40),
  icao: z.string().max(8).nullable(),
  name: z.string().max(200),
  province: z.string().max(120).nullable().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  elevationM: z.number().nullable().optional(),
});

export const balanceSchema = z.object({
  unit: z.enum(["kg", "lb"]),
  stations: z.array(z.object({ name: z.string().max(60), weight: z.string().max(12), arm: z.string().max(12) })).max(30),
  max: z.string().max(12),
  fwd: z.string().max(12),
  aft: z.string().max(12),
});

export const aircraftSchema = z.object({
  registration: short,
  typeCode: z.string().max(4),
  typeText: short,
  wake: z.enum(["", "L", "M", "H", "J"]),
  cruiseKt: z.string().max(8),
  fuelPerHour: z.string().max(8),
  fuelUnit: z.enum(["L", "GAL", "KG"]),
  color: short,
  equipment: codes,
  surveillance: codes,
  pbn: z.string().max(40),
  balance: balanceSchema.optional(),
});

export const planSchema = z.object({
  v: z.literal(1),
  aircraft: aircraftSchema,
  route: z.object({
    origin: pointSchema.nullable(),
    destination: pointSchema.nullable(),
    alternate: pointSchema.nullable(),
    waypoints: z.array(pointSchema).max(30),
    winds: z.array(z.object({ dir: z.string().max(4), speed: z.string().max(4) })).max(31),
  }),
  flight: z.object({
    date: z.string().max(10),
    time: z.string().max(5),
    rules: z.enum(["", "V", "I", "Y", "Z"]),
    type: z.enum(["", "G", "N", "S", "M", "X"]),
    levelKind: z.enum(["VFR", "A", "F"]),
    level: z.string().max(4),
    persons: z.string().max(4),
    endurance: z.string().max(6),
    pilot: short,
    taxiFuel: z.string().max(8),
    reserveMinutes: z.string().max(8),
    fuelOnBoard: z.string().max(8),
    radios: codes,
    survival: codes,
    jackets: codes,
    remarks18: z.string().max(400),
    remarks19: z.string().max(400),
    routeOverride: z.string().max(1000),
  }),
}) satisfies z.ZodType<PlanDraft>;

const parseNumber = (text: string) => {
  const value = Number(text.replace(",", "."));
  return text.trim() && Number.isFinite(value) ? value : null;
};

export const draftNumber = parseNumber;

/** Puntos de la ruta en orden, sin la alternativa. */
export function routePoints(draft: PlanDraft): RoutePoint[] {
  const { origin, destination, waypoints } = draft.route;
  return origin && destination ? [origin, ...waypoints, destination] : [];
}

export function draftWinds(draft: PlanDraft): LegWind[] {
  return draft.route.winds.map((w) => {
    const dir = parseNumber(w.dir);
    const speed = parseNumber(w.speed);
    return dir !== null && speed !== null && dir >= 0 && dir <= 360 && speed >= 0 ? { dir, speed } : { dir: null, speed: null };
  });
}

/** Tramos del plan. La declinación se toma para la fecha del vuelo, o la de hoy si todavía no hay fecha. */
export function draftLegs(draft: PlanDraft) {
  const when = localToUtc(draft.flight.date, draft.flight.time) ?? new Date();
  const legs = buildLegs(routePoints(draft), parseNumber(draft.aircraft.cruiseKt), draftWinds(draft), when);
  return { legs, hours: totalHours(legs), when };
}
