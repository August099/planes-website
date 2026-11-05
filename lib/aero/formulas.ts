// VA-191: fórmulas de las calculadoras. Sin dependencias, probadas en tests/formulas.test.ts contra valores de
// referencia. Unidades internas: nudos, pies, hPa, °C, litros, grados. La conversión de unidades va aparte.

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
/** Rumbo entre 0 (inclusive) y 360. */
export const normalize360 = (d: number) => ((d % 360) + 360) % 360;

// --- Conversión de unidades ---
export const KG_PER_LB = 0.45359237;
export const L_PER_US_GAL = 3.785411784;
export const KMH_PER_KT = 1.852;
export const MPH_PER_KT = 1.150779448;
export const M_PER_FT = 0.3048;
export const HPA_PER_INHG = 33.8638866667;
export const KM_PER_NM = 1.852;
/** Densidad habitual del AVGAS 100LL a 15 °C. Varía con la temperatura: el usuario la puede cambiar. */
export const AVGAS_KG_PER_L = 0.72;
export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;

// --- Viento en pista ---
/** "18" es la pista 18 (180°); de 37 en adelante, grados. Las pistas van de 01 a 36. */
export const runwayToHeading = (value: number) => (value > 0 && value <= 36 ? value * 10 : value);

export type WindComponents = { headwind: number; crosswind: number; crossSide: "izquierda" | "derecha" | null };

/** Positivo = de frente; negativo = de cola. El lado es desde donde viene, mirando en el sentido de la pista. */
export function windComponents(windDirection: number, windSpeed: number, runwayHeading: number): WindComponents {
  const angle = toRad(windDirection - runwayHeading);
  const crosswind = windSpeed * Math.sin(angle);
  const clean = (n: number) => (Math.abs(n) < 1e-9 ? 0 : n);
  const cross = clean(crosswind);
  return {
    headwind: clean(windSpeed * Math.cos(angle)),
    crosswind: Math.abs(cross),
    crossSide: cross === 0 ? null : cross > 0 ? "derecha" : "izquierda",
  };
}

// --- Triángulo de viento ---
export type WindTriangle = { windCorrection: number; trueHeading: number; groundSpeed: number; headwind: number };

/** null si el viento es más fuerte que la velocidad y no se puede mantener la derrota. */
export function windTriangle(tas: number, trueCourse: number, windDirection: number, windSpeed: number): WindTriangle | null {
  if (tas <= 0) return null;
  const angle = toRad(windDirection - trueCourse);
  const sinWca = (windSpeed / tas) * Math.sin(angle);
  if (Math.abs(sinWca) > 1) return null;
  const wca = Math.asin(sinWca);
  const groundSpeed = tas * Math.cos(wca) - windSpeed * Math.cos(angle);
  if (groundSpeed <= 0) return null;
  return { windCorrection: toDeg(wca), trueHeading: normalize360(trueCourse + toDeg(wca)), groundSpeed, headwind: windSpeed * Math.cos(angle) };
}

/** Declinación positiva al Este: rumbo magnético = verdadero − declinación. */
export const trueToMagnetic = (trueHeading: number, declinationEast: number) => normalize360(trueHeading - declinationEast);

// --- Tiempo, velocidad y distancia ---
export const timeHours = (distance: number, speed: number) => (speed > 0 ? distance / speed : null);
export const distanceFrom = (speed: number, hours: number) => speed * hours;
export const speedFrom = (distance: number, hours: number) => (hours > 0 ? distance / hours : null);

/** "1:30" o "90" (minutos) a horas. null si no se entiende. */
export function parseDuration(text: string): number | null {
  const t = text.trim();
  const clock = t.match(/^(\d+):([0-5]?\d)$/);
  if (clock) return Number(clock[1]) + Number(clock[2]) / 60;
  const minutes = Number(t.replace(",", "."));
  return t !== "" && Number.isFinite(minutes) && minutes >= 0 ? minutes / 60 : null;
}

export function formatDuration(hours: number): string {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")} min`;
}

// --- Inicio de descenso ---
const FT_PER_NM = 6076.11549;
const TAN_3_DEG = Math.tan(toRad(3));

export type Descent = { altitudeToLose: number; minutes: number; distanceNm: number; rateFor3Deg: number; distanceFor3Deg: number; angleDeg: number };

