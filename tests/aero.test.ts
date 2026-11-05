// VA-191: lectura de datos aeronáuticos. Un error acá pondría un aeródromo en el lugar equivocado.
// Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { diffRecords, inArgentineBounds, looksTruncated, parseDmsCoordinate, type AeroRecord } from "../lib/aero/records";
import { parseLadDate, parseLadPages, type PdfItem } from "../lib/aero/lad";
import { madhelName, normalizeMadhel } from "../lib/aero/madhel";

test("coordenadas del listado a grados decimales", () => {
  assert.equal(parseDmsCoordinate("283428,00S"), -28.574444);
  assert.equal(parseDmsCoordinate("0601545,00W"), -60.2625);
  assert.equal(parseDmsCoordinate("632844,72S"), -63.479089);
});

test("coordenadas sin dato o imposibles no se inventan", () => {
  assert.equal(parseDmsCoordinate("000,00S"), null);
  assert.equal(parseDmsCoordinate("0000,00W"), null);
  assert.equal(parseDmsCoordinate("286128,00S"), null); // 61 minutos
  assert.equal(parseDmsCoordinate(""), null);
});

test("el rango incluye el Sector Antártico y rechaza lo que no es Argentina", () => {
  assert.equal(inArgentineBounds(-34.56, -58.42), true);
  assert.equal(inArgentineBounds(-63.48, -56.24), true);
  assert.equal(inArgentineBounds(0, 0), false);
  assert.equal(inArgentineBounds(-34.56, 58.42), false);
});

const item = (text: string, x: number, y: number, width = 10): PdfItem => ({ text, x, y, width });
const titles = (y: number) => [item("#", 59, y, 4), item("TIPO", 76, y), item("REGISTRO", 102, y - 6, 30), item("DENOMINACIÓN", 169, y, 40), item("RUMBO", 263, y), item("UBICACIÓN", 631, y, 30), item("REGIONAL", 741, y)];
const row = (n: string, type: string, reg: string, name: string, y: number, extra: PdfItem[] = []) => [
  item(n, 59, y, 4),
  item(type, 79, y, 14),
  item(reg, 114, y, 12),
  item(name, 184, y, 40),
  item("10/28", 268, y, 15),
  item("700m. x 30m.", 308, y, 30),
  item("TIERRA", 376, y, 20),
  item("60 mts.", 425, y, 20),
  item("283428,00S", 467, y, 30),
  item("0601545,00W", 515, y, 30),
  item("DRNE", 752, y, 14),
  ...extra,
];

test("cada coordenada queda en su fila, aunque la ubicación ocupe dos líneas", () => {
  const page = [
    item("28 de septiembre de 2026", 640, 470, 80),
    ...titles(426),
    ...row("1", "LAD", "176", "EL ADUAR", 402, [item("25 Km. al NW de INTIYACO, Provincia de SANTA", 574, 407, 120), item("FE.", 640, 397, 10)]),
    ...row("2", "LADH", "245", "EO. DIEZ", 380, [item("Ciudad de Rosario, Provincia de SANTA FE.", 574, 380, 120)]),
  ];
  const { records, sourceDate } = parseLadPages([page]);
  assert.equal(records.length, 2);
  assert.equal(records[0].name, "EL ADUAR");
  assert.equal(records[0].lat, -28.574444);
  assert.equal(records[0].province, "Santa Fe");
  assert.equal(records[0].location, "25 Km. al NW de INTIYACO, Provincia de SANTA FE.");
  assert.deepEqual(records[0].runways, ["10/28 700m. x 30m. TIERRA"]);
  assert.equal(records[1].kind, "LADH");
  assert.equal(sourceDate?.toISOString().slice(0, 10), "2026-09-28");
});

test("los tipos LADA y LAD/LADH en dos líneas se leen", () => {
  const twoLines = row("2", "LAD/L", "245", "EO. DIEZ", 380).map((i) => (i.text === "LAD/L" ? { ...i, y: 385 } : i));
  const page = [...titles(426), ...row("1", "LADA", "176", "BALLOON", 402), ...twoLines, item("ADH", 78, 375, 14)];
  const { records, warnings } = parseLadPages([page]);
  assert.deepEqual(records.map((r) => r.condition), ["LADA", "LAD/LADH"]);
  assert.deepEqual(warnings.filter((w) => /no se pudo leer/.test(w)), []);
});

