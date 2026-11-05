import { canonicalProvince, inArgentineBounds, parseDmsCoordinate, type AeroRecord } from "@/lib/aero/records";

// VA-191: lectura del Listado de Lugares Aptos Denunciados de ANAC (PDF con una tabla). Se usa la posición de
// cada texto en la página: extraído como texto corrido, las columnas se desalinean y una coordenada podría
// quedar en la fila de otro lugar. Lo que no cierra no se adivina: va como aviso en el informe.

export type PdfItem = { x: number; y: number; width: number; text: string };

const COORD_LAT = /^\d+(,\d+)?S$/;
const COORD_LNG = /^\d+(,\d+)?W$/;
// LAD, LADH, LADA (aerostatos) o LAD/LADH.
const TYPE = /^LAD(H|A|\/LADH)?$/;

type Columns = { headerY: number; type: number; registry: number; heading: number; location: number; regional: number };

/** Posición de cada columna, leída de los títulos de la tabla (primera página). */
export function findColumns(items: PdfItem[]): Columns | null {
  const find = (re: RegExp) => items.find((i) => re.test(i.text));
  const typeTitle = find(/^TIPO$/);
  const registry = find(/^REGISTRO$/);
  const heading = find(/^RUMBO$/);
  const location = find(/^UBICACI/);
  const regional = find(/^REGIONAL$/);
  if (!typeTitle || !registry || !heading || !location || !regional) return null;
  return { headerY: typeTitle.y, type: typeTitle.x, registry: registry.x, heading: heading.x, location: location.x, regional: regional.x };
}

const center = (i: PdfItem) => i.x + i.width / 2;