export function topOfDescent(fromFt: number, toFt: number, groundSpeed: number, rateFpm: number): Descent | null {
  const altitudeToLose = fromFt - toFt;
  if (altitudeToLose <= 0 || groundSpeed <= 0 || rateFpm <= 0) return null;
  const minutes = altitudeToLose / rateFpm;
  const distanceNm = (minutes / 60) * groundSpeed;
  return {
    altitudeToLose,
    minutes,
    distanceNm,
    rateFor3Deg: (groundSpeed * FT_PER_NM * TAN_3_DEG) / 60,
    distanceFor3Deg: altitudeToLose / (FT_PER_NM * TAN_3_DEG),
    angleDeg: toDeg(Math.atan(altitudeToLose / (distanceNm * FT_PER_NM))),
  };
}

// --- Altitud de densidad ---
const ISA_SEA_LEVEL_HPA = 1013.25;
const ISA_SEA_LEVEL_K = 288.15;

/**
 * Altitud de presión: elevación más la diferencia del altímetro según la atmósfera estándar (OACI).
 * Altitud de densidad: la de la atmósfera estándar con la misma densidad (aire seco; la humedad la sube un poco más).
 */
export function densityAltitude(elevationFt: number, qnhHpa: number, oatC: number) {
  const pressureAltitude = elevationFt + 145366.45 * (1 - Math.pow(qnhHpa / ISA_SEA_LEVEL_HPA, 0.190284));
  const isaTemp = 15 - 0.0019812 * pressureAltitude;
  const stationPressure = ISA_SEA_LEVEL_HPA * Math.pow(1 - pressureAltitude / 145366.45, 1 / 0.190284);
  const densityRatio = stationPressure / ISA_SEA_LEVEL_HPA / ((oatC + 273.15) / ISA_SEA_LEVEL_K);
  return { pressureAltitude, isaTemp, isaDeviation: oatC - isaTemp, densityAltitude: 145442.16 * (1 - Math.pow(densityRatio, 0.234969)) };
}

// --- Combustible ---
export type FuelInput = { hours: number; perHour: number; taxi: number; reserve: { kind: "minutes" | "percent"; value: number } };

export function fuelNeeded({ hours, perHour, taxi, reserve }: FuelInput) {
  const trip = hours * perHour;
  const reserveFuel = reserve.kind === "minutes" ? (reserve.value / 60) * perHour : (trip * reserve.value) / 100;
  return { trip, taxi, reserve: reserveFuel, total: trip + taxi + reserveFuel };
}

// --- Peso y balance ---
export type LoadRow = { name: string; weight: number; arm: number };

export function weightAndBalance(rows: LoadRow[]) {
  const weight = rows.reduce((sum, r) => sum + r.weight, 0);
  const moment = rows.reduce((sum, r) => sum + r.weight * r.arm, 0);
  return { weight, moment, cg: weight > 0 ? moment / weight : null };
}

// --- Costo por hora ---
export type CostInput = {
  fixedPerYear: number;
  fuelPerHour: number;
  fuelPrice: number;
  otherPerHour: number;
  engineOverhaul: number;
  engineTbo: number;
  propOverhaul: number;
  propTbo: number;
  hoursPerYear: number;
};

export function costPerHour(c: CostInput) {
  const variable = c.fuelPerHour * c.fuelPrice + c.otherPerHour;
  const reserve = (c.engineTbo > 0 ? c.engineOverhaul / c.engineTbo : 0) + (c.propTbo > 0 ? c.propOverhaul / c.propTbo : 0);
  const at = (hours: number) => (hours > 0 ? c.fixedPerYear / hours + variable + reserve : null);
  return {
    variable,
    reserve,
    fixedPerHour: c.hoursPerYear > 0 ? c.fixedPerYear / c.hoursPerYear : null,
    total: at(c.hoursPerYear),
    annual: c.fixedPerYear + (variable + reserve) * c.hoursPerYear,
    at,
  };
}

// --- Hora local y UTC ---
/** Argentina no cambia la hora: UTC−3 todo el año. */
export const ARGENTINA_UTC_OFFSET = -3;

/** "1430" o "14:30" a minutos del día. */
export function parseClock(text: string): number | null {
  const m = text.trim().match(/^([01]?\d|2[0-3]):?([0-5]\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Convierte una hora y dice si cambia de día (−1, 0 o +1). */
export function shiftClock(minutes: number, offsetHours: number) {
  const shifted = minutes + offsetHours * 60;
  const dayShift = Math.floor(shifted / 1440);
  const clock = ((shifted % 1440) + 1440) % 1440;
  return { hhmm: `${String(Math.floor(clock / 60)).padStart(2, "0")}${String(clock % 60).padStart(2, "0")}`, dayShift };
}
