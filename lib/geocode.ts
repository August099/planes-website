import { provinceByName } from "@/lib/provinces";

// VA-83: coordenadas aproximadas de un aviso a partir de su localidad, con la API Georef del
// gobierno argentino (https://datosgobar.github.io/georef-ar-api/, datos CC BY 4.0). Se usa el
// centroide de la localidad: el mapa muestra una zona de ~5 km, nunca un punto exacto.
//
// - Se llama al crear o editar un aviso (no en cada visita) y desde scripts/geocode-listings.ts.
// - Si la API no responde o no encuentra la localidad, devuelve null y lo registra: el aviso se
//   guarda igual, sin mapa.
// Sin "server-only": el script de geocodificación también lo usa.

const GEOREF = "https://apis.datos.gob.ar/georef/api";
const TIMEOUT_MS = 4000;

export type Coordinates = { lat: number; lon: number };
export type GeocodeResult =
  | { ok: true; coords: Coordinates; match: "exacta" | "aproximada" | "ciudad-autonoma"; name: string }
  | { ok: false; reason: string };

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // "Los Conquistadores" y "Conquistadores" son la misma localidad.
    .replace(/^(el|la|los|las) /, "");

function levenshtein(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

type GeorefPlace = { nombre: string; centroide: { lat: number; lon: number } };

async function query(path: string, params: Record<string, string>): Promise<GeorefPlace[]> {
  const url = `${GEOREF}/${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`Georef ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;
  return (json[path] as GeorefPlace[]) ?? [];
}

// En CABA las "localidades" de Georef son barrios: si el aviso dice "CABA", "Capital Federal",
// etc., se usa el centroide de la ciudad (entra entera en el círculo de zona aproximada).
const CABA_ALIASES = new Set(["caba", "capital federal", "capital", "buenos aires", "ciudad de buenos aires", "ciudad autonoma de buenos aires", "c a b a"]);

export async function geocodeLocality(city: string | null | undefined, province: string | null | undefined): Promise<GeocodeResult> {
  const prov = provinceByName(province);
  if (!prov) return { ok: false, reason: `provincia no reconocida: "${province ?? ""}"` };
  const name = (city ?? "").trim();
  const wanted = normalize(name);

  try {
    if (prov.slug === "caba" && (!wanted || CABA_ALIASES.has(wanted))) {
      const [p] = await query("provincias", { nombre: prov.name, campos: "nombre,centroide", max: "1" });
      if (p) return { ok: true, coords: { lat: p.centroide.lat, lon: p.centroide.lon }, match: "ciudad-autonoma", name: p.nombre };
    }
    if (!wanted) return { ok: false, reason: "sin ciudad" };

    const base = { nombre: name, provincia: prov.name, campos: "nombre,centroide" };
    const [exact] = await query("localidades", { ...base, exacto: "true", max: "1" });
    if (exact) return { ok: true, coords: { lat: exact.centroide.lat, lon: exact.centroide.lon }, match: "exacta", name: exact.nombre };

    // Búsqueda aproximada: se acepta solo si el nombre difiere en muy poco (por ejemplo
    // "Amstrong" → "Armstrong"); si no, es otra localidad ("San Fernando" → "San Bernardo").
    const candidates = await query("localidades", { ...base, max: "5" });
    const best = candidates
      .map((c) => ({ c, d: levenshtein(normalize(c.nombre), wanted) }))
      .sort((a, b) => a.d - b.d)[0];
    if (best && best.d <= 2) {
      return { ok: true, coords: { lat: best.c.centroide.lat, lon: best.c.centroide.lon }, match: "aproximada", name: best.c.nombre };
    }
    return { ok: false, reason: `sin coincidencia para "${name}, ${prov.name}"` };
  } catch (error) {
    return { ok: false, reason: `Georef no respondió (${error instanceof Error ? error.message : "error"})` };
  }
}

/** Para las actions: coordenadas o null, registrando el caso si no se pudo. */
export async function coordinatesFor(city: string | null | undefined, province: string | null | undefined) {
  const r = await geocodeLocality(city, province);
  if (!r.ok) {
    console.warn(`[geocode] aviso sin coordenadas: ${r.reason}`);
    return { latitude: null, longitude: null };
  }
  return { latitude: r.coords.lat, longitude: r.coords.lon };
}
