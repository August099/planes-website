// Provincias canónicas (VA-77). La provincia de avisos y perfiles se guarda siempre con uno de
// estos 24 nombres oficiales, así se puede contar y filtrar por igualdad exacta.
// El código es el ISO 3166-2:AR; el slug se usa en las URLs (?province=santa-fe) y en el mapa.

export type Province = { name: string; slug: string; code: string };

export const PROVINCES: readonly Province[] = [
  { name: "Buenos Aires", slug: "buenos-aires", code: "AR-B" },
  { name: "Ciudad Autónoma de Buenos Aires", slug: "caba", code: "AR-C" },
  { name: "Catamarca", slug: "catamarca", code: "AR-K" },
  { name: "Chaco", slug: "chaco", code: "AR-H" },
  { name: "Chubut", slug: "chubut", code: "AR-U" },
  { name: "Córdoba", slug: "cordoba", code: "AR-X" },
  { name: "Corrientes", slug: "corrientes", code: "AR-W" },
  { name: "Entre Ríos", slug: "entre-rios", code: "AR-E" },
  { name: "Formosa", slug: "formosa", code: "AR-P" },
  { name: "Jujuy", slug: "jujuy", code: "AR-Y" },
  { name: "La Pampa", slug: "la-pampa", code: "AR-L" },
  { name: "La Rioja", slug: "la-rioja", code: "AR-F" },
  { name: "Mendoza", slug: "mendoza", code: "AR-M" },
  { name: "Misiones", slug: "misiones", code: "AR-N" },
  { name: "Neuquén", slug: "neuquen", code: "AR-Q" },
  { name: "Río Negro", slug: "rio-negro", code: "AR-R" },
  { name: "Salta", slug: "salta", code: "AR-A" },
  { name: "San Juan", slug: "san-juan", code: "AR-J" },
  { name: "San Luis", slug: "san-luis", code: "AR-D" },
  { name: "Santa Cruz", slug: "santa-cruz", code: "AR-Z" },
  { name: "Santa Fe", slug: "santa-fe", code: "AR-S" },
  { name: "Santiago del Estero", slug: "santiago-del-estero", code: "AR-G" },
  { name: "Tierra del Fuego, Antártida e Islas del Atlántico Sur", slug: "tierra-del-fuego", code: "AR-V" },
  { name: "Tucumán", slug: "tucuman", code: "AR-T" },
];

export const PROVINCE_NAMES: readonly string[] = PROVINCES.map((p) => p.name);

// Nombre corto para listas y selects (el oficial de Tierra del Fuego es muy largo).
export function provinceShortName(name: string): string {
  if (name === "Tierra del Fuego, Antártida e Islas del Atlántico Sur") return "Tierra del Fuego";
  if (name === "Ciudad Autónoma de Buenos Aires") return "CABA";
  return name;
}

// Minúsculas, sin tildes y sin nada que no sea letra o número: "Bs. As." → "bsas".
function key(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const ALIASES: Record<string, string> = {
  // Buenos Aires
  bsas: "Buenos Aires",
  bs: "Buenos Aires",
  pba: "Buenos Aires",
  gba: "Buenos Aires",
  buenosairesprovincia: "Buenos Aires",
  // CABA
  caba: "Ciudad Autónoma de Buenos Aires",
  capital: "Ciudad Autónoma de Buenos Aires",
  capitalfederal: "Ciudad Autónoma de Buenos Aires",
  ciudaddebuenosaires: "Ciudad Autónoma de Buenos Aires",
  ciudadautonomadebuenosaires: "Ciudad Autónoma de Buenos Aires",
  ciudadautonomadebsas: "Ciudad Autónoma de Buenos Aires",
  ciudaddebsas: "Ciudad Autónoma de Buenos Aires",
  cdadautonomadebuenosaires: "Ciudad Autónoma de Buenos Aires",
  cabsas: "Ciudad Autónoma de Buenos Aires",
  // Tierra del Fuego
  tierradelfuego: "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
  tdf: "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
  tierradelfuegoantartidaeislasdelatlanticosur: "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
  // Santiago del Estero
  sgodelestero: "Santiago del Estero",
  stgodelestero: "Santiago del Estero",
  santiago: "Santiago del Estero",
  sde: "Santiago del Estero",
  // Otras abreviaturas habituales
  ctes: "Corrientes",
  bsasprovincia: "Buenos Aires",
  stafe: "Santa Fe",
  sfe: "Santa Fe",
  stacruz: "Santa Cruz",
  sjuan: "San Juan",
  sluis: "San Luis",
  cba: "Córdoba",
  cordobacapital: "Córdoba",
  mza: "Mendoza",
  tuc: "Tucumán",
  nqn: "Neuquén",
};

// Prefijos y sufijos que se ignoran: "Provincia de Córdoba", "Pcia. de Bs. As.", "Mendoza, Argentina".
const PREFIXES = ["provinciade", "provincia", "pciade", "pcia", "provde", "prov"];
const SUFFIXES = ["argentina", "provincia"];

const BY_KEY = new Map<string, string>();
for (const p of PROVINCES) {
  BY_KEY.set(key(p.name), p.name);
  BY_KEY.set(key(p.slug), p.name);
}
for (const [alias, name] of Object.entries(ALIASES)) BY_KEY.set(alias, name);

/** Nombre canónico de la provincia, o null si no se reconoce. */
export function normalizeProvince(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const k = key(input);
  if (!k) return null;

  const candidates = new Set<string>([k]);
  for (const s of SUFFIXES) if (k.endsWith(s) && k.length > s.length) candidates.add(k.slice(0, -s.length));
  for (const c of [...candidates]) {
    for (const p of PREFIXES) if (c.startsWith(p) && c.length > p.length) candidates.add(c.slice(p.length));
  }
  for (const c of candidates) {
    const found = BY_KEY.get(c);
    if (found) return found;
  }
  return null;
}

export function provinceBySlug(slug: string | null | undefined): Province | null {
  if (!slug) return null;
  return PROVINCES.find((p) => p.slug === slug) ?? null;
}

export function provinceByName(name: string | null | undefined): Province | null {
  if (!name) return null;
  return PROVINCES.find((p) => p.name === name) ?? null;
}
