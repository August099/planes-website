import { normalizeProvince } from "@/lib/provinces";

// VA-191: formato común de lo que se importa (MADHEL y LAD), comparación con la versión vigente y validaciones.
// Sin dependencias de servidor, para poder probarlo. Un dato aeronáutico dudoso no se publica: se avisa.

export type AeroRecord = {
  kind: "AD" | "HELIPORT" | "LAD" | "LADH";
  code: string;
  icao: string | null;
  iata: string | null;
  name: string;
  fir: string | null;
  province: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  elevationM: number | null;
  condition: string | null;
  runways: string[];
  frequencies: string[];
  details: Record<string, unknown>;
  sourceUpdatedAt: string | null;
};

export type AeroDiff = {
  added: { code: string; name: string }[];
  removed: { code: string; name: string }[];
  changed: { code: string; name: string; fields: { field: string; from: string; to: string }[] }[];
};

// Lo que un piloto usaría: si cambia, tiene que verse en el informe. "details" y las fechas no cuentan.
const COMPARED = ["kind", "icao", "iata", "name", "fir", "province", "location", "lat", "lng", "elevationM", "condition", "runways", "frequencies"] as const;

const printable = (v: unknown) => (v === null || v === undefined || v === "" ? "(vacío)" : Array.isArray(v) ? v.join("; ") || "(vacío)" : String(v));

export function diffRecords(current: AeroRecord[], next: AeroRecord[]): AeroDiff {
  const before = new Map(current.map((r) => [r.code, r]));
  const after = new Map(next.map((r) => [r.code, r]));
  const diff: AeroDiff = { added: [], removed: [], changed: [] };
  for (const r of next) {
    const old = before.get(r.code);
    if (!old) {
      diff.added.push({ code: r.code, name: r.name });
      continue;
    }
    const fields = COMPARED.filter((f) => JSON.stringify(old[f] ?? null) !== JSON.stringify(r[f] ?? null)).map((f) => ({ field: f, from: printable(old[f]), to: printable(r[f]) }));
    if (fields.length) diff.changed.push({ code: r.code, name: r.name, fields });
  }
  for (const r of current) if (!after.has(r.code)) diff.removed.push({ code: r.code, name: r.name });
  return diff;
}

// Territorio argentino, con el Sector Antártico (los listados incluyen bases antárticas). Sirve para detectar
// errores de lectura, no para decidir soberanía ni límites.
export const inArgentineBounds = (lat: number, lng: number) => lat <= -21 && lat >= -90 && lng >= -75 && lng <= -25;

/** Las fuentes escriben "SANTA FÉ" o "SANTA FE": se guarda el nombre de la lista del sitio. Si no está, tal cual. */
export const canonicalProvince = (raw: string | null): string | null => {
  const text = raw?.trim();
  if (!text) return null;
  return normalizeProvince(text) ?? text;
};

/** Una versión nueva con muchos menos registros que la vigente indica una falla de lectura: no se ofrece. */
export const looksTruncated = (currentCount: number, nextCount: number) => currentCount > 0 && nextCount < currentCount * 0.8;

/** "283428,00S" o "0601545,37W" (grados, minutos y segundos pegados) a grados decimales. "000,00S" es sin dato: null. */
export function parseDmsCoordinate(raw: string): number | null {
  const m = raw.trim().match(/^(\d{2,3})(\d{2})(\d{2}(?:,\d+)?)([NSEW])$/);
  if (!m) return null;
  const deg = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3].replace(",", "."));
  if (min >= 60 || sec >= 60) return null;
  const value = deg + min / 60 + sec / 3600;
  if (value === 0) return null;
  return Number(((m[4] === "S" || m[4] === "W" ? -1 : 1) * value).toFixed(6));
}
