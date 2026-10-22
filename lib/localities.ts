// Localidades de Argentina para el autocompletado del formulario de publicación.
// Fuente: /public/argentina_localities.json, formato [{ code: "BSA", name: "25 de Mayo" }, ...].
// `code` es un código de provincia de 3 letras (24 en total).

export type Locality = { code: string; name: string };
export type IndexedLocality = Locality & { key: string };

export const PROVINCE_LABELS: Record<string, string> = {
  BSA: "Buenos Aires",
  CAB: "CABA",
  CAT: "Catamarca",
  CHA: "Chaco",
  CHU: "Chubut",
  COR: "Córdoba",
  CRR: "Corrientes",
  ENT: "Entre Ríos",
  FOR: "Formosa",
  JUJ: "Jujuy",
  PAM: "La Pampa",
  RIO: "La Rioja",
  MEN: "Mendoza",
  MIS: "Misiones",
  NEU: "Neuquén",
  RNE: "Río Negro",
  SAL: "Salta",
  SJU: "San Juan",
  SLU: "San Luis",
  SCR: "Santa Cruz",
  SFE: "Santa Fe",
  SDE: "Santiago del Estero",
  TDF: "Tierra del Fuego",
  TUC: "Tucumán",
};

/** Minúsculas, sin tildes y con espacios normalizados: "Córdoba " -> "cordoba". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// [fragmento normalizado, código]. El orden importa: CABA va antes que "buenos aires".
const PROVINCE_RULES: Array<[string, string]> = [
  ["caba", "CAB"],
  ["capital federal", "CAB"],
  ["ciudad autonoma", "CAB"],
  ["ciudad de buenos aires", "CAB"],
  ["buenos aires", "BSA"],
  ["catamarca", "CAT"],
  ["chaco", "CHA"],
  ["chubut", "CHU"],
  ["cordoba", "COR"],
  ["corrientes", "CRR"],
  ["entre rios", "ENT"],
  ["formosa", "FOR"],
  ["jujuy", "JUJ"],
  ["la pampa", "PAM"],
  ["la rioja", "RIO"],
  ["mendoza", "MEN"],
  ["misiones", "MIS"],
  ["neuquen", "NEU"],
  ["rio negro", "RNE"],
  ["salta", "SAL"],
  ["san juan", "SJU"],
  ["san luis", "SLU"],
  ["santa cruz", "SCR"],
  ["santa fe", "SFE"],
  ["santiago del estero", "SDE"],
  ["tierra del fuego", "TDF"],
  ["tucuman", "TUC"],
];

/** Código de provincia a partir del nombre que guarda el formulario (tolera tildes y variantes). */
export function provinceCode(name?: string | null): string | null {
  if (!name) return null;
  const n = normalize(name);
  if (!n) return null;
  for (const [fragment, code] of PROVINCE_RULES) {
    if (n === fragment || n.includes(fragment)) return code;
  }
  return null;
}

let cache: Promise<IndexedLocality[]> | null = null;

/** Descarga el JSON una sola vez (el navegador lo cachea) y lo indexa sin duplicados. */
export function loadLocalities(): Promise<IndexedLocality[]> {
  if (!cache) {
    cache = fetch("/argentina_localities.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Locality[]>;
      })
      .then((list) => {
        const seen = new Set<string>();
        const out: IndexedLocality[] = [];
        for (const l of list) {
          const key = normalize(l.name);
          const id = `${l.code}|${key}`;
          if (!key || seen.has(id)) continue;
          seen.add(id);
          out.push({ ...l, key });
        }
        return out;
      })
      .catch((err) => {
        cache = null; // permite reintentar
        throw err;
      });
  }
  return cache;
}

/** Primero las que empiezan con lo escrito, después las que lo contienen. Si hay provincia, solo de esa. */
export function searchLocalities(
  all: IndexedLocality[],
  query: string,
  code: string | null,
  limit = 8
): IndexedLocality[] {
  const q = normalize(query);
  if (!q) return [];
  const starts: IndexedLocality[] = [];
  const contains: IndexedLocality[] = [];
  for (const l of all) {
    if (code && l.code !== code) continue;
    if (l.key.startsWith(q)) starts.push(l);
    else if (l.key.includes(q)) contains.push(l);
  }
  return [...starts, ...contains].slice(0, limit);
}

/**
 * true si `city` es una localidad conocida pero ninguna de ellas está en `province`.
 * Sirve para limpiar la ciudad al cambiar de provincia sin borrar textos libres ni ciudades válidas.
 */
export async function cityConflictsWithProvince(city: string, province: string): Promise<boolean> {
  const code = provinceCode(province);
  const key = normalize(city);
  if (!code || !key) return false;
  try {
    const matches = (await loadLocalities()).filter((l) => l.key === key);
    return matches.length > 0 && !matches.some((l) => l.code === code);
  } catch {
    return false;
  }
}
