// VA-191: lectura de METAR y TAF. Los ejemplos son reales de la API (Aeroparque y Ezeiza, 4/11/2026).
// Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeChange, describeClouds, describeHazard, describeMiles, describeSigmetLevels, describeVisibility, describeWeather, describeWind, isRecentMetar, minutesAgo, regionalSigmets, sigmetRing, type NoaaSigmet } from "../lib/aero/metar";

test("viento: dirección, variable, calma y ráfagas", () => {
  assert.equal(describeWind("VRB", 4), "Variable a 4 kt");
  assert.equal(describeWind(270, 5), "Del 270° a 5 kt");
  assert.equal(describeWind(30, 12, 22), "Del 030° a 12 kt, ráfagas de 22 kt");
  assert.equal(describeWind(0, 0), "Calma");
  assert.equal(describeWind(null, null), "Sin datos de viento");
});

test("visibilidad: se lee en metros del METAR argentino, no de las millas de la API", () => {
  assert.equal(describeVisibility("METAR SABE 050200Z VRB04KT CAVOK 19/09 Q1012 NOSIG", "6+"), "10 km o más (CAVOK)");
  assert.equal(describeVisibility("METAR SAEZ 050200Z 27005KT 9999 FEW030 19/09 Q1012", "6+"), "10 km o más");
  assert.equal(describeVisibility("METAR SAEZ 050200Z 27005KT 3000 BR 12/11 Q1012", 1.86), "3.000 m");
  assert.equal(describeVisibility("METAR SAEZ 050200Z 27005KT 240V300 6000 FEW030 Q1012", 3.7), "6 km");
  assert.equal(describeVisibility("METAR SAEZ 050200Z 27005MPS 0800 FG 12/12 Q1012", 0.5), "800 m");
});

test("un CAVOK en el pronóstico de tendencia no cambia la visibilidad actual", () => {
  assert.equal(describeVisibility("METAR SAEZ 050200Z 27005KT 3000 BR 12/11 Q1012 BECMG CAVOK", 1.86), "3.000 m");
});

test("sin metros en el texto, convierte de millas y lo aclara", () => {
  assert.equal(describeVisibility("METAR KXXX 050200Z 27005KT 3SM CLR", 3), "Unos 4,8 km");
  assert.equal(describeMiles("6+"), "10 km o más");
  assert.equal(describeMiles(null), "Sin dato");
});

test("nubes", () => {
  assert.equal(describeClouds([{ cover: "FEW", base: 3000 }, { cover: "OVC", base: 12000 }]), "Pocas nubes a 3.000 ft; Cubierto a 12.000 ft");
  assert.equal(describeClouds([], "CAVOK"), "CAVOK");
  assert.equal(describeClouds([{ cover: "NSC", base: null }]), "Sin nubes significativas");
  assert.equal(describeClouds(undefined), "Sin datos de nubes");
});

test("tiempo presente: lo conocido se traduce y lo desconocido queda como está", () => {
  assert.equal(describeWeather("-RA"), "Lluvia ligera");
  assert.equal(describeWeather("+TSRA"), "Tormenta con lluvia fuerte");
  assert.equal(describeWeather("TS"), "Tormenta");
  assert.equal(describeWeather("-SHRA"), "Chaparrones de lluvia ligera");
  assert.equal(describeWeather("VCSH"), "Chaparrones en las cercanías");
  assert.equal(describeWeather("MIFG"), "Niebla baja");
  assert.equal(describeWeather("FZRA"), "Lluvia engelante");
  assert.equal(describeWeather("-RASN"), "Lluvia y nieve ligera");
  assert.equal(describeWeather("BR HZ"), "Neblina; Calima");
  assert.equal(describeWeather("XXZZ"), "XXZZ");
  assert.equal(describeWeather(null), null);
});

test("un METAR viejo no se muestra como actual", () => {
  const now = Date.UTC(2026, 10, 5, 3, 0, 0);
  const seconds = (hoursAgo: number) => (now - hoursAgo * 3600000) / 1000;
  assert.equal(isRecentMetar(seconds(1), now), true);
  assert.equal(isRecentMetar(seconds(4), now), false);
  assert.equal(minutesAgo(seconds(1), now), 60);
});

test("bloques del TAF", () => {
  assert.equal(describeChange(null), "Inicial");
  assert.equal(describeChange("BECMG"), "Cambio gradual");
  assert.equal(describeChange("PROB", 30), "Probabilidad 30 %");
});

test("SIGMET: niveles sin inventar una base", () => {
  assert.equal(describeSigmetLevels(0, 15000), "Hasta FL150");
  assert.equal(describeSigmetLevels(10000, 25000), "FL100 a FL250");
  assert.equal(describeSigmetLevels(null, null), "Niveles en el texto original");
  assert.equal(describeHazard("TS"), "Tormentas");
  assert.equal(describeHazard("XX"), "XX");
});

test("SIGMET: solo vigentes y de la región, con las FIR argentinas primero", () => {
  const now = 1_800_000_000_000;
  const s = (firId: string, lat: number, from: number, to: number): NoaaSigmet => ({ firId, validTimeFrom: now / 1000 + from, validTimeTo: now / 1000 + to, rawSigmet: "", coords: [{ lat, lon: -60 }] });
  const list = regionalSigmets([s("SBCW", -25, -60, 60), s("SAEF", -35, -60, 60), s("SAVF", -40, -600, -60), s("SAMF", -33, 600, 1200), s("EGTT", 51, -60, 60)], now);
  assert.deepEqual(list.map((x) => x.firId), ["SAEF", "SBCW"]);
});

test("SIGMET: cierra el anillo y descarta geometrías sin área", () => {
  const base = { validTimeFrom: 0, validTimeTo: 1, rawSigmet: "" };
  assert.deepEqual(sigmetRing({ ...base, coords: [{ lat: 1, lon: 1 }, { lat: 2, lon: 1 }, { lat: 2, lon: 2 }] }), [[1, 1], [1, 2], [2, 2], [1, 1]]);
  assert.equal(sigmetRing({ ...base, coords: [{ lat: 1, lon: 1 }] }), null);
});