test("una pista secundaria se suma al lugar principal, y sin coordenadas no se ubica en 0,0", () => {
  const secondary = row("2", "LAD", "176", "EL ADUAR (secundaria)", 380).map((i) => (i.text === "283428,00S" ? { ...i, text: "000,00S" } : i.text === "0601545,00W" ? { ...i, text: "0000,00W" } : i));
  const alone = row("3", "LAD", "300", "SIN POSICION", 360).map((i) => (i.text === "283428,00S" ? { ...i, text: "000,00S" } : i));
  const { records, warnings } = parseLadPages([[...titles(426), ...row("1", "LAD", "176", "EL ADUAR", 402), ...secondary, ...alone]]);
  assert.equal(records.length, 2);
  assert.deepEqual(records[0].runways, ["10/28 700m. x 30m. TIERRA", "10/28 700m. x 30m. TIERRA (secundaria)"]);
  assert.equal(records[0].lat, -28.574444);
  assert.equal(records[1].lat, null);
  assert.equal(records[1].lng, null);
  assert.ok(warnings.some((w) => /300 SIN POSICION: sin coordenadas/.test(w)));
});

test("una fila que no se puede leer se avisa y el PDF sin títulos falla", () => {
  const broken = row("1", "XXX", "176", "RARO", 402);
  const { records, warnings } = parseLadPages([[...titles(426), ...broken]]);
  assert.equal(records.length, 0);
  assert.ok(warnings.some((w) => /Fila 1: no se pudo leer/.test(w)));
  assert.throws(() => parseLadPages([[item("OTRA COSA", 10, 10)]]));
  assert.equal(parseLadDate("sin fecha"), null);
});

const record = (over: Partial<AeroRecord> = {}): AeroRecord => ({ kind: "LAD", code: "1", icao: null, iata: null, name: "A", fir: null, province: null, location: null, lat: -30, lng: -60, elevationM: 10, condition: null, runways: [], frequencies: [], details: {}, sourceUpdatedAt: null, ...over });

test("la comparación separa altas, bajas y cambios, sin contar detalles internos", () => {
  const diff = diffRecords(
    [record({ code: "1", elevationM: 10 }), record({ code: "2", name: "BAJA" }), record({ code: "3", details: { a: 1 } })],
    [record({ code: "1", elevationM: 12 }), record({ code: "3", details: { a: 2 } }), record({ code: "4", name: "ALTA" })]
  );
  assert.deepEqual(diff.added, [{ code: "4", name: "ALTA" }]);
  assert.deepEqual(diff.removed, [{ code: "2", name: "BAJA" }]);
  assert.deepEqual(diff.changed, [{ code: "1", name: "A", fields: [{ field: "elevationM", from: "10", to: "12" }] }]);
});

test("una versión con muchos menos registros se considera una falla", () => {
  assert.equal(looksTruncated(1000, 700), true);
  assert.equal(looksTruncated(1000, 950), false);
  assert.equal(looksTruncated(0, 10), false);
});

test("MADHEL: nombre, códigos y datos de un aeródromo público", () => {
  assert.equal(madhelName("BUENOS AIRES / AEROPARQUE J. NEWBERY - (AER / SABE) - DRCE - PÚBLICO CONTROLADO"), "BUENOS AIRES / AEROPARQUE J. NEWBERY");
  const { record: r, warnings } = normalizeMadhel(
    { local_identifier: "AER", human_readable_identifier: "BUENOS AIRES / AEROPARQUE J. NEWBERY - (AER / SABE) - DRCE - PÚBLICO CONTROLADO", updated_at: "2024-02-02T15:14:04Z" },
    {
      type: "AD",
      metadata: { identifiers: { icao: "SABE", iata: "AEP" }, condition: "PUBLICO", localization: { city_reference: "Ciudad de Buenos Aires", state: "CIUDAD AUTÓNOMA DE BUENOS AIRES", distance_reference: 2, direction_reference: "NE", elevation: 5, fir: "SAEF", coordinates: { lat: -34.5588888888889, lng: -58.4163888888889 } } },
      data: { rwy: [], ats: [], human_readable_localization: "***Consultar en el sitio web https://ais.anac.gob.ar/aip: AIP Parte AD***" },
    }
  );
  assert.equal(r.icao, "SABE");
  assert.equal(r.kind, "AD");
  assert.equal(r.elevationM, 5);
  assert.equal(r.lat, -34.558889);
  assert.equal(r.location, "2 km al NE de Ciudad de Buenos Aires");
  assert.equal(r.details.seeAip, true);
  assert.deepEqual(warnings, []);
});

