// VA-191: fórmulas de las calculadoras contra valores de referencia calculados a mano o publicados.
// Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  costPerHour,
  densityAltitude,
  formatCoordinate,
  formatDuration,
  fuelNeeded,
  normalize360,
  parseClock,
  parseDuration,
  runwayToHeading,
  shiftClock,
  timeHours,
  topOfDescent,
  trueToMagnetic,
  weightAndBalance,
  windComponents,
  windTriangle,
} from "../lib/aero/formulas";

const near = (actual: number | null | undefined, expected: number, tolerance: number, what = "") =>
  assert.ok(actual !== null && actual !== undefined && Math.abs(actual - expected) <= tolerance, `${what}: ${actual} no está cerca de ${expected}`);

test("pista: de 1 a 36 es el número de pista; desde 37, grados", () => {
  assert.equal(runwayToHeading(18), 180);
  assert.equal(runwayToHeading(3), 30);
  assert.equal(runwayToHeading(36), 360);
  assert.equal(runwayToHeading(137), 137);
});

test("viento cruzado: casos de referencia", () => {
  // 30° a la derecha de la pista, 20 kt: seno 30 = 0,5; coseno 30 = 0,866.
  const a = windComponents(210, 20, 180);
  near(a.crosswind, 10, 1e-6);
  near(a.headwind, 17.32, 0.01);
  assert.equal(a.crossSide, "derecha");
  // Puro de costado desde la izquierda.
  const b = windComponents(270, 15, 360);
  near(b.crosswind, 15, 1e-6);
  near(b.headwind, 0, 1e-6);
  assert.equal(b.crossSide, "izquierda");
  // De cola, sin componente cruzada.
  const c = windComponents(360, 12, 180);
  near(c.headwind, -12, 1e-6);
  assert.equal(c.crossSide, null);
  // Cruce del norte: viento 010, pista 350 es 20° a la derecha.
  assert.equal(windComponents(10, 10, 350).crossSide, "derecha");
});

test("triángulo de viento: casos de referencia", () => {
  const a = windTriangle(100, 90, 360, 20);
  near(a?.windCorrection, -11.54, 0.01, "corrección");
  near(a?.trueHeading, 78.46, 0.01, "rumbo");
  near(a?.groundSpeed, 97.98, 0.01, "GS");
  // Frente puro.
  const b = windTriangle(120, 180, 180, 30);
  near(b?.windCorrection, 0, 1e-6);
  near(b?.groundSpeed, 90, 1e-6);
  // Cola pura.
  near(windTriangle(120, 180, 360, 30)?.groundSpeed, 150, 1e-6);
  // El viento gana.
  assert.equal(windTriangle(50, 90, 360, 60), null);
  assert.equal(windTriangle(50, 90, 90, 60), null);
});

test("declinación: al Este se resta, al Oeste se suma", () => {
  near(trueToMagnetic(100, 5), 95, 1e-9);
  near(trueToMagnetic(100, -8), 108, 1e-9);
  near(trueToMagnetic(2, 5), 357, 1e-9);
  near(normalize360(-10), 350, 1e-9);
});

test("tiempo y duraciones", () => {
  near(timeHours(150, 100), 1.5, 1e-9);
  assert.equal(timeHours(150, 0), null);
  near(parseDuration("1:30"), 1.5, 1e-9);
  near(parseDuration("90"), 1.5, 1e-9);
  near(parseDuration("7,5"), 0.125, 1e-9);
  assert.equal(parseDuration("abc"), null);
  assert.equal(parseDuration(""), null);
  assert.equal(formatDuration(1.5), "1 h 30 min");
  assert.equal(formatDuration(0.05), "0 h 03 min");
});

