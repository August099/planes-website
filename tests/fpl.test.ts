// VA-191: motor de ruta y formulario OACI. Valores de referencia calculados aparte con la fórmula de haversine,
// y formato según PANS-ATM (Doc 4444). Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { bestRunway, buildLeg, buildLegs, crossedAreas, declinationAt, runwayEnds, sunAtArrival, totalDistanceNm, totalHours, type RoutePoint } from "../lib/aero/route";
import { planFuel, planWarnings } from "../lib/aero/plan-summary";
import { aircraftIdent, buildItems, emptyDraft, enduranceHhmm, fplMessage, hoursToHhmm, icaoCoordinates, localToUtc, missingFields } from "../lib/aero/fpl";

const near = (a: number, b: number, tol: number, what = "") => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} no está cerca de ${b}`);
const place = (icao: string | null, name: string, lat: number, lng: number): RoutePoint => ({ kind: "AD", code: icao ?? name, icao, name, lat, lng });
const SABE = place("SABE", "AEROPARQUE", -34.558889, -58.416389);
const SACO = place("SACO", "CORDOBA", -31.3236, -64.208);
const date = new Date("2026-11-05T12:00:00Z");

function haversineNm(a: RoutePoint, b: RoutePoint) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return (2 * 6371.0088 * Math.asin(Math.sqrt(h))) / 1.852;
}

test("distancia y rumbo: un grado de latitud son 60 NM aprox., y los puntos cardinales dan rumbos exactos", () => {
  const north = buildLeg(place(null, "A", -34, -60), place(null, "B", -33, -60), null, { dir: null, speed: null }, date);
  near(north.distanceNm, 60.04, 0.05, "distancia");
  near(north.trueCourse, 0, 0.001, "norte");
  const south = buildLeg(place(null, "B", -33, -60), place(null, "A", -34, -60), null, { dir: null, speed: null }, date);
  near(south.trueCourse, 180, 0.001, "sur");
  const west = buildLeg(place(null, "A", 0, -60), place(null, "B", 0, -61), null, { dir: null, speed: null }, date);
  near(west.trueCourse, 270, 0.001, "oeste");
});

test("Aeroparque a Córdoba: coincide con haversine y con el rumbo esperado", () => {
  const leg = buildLeg(SABE, SACO, 120, { dir: null, speed: null }, date);
  near(leg.distanceNm, haversineNm(SABE, SACO), 0.01, "distancia");
  near(leg.distanceNm, 348, 3, "distancia aproximada");
  const r = Math.PI / 180;
  const y = Math.sin((SACO.lng - SABE.lng) * r) * Math.cos(SACO.lat * r);
  const x = Math.cos(SABE.lat * r) * Math.sin(SACO.lat * r) - Math.sin(SABE.lat * r) * Math.cos(SACO.lat * r) * Math.cos((SACO.lng - SABE.lng) * r);
  near(leg.trueCourse, (Math.atan2(y, x) / r + 360) % 360, 0.01, "rumbo");
  near(leg.trueCourse, 302, 1, "rumbo aproximado");
  assert.equal(leg.groundSpeed, 120);
  near(leg.hours!, leg.distanceNm / 120, 0.001, "tiempo");
});

test("declinación WMM: oeste en Buenos Aires y este en Ushuaia, en los valores esperados", () => {
  near(declinationAt(-34.56, -58.42, date), -10.3, 1.5, "Buenos Aires");
  near(declinationAt(-54.84, -68.3, date), 11.6, 2, "Ushuaia");
});

test("rumbo magnético: con declinación oeste se suma", () => {
  const leg = buildLeg(SABE, SACO, 120, { dir: null, speed: null }, date);
  near(leg.magneticCourse, (leg.trueCourse - leg.declination + 360) % 360, 0.001, "magnético");
  assert.ok(leg.declination < 0);
  assert.ok(leg.magneticCourse > leg.trueCourse);
});

test("viento: de frente baja la velocidad y de costado corrige el rumbo hacia el viento", () => {
  const from = place(null, "A", -34, -60);
  const to = place(null, "B", -33, -60);
  const head = buildLeg(from, to, 100, { dir: 0, speed: 20 }, date);
  near(head.groundSpeed!, 80, 0.01, "frente");
  const cross = buildLeg(from, to, 100, { dir: 90, speed: 20 }, date);
  near(cross.windCorrection!, 11.54, 0.05, "corrección");
  near(cross.trueHeading!, 11.54, 0.05, "rumbo");
  near(cross.groundSpeed!, 97.98, 0.05, "GS");
});

test("sin velocidad no hay tiempo, y el total lo refleja", () => {
  const legs = buildLegs([SABE, SACO], null, [], date);
  assert.equal(legs[0].hours, null);
  assert.equal(totalHours(legs), null);
  const ok = buildLegs([SABE, place(null, "X", -33, -60), SACO], 120, [], date);
  assert.equal(ok.length, 2);
  near(totalHours(ok)!, totalDistanceNm(ok) / 120, 0.001, "total");
});

test("pistas: lee solo un par de cabeceras real", () => {
  assert.deepEqual(runwayEnds("18/36 750x30 M - Tierra."), ["18", "36"]);
  assert.deepEqual(runwayEnds("02/20 1063x40 M - Tierra – ILE."), ["02", "20"]);
  assert.deepEqual(runwayEnds("13L/31R 3000x45"), ["13L", "31R"]);
  assert.deepEqual(runwayEnds("750x30 M - Tierra"), []);
  assert.deepEqual(runwayEnds("40/50 algo"), []);
});

test("pista recomendada: compara en verdadero, con la declinación", () => {
  // Pista 18 magnética con 10° W de declinación = 170 verdadero. Viento verdadero del 170: todo de frente.
  const south = bestRunway(["18/36 750x30"], 170, 10, -10)!;
  assert.equal(south.runway, "18");
  near(south.headwind, 10, 0.01, "frente");
  near(south.crosswind, 0, 0.01, "cruzado");
  const north = bestRunway(["18/36 750x30"], 350, 10, -10)!;
  assert.equal(north.runway, "36");
  assert.equal(bestRunway(["sin dato"], 170, 10, -10), null);
});

test("cruce de áreas", () => {
  const area: GeoJSON.Feature<GeoJSON.Polygon> = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[-62, -33], [-61, -33], [-61, -32], [-62, -32], [-62, -33]]] } };
  assert.deepEqual(crossedAreas([SABE, SACO], [area]), [0]);
  assert.deepEqual(crossedAreas([place(null, "A", -40, -60), place(null, "B", -41, -60)], [area]), []);
});

test("sol: una llegada de noche se detecta en la zona horaria argentina", () => {
  const night = sunAtArrival(new Date("2026-11-05T23:50:00Z"), -34.56, -58.42); // 20:50 en Argentina.
  assert.equal(night.afterSunset, true);
  assert.equal(night.afterDusk, true);
  const day = sunAtArrival(new Date("2026-11-05T15:00:00Z"), -34.56, -58.42); // 12:00.
  assert.equal(day.afterSunset, false);
  assert.equal(day.beforeSunrise, false);
});

test("casillas: matrícula, coordenadas, hora y duraciones", () => {
  assert.equal(aircraftIdent("lv-abc"), "LVABC");
  assert.equal(icaoCoordinates(-34.558889, -58.416389), "3434S05825W");
  assert.equal(icaoCoordinates(-34.9999, -58.9999), "3500S05900W");
  assert.equal(icaoCoordinates(5.5, 7.25), "0530N00715E");
  assert.equal(localToUtc("2026-11-05", "22:30")!.toISOString(), "2026-11-06T01:30:00.000Z");
  assert.equal(localToUtc("2026-11-05", "25:00"), null);
  assert.equal(hoursToHhmm(2.9), "0254");
  assert.equal(hoursToHhmm(1.9999), "0200");
  assert.equal(enduranceHhmm("3:30"), "0330");
  assert.equal(enduranceHhmm("0430"), "0430");
  assert.equal(enduranceHhmm("abc"), null);
});

function fullDraft() {
  const d = emptyDraft();
  d.aircraft = { ...d.aircraft, registration: "LV-ABC", typeCode: "C182", wake: "L", cruiseKt: "135", color: "Blanco y rojo", equipment: ["S", "G"], surveillance: ["C"] };
  d.route = { ...d.route, origin: SABE, destination: SACO, alternate: place("SAOC", "RIO CUARTO", -33.085, -64.261) };
  d.flight = { ...d.flight, date: "2026-11-05", time: "22:30", rules: "V", type: "G", persons: "2", endurance: "5:00", pilot: "Juan Pérez" };
  return d;
}

test("mensaje FPL completo, con la hora y la fecha pasadas a UTC", () => {
  const items = buildItems(fullDraft(), 2.58);
  assert.deepEqual(missingFields(items), []);
  assert.equal(
    fplMessage(items),
    ["(FPL-LVABC-VG", "-C182/L-SG/C", "-SABE0130", "-N0135VFR DCT", "-SACO0235 SAOC", "-DOF/261106)"].join("\n")
  );
  assert.equal(items.item19.endurance, "0500");
  assert.equal(items.item19.persons, "002");
  assert.equal(items.item19.pilot, "JUAN PEREZ");
});

test("LAD sin código OACI: ZZZZ y DEP/DEST/ALTN con nombre y coordenadas, sin caracteres reservados", () => {
  const d = fullDraft();
  d.route.origin = place(null, "LA-ESTANCIA / SUR (1)", -34.5, -60.25);
  d.route.destination = place(null, "ÑANDÚ", -35, -61);
  d.route.alternate = place(null, "OTRO", -36, -62);
  const i = buildItems(d, 1);
  assert.equal(i.item13Dep, "ZZZZ");
  assert.equal(i.item16Dest, "ZZZZ");
  assert.equal(i.item16Altn, "ZZZZ");
  assert.equal(i.item18, "DEP/LA ESTANCIA SUR 1 3430S06015W DEST/NANDU 3500S06100W DOF/261106 ALTN/OTRO 3600S06200W");
});

test("tipo sin designador: ZZZZ y TYP/. Puntos intermedios en la ruta. Nivel con formato", () => {
  const d = fullDraft();
  d.aircraft.typeCode = "";
  d.aircraft.typeText = "Experimental RV-7";
  d.route.waypoints = [place(null, "P1", -33.5, -60.5)];
  d.flight.levelKind = "A";
  d.flight.level = "45";
  const i = buildItems(d, 1);
  assert.equal(i.item9Type, "ZZZZ");
  assert.ok(i.item18.includes("TYP/EXPERIMENTAL RV 7"));
  assert.equal(i.item15Level, "A045");
  assert.equal(i.item15Route, "DCT 3330S06030W DCT");
});

test("lo que falta se señala, incluido PBN", () => {
  const empty = missingFields(buildItems(emptyDraft(), null)).map((m) => m.label);
  assert.ok(empty.includes("Reglas de vuelo"));
  assert.ok(empty.includes("Duración total estimada"));
  const d = fullDraft();
  d.aircraft.equipment = ["S", "R"];
  assert.ok(missingFields(buildItems(d, 1)).some((m) => m.item === "18"));
  d.aircraft.pbn = "b2";
  const i = buildItems(d, 1);
  assert.ok(i.item18.startsWith("PBN/B2 "));
  assert.equal(missingFields(i).length, 0);
});

test("combustible: suma vuelo, rodaje y la reserva que carga el piloto, sin valores por defecto", () => {
  const d = fullDraft();
  d.aircraft.fuelPerHour = "40";
  d.flight.taxiFuel = "5";
  assert.equal(planFuel(d, null), null);
  const noReserve = planFuel(d, 2)!;
  assert.equal(noReserve.reserve, 0);
  assert.equal(noReserve.total, 85);
  assert.ok(noReserve.lines.includes("Reserva: sin cargar"));
  d.flight.reserveMinutes = "45";
  const full = planFuel(d, 2)!;
  assert.equal(full.reserve, 30);
  assert.equal(full.total, 115);
});

test("avisos: combustible, autonomía y noche", () => {
  const d = fullDraft();
  d.aircraft.fuelPerHour = "40";
  d.flight.fuelOnBoard = "60";
  d.flight.endurance = "2:00";
  d.flight.reserveMinutes = "45";
  const w = planWarnings(d, 2, null);
  assert.equal(w.length, 2);
  assert.ok(w[0].includes("no alcanza"));
  assert.ok(w[1].includes("autonomía"));
  d.flight.fuelOnBoard = "200";
  d.flight.endurance = "5:00";
  assert.deepEqual(planWarnings(d, 2, null), []);
  const dusk = new Date("2026-11-05T22:50:00Z");
  const night = planWarnings(d, 2, { sunset: dusk, dusk, afterSunset: true, afterDusk: true, beforeSunrise: false });
  assert.ok(night[0].startsWith("Llegás de noche"));
  assert.ok(night[0].includes("19:50"));
});