const joined = (list: PdfItem[] = []) =>
  [...list]
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map((i) => i.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

/** Una fila por cada número de la columna "#"; los textos de varias líneas van a la fila más cercana. */
export function parseLadPage(allItems: PdfItem[], columns: Columns, isFirstPage = false): { rows: AeroRecord[]; warnings: string[] } {
  // Los títulos de la tabla y el encabezado no son datos.
  const items = isFirstPage ? allItems.filter((i) => i.y < columns.headerY - 8) : allItems;
  const anchors = items.filter((i) => /^\d+$/.test(i.text) && center(i) < columns.type).sort((a, b) => b.y - a.y);
  const rows: AeroRecord[] = [];
  const warnings: string[] = [];
  if (!anchors.length) return { rows, warnings };

  const nearestAnchor = (y: number) => anchors.reduce((best, a) => (Math.abs(a.y - y) < Math.abs(best.y - y) ? a : best), anchors[0]);
  const locationBy = new Map<PdfItem, PdfItem[]>();
  const nameBy = new Map<PdfItem, PdfItem[]>();
  for (const i of items) {
    const c = center(i);
    const a = nearestAnchor(i.y);
    if (c > columns.location - 110 && c < columns.regional - 12 && !COORD_LNG.test(i.text) && !COORD_LAT.test(i.text)) {
      locationBy.set(a, [...(locationBy.get(a) ?? []), i]);
    } else if (c > columns.registry + 30 && c < columns.heading - 5) {
      nameBy.set(a, [...(nameBy.get(a) ?? []), i]);
    }
  }

  for (const a of anchors) {
    const line = items.filter((i) => Math.abs(i.y - a.y) < 2.5);
    // El tipo a veces va en dos líneas ("LAD/L" + "ADH").
    const typeText = items
      .filter((i) => Math.abs(i.y - a.y) < 7 && center(i) >= columns.type - 4 && center(i) < columns.registry)
      .sort((p, q) => q.y - p.y)
      .map((i) => i.text)
      .join("");
    const registry = line.find((i) => /^\d+$/.test(i.text) && i !== a)?.text;
    const name = joined(nameBy.get(a));
    if (!TYPE.test(typeText) || !registry || !name) {
      warnings.push(`Fila ${a.text}: no se pudo leer (${!registry ? "registro" : !name ? "nombre" : `tipo "${typeText}"`}). No se importa.`);
      continue;
    }
    const latText = line.find((i) => COORD_LAT.test(i.text))?.text ?? "";
    const lngText = line.find((i) => COORD_LNG.test(i.text))?.text ?? "";
    let lat = parseDmsCoordinate(latText);
    let lng = parseDmsCoordinate(lngText);
    if (lat === null || lng === null || !inArgentineBounds(lat, lng)) {
      if (lat !== null && lng !== null) warnings.push(`${registry} ${name}: coordenadas fuera de rango (${latText} ${lngText}). No va al mapa.`);
      lat = lng = null;
    }
    const elevation = line.find((i) => /mts\.$/.test(i.text))?.text;
    const heading = line.find((i) => /^(\d{2}\/\d{2}|-)$/.test(i.text))?.text ?? null;
    const dimensions = line.find((i) => /m\. x /.test(i.text))?.text ?? null;
    const surface =
      line.find((i) => /^[A-ZÁÉÍÓÚÑ ]+$/.test(i.text) && !/^DR[A-Z]{2}$/.test(i.text) && center(i) > columns.heading)?.text ?? null;
    const regional = line.find((i) => /^DR[A-Z]{2}$/.test(i.text))?.text ?? null;
    const location = joined(locationBy.get(a));
    rows.push({
      kind: typeText === "LADH" ? "LADH" : "LAD",
      code: registry,
      icao: null,
      iata: null,
      name,
      fir: null,
      province: canonicalProvince(location.match(/Provincia de ([^.]+)\./i)?.[1] ?? null),
      location: location || null,
      lat,
      lng,
      elevationM: elevation ? Number.parseInt(elevation, 10) : null,
      condition: typeText,
      runways: [[heading === "-" ? null : heading, dimensions, surface].filter(Boolean).join(" ")].filter(Boolean),
      frequencies: [],
      details: { row: a.text, regional },
      sourceUpdatedAt: null,
    });
  }
  return { rows, warnings };
}

/** "28 de septiembre de 2026" del encabezado. */
export function parseLadDate(text: string): Date | null {
  const m = text.match(/(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre) de (\d{4})/i);
  if (!m) return null;
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const name = m[2].toLowerCase() === "setiembre" ? "septiembre" : m[2].toLowerCase();
  return new Date(Date.UTC(Number(m[3]), months.indexOf(name), Number(m[1]), 12));
}

/**
 * Las pistas "(secundaria)" repiten el registro del lugar principal y no traen coordenadas: se suman a sus
 * pistas. Cualquier otro registro repetido no se adivina: queda el primero y se avisa.
 */
function mergeRepeated(records: AeroRecord[], warnings: string[]): AeroRecord[] {
  const byCode = new Map<string, AeroRecord>();
  for (const r of records) {
    const first = byCode.get(r.code);
    if (!first) {
      byCode.set(r.code, r);
    } else if (/secundaria/i.test(r.name)) {
      first.runways.push(...r.runways.map((w) => `${w} (secundaria)`));
    } else if (/secundaria/i.test(first.name)) {
      r.runways.push(...first.runways.map((w) => `${w} (secundaria)`));
      byCode.set(r.code, r);
    } else {
      warnings.push(`Registro ${r.code} repetido (${first.name} y ${r.name}): queda el primero.`);
    }
  }
  return [...byCode.values()];
}

export function parseLadPages(pages: PdfItem[][]): { records: AeroRecord[]; warnings: string[]; sourceDate: Date | null } {
  const columns = pages.length ? findColumns(pages[0]) : null;
  if (!columns) throw new Error("El PDF de LAD cambió de formato: no se encontraron los títulos de la tabla.");
  const parsed: AeroRecord[] = [];
  const warnings: string[] = [];
  pages.forEach((items, index) => {
    const page = parseLadPage(items, columns, index === 0);
    parsed.push(...page.rows);
    warnings.push(...page.warnings);
  });
  const last = parsed.reduce((max, r) => Math.max(max, Number((r.details as { row: string }).row)), 0);
  if (last > parsed.length) warnings.push(`El listado numera ${last} filas y se leyeron ${parsed.length}.`);
  const records = mergeRepeated(parsed, warnings);
  for (const r of records) if (r.lat === null) warnings.push(`${r.code} ${r.name}: sin coordenadas en el listado. No va al mapa.`);
  return { records, warnings, sourceDate: parseLadDate(pages[0].map((i) => i.text).join(" ")) };
}