test("inicio de descenso", () => {
  // 6000 ft a 500 ft/min son 12 min; a 120 kt, 24 NM.
  const d = topOfDescent(8000, 2000, 120, 500);
  near(d?.minutes, 12, 1e-9);
  near(d?.distanceNm, 24, 1e-9);
  // Senda de 3°: unos 5,3 × GS y 318 ft por NM (referencias habituales).
  near(d?.rateFor3Deg, 637, 1);
  near(d?.distanceFor3Deg, 18.85, 0.05);
  assert.equal(topOfDescent(2000, 8000, 120, 500), null);
  assert.equal(topOfDescent(8000, 2000, 120, 0), null);
});

test("altitud de densidad: atmósfera estándar y casos de referencia", () => {
  // En condiciones estándar, altitud de presión y de densidad coinciden con la elevación.
  const std = densityAltitude(0, 1013.25, 15);
  near(std.pressureAltitude, 0, 0.01);
  near(std.densityAltitude, 0, 15);
  const std5 = densityAltitude(5000, 1013.25, 5.1);
  near(std5.isaTemp, 5.09, 0.01);
  near(std5.densityAltitude, 5000, 20);
  // 10 hPa menos son unos 275 ft más de altitud de presión.
  near(densityAltitude(0, 1003.25, 15).pressureAltitude, 275, 5);
  // 5000 ft, altímetro estándar, 30 °C: cerca de 7800 ft (la regla práctica de 120 ft/°C da unos 8000).
  near(densityAltitude(5000, 1013.25, 30).densityAltitude, 7800, 150);
});

test("combustible: reserva en minutos o en porcentaje", () => {
  const a = fuelNeeded({ hours: 2, perHour: 40, taxi: 5, reserve: { kind: "minutes", value: 45 } });
  assert.deepEqual(a, { trip: 80, taxi: 5, reserve: 30, total: 115 });
  assert.equal(fuelNeeded({ hours: 2, perHour: 40, taxi: 0, reserve: { kind: "percent", value: 10 } }).reserve, 8);
});

test("peso y balance", () => {
  const r = weightAndBalance([
    { name: "Vacío", weight: 700, arm: 1 },
    { name: "Piloto", weight: 80, arm: 1.5 },
    { name: "Combustible", weight: 100, arm: 2 },
  ]);
  assert.equal(r.weight, 880);
  near(r.moment, 1020, 1e-9);
  near(r.cg, 1.1591, 0.0001);
  assert.equal(weightAndBalance([]).cg, null);
});

test("costo por hora: volar más baja el costo", () => {
  const c = costPerHour({ fixedPerYear: 10000, fuelPerHour: 30, fuelPrice: 2, otherPerHour: 20, engineOverhaul: 30000, engineTbo: 2000, propOverhaul: 5000, propTbo: 1000, hoursPerYear: 100 });
  assert.equal(c.variable, 80);
  assert.equal(c.reserve, 20);
  assert.equal(c.fixedPerHour, 100);
  assert.equal(c.total, 200);
  assert.equal(c.annual, 20000);
  assert.equal(c.at(200), 150);
  assert.equal(c.at(0), null);
});

test("hora local y UTC: Argentina es UTC−3, con cambio de día", () => {
  assert.equal(parseClock("1430"), 870);
  assert.equal(parseClock("14:30"), 870);
  assert.equal(parseClock("930"), 570);
  assert.equal(parseClock("2500"), null);
  assert.deepEqual(shiftClock(870, 3), { hhmm: "1730", dayShift: 0 });
  assert.deepEqual(shiftClock(1350, 3), { hhmm: "0130", dayShift: 1 });
  assert.deepEqual(shiftClock(60, -3), { hhmm: "2200", dayShift: -1 });
});

test("coordenadas para leer en la ficha", () => {
  assert.equal(formatCoordinate(-34.558889, "lat"), "34°33'32\"S");
  assert.equal(formatCoordinate(-58.416389, "lng"), "058°24'59\"W");
  assert.equal(formatCoordinate(-28.574444, "lat"), "28°34'28\"S");
});