test("MADHEL: un privado toma elevación y provincia del texto, y el helipuerto se distingue", () => {
  const { record: r } = normalizeMadhel(
    { local_identifier: "ACB", human_readable_identifier: "CORONEL BOGADO / AGROSERVICIOS - (ACB) - DRCE - PRIVADO NO CONTROLADO", updated_at: "2026-06-01T09:41:51Z", the_geom: { geometry: { coordinates: [-60.57066, -33.27226] } } },
    { type: "AD", metadata: { identifiers: { icao: null } }, data: { rwy: ["05/23 700x15 M - Tierra."], human_readable_localization: "331620S 0603414W - 6 KM al NE de la localidad de CORONEL BOGADO (Pcia. de SANTA FE) - ELEV 44 M 144 FT" } }
  );
  assert.equal(r.elevationM, 44);
  assert.equal(r.province, "Santa Fe");
  assert.equal(r.lat, -33.27226);
  assert.equal(r.lng, -60.57066);
  assert.equal(r.condition, "PRIVADO NO CONTROLADO");
  assert.deepEqual(r.runways, ["05/23 700x15 M - Tierra."]);
  assert.equal(r.location, "6 KM al NE de la localidad de CORONEL BOGADO (Pcia. de SANTA FE)");
  const heli = normalizeMadhel({ local_identifier: "HLP", human_readable_identifier: "LA PLATA / HELIPUERTO - (HLP) - DRCE - PÚBLICO", updated_at: "x" }, { type: "HEL" });
  assert.equal(heli.record.kind, "HELIPORT");
});

test("MADHEL: nombre sin código entre paréntesis, ubicación con segundos decimales y fecha para reintentar", () => {
  assert.equal(madhelName("HELIPUERTO EZEIZA / IFE - INSTITUTO DE FORMACIÓN EZEIZA - FIR EZE - MILITAR NO CONTROLADO"), "HELIPUERTO EZEIZA / IFE - INSTITUTO DE FORMACIÓN EZEIZA");
  assert.equal(madhelName("PERITO MORENO - JALIL HAMER"), "PERITO MORENO - JALIL HAMER");
  const item = { local_identifier: "EDP", human_readable_identifier: "ESTANCIA DON PABLO (EDP) - DRNE - PRIVADO NO CONTROLADO", updated_at: "2026-06-01T09:41:51Z", the_geom: { geometry: { coordinates: [-59.03, -29.547778] as [number, number] } } };
  const withDetail = normalizeMadhel(item, { data: { human_readable_localization: "293252,62S 0590148,58W - 50 KM al SE de la ciudad de GOYA (Pcia. de CORRIENTES)" } });
  assert.equal(withDetail.record.location, "50 KM al SE de la ciudad de GOYA (Pcia. de CORRIENTES)");
  assert.equal(withDetail.record.province, "Corrientes");
  assert.equal(withDetail.record.sourceUpdatedAt, "2026-06-01T09:41:51Z");
  assert.equal(normalizeMadhel(item, null).record.sourceUpdatedAt, null);
});

test("MADHEL: coordenadas fuera de rango no van al mapa", () => {
  const { record: r, warnings } = normalizeMadhel({ local_identifier: "X", human_readable_identifier: "X", updated_at: "x" }, { metadata: { localization: { coordinates: { lat: 0, lng: 0 } } } });
  assert.equal(r.lat, null);
  assert.equal(warnings.length, 1);
});
