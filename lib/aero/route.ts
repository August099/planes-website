// VA-191: cálculos de la ruta del plan de vuelo. Puro y con tests. Rumbos verdaderos salvo que diga "magnético";
// el rumbo de cada tramo es el inicial de la ortodrómica, y la declinación es la de WMM en la mitad del tramo.
import distance from "@turf/distance";
import bearing from "@turf/bearing";
import booleanIntersects from "@turf/boolean-intersects";
import { lineString } from "@turf/helpers";
import geomagnetism from "geomagnetism";
import { getTimes } from "suncalc";
import { normalize360, trueToMagnetic, windComponents, windTriangle } from "@/lib/aero/formulas";

export type RoutePoint = {
  kind: "AD" | "HELIPORT" | "LAD" | "LADH" | "COORD";
  code: string;
  icao: string | null;
  name: string;
  province?: string | null;
  lat: number;
  lng: number;
  elevationM?: number | null;
};

export type LegWind = { dir: number | null; speed: number | null };

export type Leg = {
  from: RoutePoint;
  to: RoutePoint;
  distanceNm: number;
  trueCourse: number;
  declination: number;
  magneticCourse: number;
  wind: LegWind;
  windCorrection: number | null;
  trueHeading: number | null;
  magneticHeading: number | null;
  groundSpeed: number | null;
  hours: number | null;
};

export const declinationAt = (lat: number, lng: number, date: Date) => geomagnetism.model(date).point([lat, lng]).decl;

export function buildLeg(from: RoutePoint, to: RoutePoint, tas: number | null, wind: LegWind, date: Date): Leg {
  const a = [from.lng, from.lat];
  const b = [to.lng, to.lat];
  const distanceNm = distance(a, b, { units: "nauticalmiles" });
  const trueCourse = normalize360(bearing(a, b));
  const declination = declinationAt((from.lat + to.lat) / 2, (from.lng + to.lng) / 2, date);
  const base = { from, to, distanceNm, trueCourse, declination, magneticCourse: trueToMagnetic(trueCourse, declination), wind };
  if (!tas || tas <= 0) return { ...base, windCorrection: null, trueHeading: null, magneticHeading: null, groundSpeed: null, hours: null };
  const triangle = windTriangle(tas, trueCourse, wind.dir ?? 0, wind.dir === null ? 0 : (wind.speed ?? 0));
  // Viento mayor que la velocidad: no hay rumbo posible para esa derrota.
  if (!triangle || triangle.groundSpeed <= 0) return { ...base, windCorrection: null, trueHeading: null, magneticHeading: null, groundSpeed: null, hours: null };
  return {
    ...base,
    windCorrection: triangle.windCorrection,
    trueHeading: triangle.trueHeading,
    magneticHeading: trueToMagnetic(triangle.trueHeading, declination),
    groundSpeed: triangle.groundSpeed,
    hours: distanceNm / triangle.groundSpeed,
  };
}

export function buildLegs(points: RoutePoint[], tas: number | null, winds: LegWind[], date: Date): Leg[] {
  return points.slice(1).map((to, i) => buildLeg(points[i], to, tas, winds[i] ?? { dir: null, speed: null }, date));
}

export const totalDistanceNm = (legs: Leg[]) => legs.reduce((sum, l) => sum + l.distanceNm, 0);

/** Horas totales, o null si a algún tramo le falta el cálculo. */
export function totalHours(legs: Leg[]): number | null {
  if (!legs.length || legs.some((l) => l.hours === null)) return null;
  return legs.reduce((sum, l) => sum + l.hours!, 0);
}

/** "18/36 750x30 M - Tierra." → ["18", "36"]. Solo lo que es claramente un par de cabeceras. */
export function runwayEnds(text: string): string[] {
  const m = text.match(/^\s*(\d{1,2})([LRC]?)\s*\/\s*(\d{1,2})([LRC]?)\b/);
  if (!m) return [];
  const [a, b] = [Number(m[1]), Number(m[3])];
  if (a < 1 || a > 36 || b < 1 || b > 36) return [];
  return [`${m[1].padStart(2, "0")}${m[2]}`, `${m[3].padStart(2, "0")}${m[4]}`];
}

export type RunwayAdvice = { runway: string; headwind: number; crosswind: number; crossSide: "izquierda" | "derecha" | null };

/**
 * Cabecera con más viento de frente. El número de pista es magnético y el viento del METAR es verdadero: se pasa la pista
 * a verdadero con la declinación antes de comparar.
 */
export function bestRunway(runways: string[], windTrueDir: number, windSpeed: number, declinationEast: number): RunwayAdvice | null {
  const options = runways.flatMap(runwayEnds).map((runway) => {
    const trueHeading = normalize360(parseInt(runway, 10) * 10 + declinationEast);
    return { runway, ...windComponents(windTrueDir, windSpeed, trueHeading) };
  });
  if (!options.length) return null;
  return options.reduce((best, o) => (o.headwind > best.headwind ? o : best));
}

/** Índices de las áreas (SIGMET) que toca la ruta. */
export function crossedAreas(points: RoutePoint[], areas: GeoJSON.Feature<GeoJSON.Polygon>[]): number[] {
  if (points.length < 2) return [];
  const line = lineString(points.map((p) => [p.lng, p.lat]));
  return areas.flatMap((area, i) => (booleanIntersects(line, area) ? [i] : []));
}

export type SunCheck = { sunset: Date | null; dusk: Date | null; afterSunset: boolean; afterDusk: boolean; beforeSunrise: boolean };

/** Compara la llegada con el sol en el destino, para ese día en Argentina. */
export function sunAtArrival(arrival: Date, lat: number, lng: number): SunCheck {
  const day = arrival.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const times = getTimes(new Date(`${day}T12:00:00-03:00`), lat, lng);
  const valid = (d: Date | null | undefined) => (d && !Number.isNaN(d.getTime()) ? d : null);
  const sunset = valid(times.sunset);
  const dusk = valid(times.dusk);
  const sunrise = valid(times.sunrise);
  return { sunset, dusk, afterSunset: !!sunset && arrival > sunset, afterDusk: !!dusk && arrival > dusk, beforeSunrise: !!sunrise && arrival < sunrise };
}

