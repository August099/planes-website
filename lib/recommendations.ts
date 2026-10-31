import "server-only";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { getAircraftTaxonomy, getSparePartCategories } from "@/lib/cached-data";
import { categoryDef } from "@/lib/aircraft-categories";

// VA-88: recomendaciones al pie de los detalles. Una función por tipo de aviso, todas armadas con
// la misma cascada (`cascade`): cada nivel es un criterio menos preciso que el anterior y solo se
// consulta si los anteriores no llegaron al máximo. Reglas comunes (docs/specs/VA-88):
// - solo avisos visibles (activos y no vencidos) y nunca el aviso actual;
// - como máximo 2 avisos del mismo vendedor por bloque;
// - el título dice el criterio que de verdad se usó (depende del nivel más profundo al que se llegó);
// - con menos de 2 resultados, el bloque no se muestra (devuelve null).
// Para hangares (VA-84, pendiente) alcanza con sumar niveles por radio (50 → 150 → 400 km →
// provincia → país) que usen `cascade` y las coordenadas de los avisos (VA-83, Parte 0).

export const RECOMMENDATIONS_TAG = "recommendations";
const REVALIDATE = 600; // ~10 minutos
// Versión de la lógica: va en la clave de la caché, así un cambio de criterios o títulos no
// sirve resultados viejos (la caché de datos sobrevive a los builds y deploys).
const VERSION = "v2";
const MAX_ITEMS = 8;
const MIN_ITEMS = 2;
const PER_SELLER = 2;

// --------------------------------------------------------------------------- Cascada genérica

type Candidate = { id: string; sellerId: string };

/** Un nivel recibe los ids ya elegidos (para excluirlos) y devuelve candidatos ordenados. */
export type CascadeLevel<T extends Candidate, K extends string> = {
  key: K;
  fetch: (excludeIds: string[]) => Promise<T[]>;
};

export async function cascade<T extends Candidate, K extends string>(
  currentId: string,
  levels: CascadeLevel<T, K>[],
  { max = MAX_ITEMS, perSeller = PER_SELLER } = {}
): Promise<{ items: T[]; levels: K[] }> {
  const items: T[] = [];
  const used: K[] = [];
  const perSellerCount = new Map<string, number>();
  for (const level of levels) {
    if (items.length >= max) break;
    const candidates = await level.fetch([currentId, ...items.map((i) => i.id)]);
    let added = false;
    for (const c of candidates) {
      if (items.length >= max) break;
      if (c.id === currentId || items.some((i) => i.id === c.id)) continue;
      const n = perSellerCount.get(c.sellerId) ?? 0;
      if (n >= perSeller) continue;
      perSellerCount.set(c.sellerId, n + 1);
      items.push(c);
      added = true;
    }
    if (added) used.push(level.key);
  }
  return { items, levels: used };
}

// --------------------------------------------------------------------------- Texto

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
/** Para comparar nombres de modelos: "CESSNA C-150" y "Cessna C 150" → "cessnac150". */
const compact = (s: string) => normalize(s).replace(/[^a-z0-9]/g, "");

// Palabras que no sirven para relacionar repuestos (aparecen en casi todos los títulos).
const STOPWORDS = new Set(
  "de del la las el los un una unos unas y o con sin para por en a al se su sus es nuevo nueva usado usada original lote repuesto repuestos aeronautico aeronautica aeronauticos avion aviones aeronave aeronaves kit juego unidad venta vendo pieza piezas parte partes".split(
    " "
  )
);

/** Palabras clave de un repuesto (título y P/N): "magneto", "slick", "o-320"… */
export function partKeywords(title: string, partNumber?: string | null): string[] {
  const words = normalize(`${title} ${partNumber ?? ""}`)
    .split(/[^a-z0-9-]+/)
    .map((w) => w.replace(/^-+|-+$/g, ""))
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d{1,2}$/.test(w));
  return [...new Set(words)].slice(0, 8);
}

// --------------------------------------------------------------------------- Datos de tarjetas

const AIRCRAFT_CARD_SELECT = {
  id: true,
  sellerId: true,
  title: true,
  price: true,
  year: true,
  totalTimeHours: true,
  city: true,
  province: true,
  categoryId: true,
  brandId: true,
  modelId: true,
  createdAt: true,
  category: { select: { id: true, name: true } },
  images: { orderBy: { order: "asc" as const }, take: 5, select: { id: true, aircraftId: true, order: true, url: true } },
} satisfies Prisma.AircraftSelect;

const SPARE_PART_CARD_SELECT = {
  id: true,
  sellerId: true,
  title: true,
  price: true,
  inPesos: true,
  city: true,
  province: true,
  brand: true,
  createdAt: true,
  category: { select: { name: true } },
  images: { orderBy: { order: "asc" as const }, take: 1, select: { url: true } },
} satisfies Prisma.SparePartSelect;

type AircraftRow = Prisma.AircraftGetPayload<{ select: typeof AIRCRAFT_CARD_SELECT }>;
type SparePartRow = Prisma.SparePartGetPayload<{ select: typeof SPARE_PART_CARD_SELECT }>;

// Lo que llega a las tarjetas: datos planos (unstable_cache guarda JSON; sin Decimal ni Date).
export type AircraftRec = {
  id: string;
  sellerId: string;
  title: string;
  price: number | null;
  year: number;
  totalTimeHours: number | null;
  city: string | null;
  province: string | null;
  category: { id: string; name: string };
  images: { id: string; aircraftId: string; order: number; url: string }[];
};
export type SparePartRec = {
  id: string;
  sellerId: string;
  title: string;
  price: number | null;
  inPesos: boolean;
  city: string | null;
  province: string | null;
  category: { name: string };
  imageUrl: string | null;
};

const toAircraftRec = (a: AircraftRow): AircraftRec => ({
  id: a.id,
  sellerId: a.sellerId,
  title: a.title,
  price: a.price == null ? null : Number(a.price),
  year: a.year,
  totalTimeHours: a.totalTimeHours,
  city: a.city,
  province: a.province,
  category: a.category,
  images: a.images,
});
const toSparePartRec = (s: SparePartRow): SparePartRec => ({
  id: s.id,
  sellerId: s.sellerId,
  title: s.title,
  price: s.price == null ? null : Number(s.price),
  inPesos: s.inPesos,
  city: s.city,
  province: s.province,
  category: s.category,
  imageUrl: s.images[0]?.url ?? null,
});

export type RecommendationBlock<T> = { title: string; subtitle?: string; items: T[] };

// El bloque se cachea ~10 minutos; pausas, ediciones y bajas invalidan el tag al momento (VA-152: los
// avisos no vencen). Con menos de 2 avisos, el bloque no se muestra.
function stillVisible<T>(block: RecommendationBlock<T> | null) {
  return block && block.items.length >= MIN_ITEMS ? block : null;
}

const CANDIDATES = 60; // por nivel; después se ordena por puntaje en memoria

// --------------------------------------------------------------------------- 1. Aeronave

// Categorías vecinas (nivel 3 de la cascada): las que alguien que mira una también consideraría.
const NEIGHBOR_CATEGORIES: Record<string, string[]> = {
  MP: ["E", "MT"],
  MT: ["MP", "BT"],
  BP: ["BT", "MP"],
  BT: ["BP", "MT"],
  A: ["MP"],
  E: ["MP", "PR"],
  PR: ["E", "MP"],
  H: [],
  "S/C": [],
};

type AircraftSource = {
  id: string;
  categoryId: string;
  brandId: string | null;
  modelId: string | null;
  price: unknown;
  year: number;
  province: string | null;
};

/** Puntaje de similitud (VA-88). La categoría no suma: es el filtro de los niveles 1 y 2. */
function aircraftScore(src: AircraftSource, a: AircraftRow): number {
  let score = 0;
  if (src.modelId && a.modelId === src.modelId) score += 4;
  if (src.brandId && a.brandId === src.brandId) score += 2;
  // Los avisos de aeronaves son todos en dólares: el precio se compara directo.
  const p = src.price != null ? Number(src.price) : 0;
  const q = a.price != null ? Number(a.price) : 0;
  if (p > 0 && q > 0 && Math.abs(q - p) <= p * 0.3) score += 2;
  if (Math.abs(a.year - src.year) <= 10) score += 1;
  if (a.province === src.province) score += 0.5;
  return score;
}
const GOOD_SCORE = 2; // nivel 1: además de la categoría, al menos marca, o precio, o año + provincia…

type AircraftLevel = "score" | "category" | "neighbors" | "recent";

async function computeSimilarAircraft(src: AircraftSource) {
  const byScore = (rows: AircraftRow[]) =>
    rows
      .map((r) => ({ r, s: aircraftScore(src, r) }))
      .sort((x, y) => y.s - x.s || y.r.createdAt.getTime() - x.r.createdAt.getTime());
  const find = (where: Prisma.AircraftWhereInput, excludeIds: string[]) =>
    prisma.aircraft.findMany({
      where: { ...activeListingWhere(), ...where, id: { notIn: excludeIds } },
      select: AIRCRAFT_CARD_SELECT,
      orderBy: { createdAt: "desc" },
      take: CANDIDATES,
    });
  const neighbors = NEIGHBOR_CATEGORIES[src.categoryId] ?? [];

  const levels: CascadeLevel<AircraftRow, AircraftLevel>[] = [
    {
      key: "score",
      fetch: async (ex) => byScore(await find({ categoryId: src.categoryId }, ex)).filter((x) => x.s >= GOOD_SCORE).map((x) => x.r),
    },
    { key: "category", fetch: async (ex) => byScore(await find({ categoryId: src.categoryId }, ex)).map((x) => x.r) },
    {
      key: "neighbors",
      fetch: async (ex) => (neighbors.length ? byScore(await find({ categoryId: { in: neighbors } }, ex)).map((x) => x.r) : []),
    },
    { key: "recent", fetch: (ex) => find({}, ex) },
  ];
  const { items, levels: used } = await cascade(src.id, levels);
  if (items.length < MIN_ITEMS) return null;

  const group = categoryDef(src.categoryId)?.group;
  // El título nombra solo los criterios que aportaron avisos: "similares" exige la misma categoría.
  const parts = [
    used.some((l) => l === "score" || l === "category") && "similares",
    used.includes("neighbors") && "de categorías cercanas",
    used.includes("recent") && "publicadas recientemente",
  ].filter(Boolean) as string[];
  const title = `Aeronaves ${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : parts[0]}`;
  const hasSame = used.some((l) => l === "score" || l === "category");
  const steps = [
    hasSame && `las de la misma categoría${group ? ` (${group})` : ""}`,
    used.includes("neighbors") && "las de categorías parecidas",
    used.includes("recent") && "las más recientes del sitio",
  ].filter(Boolean) as string[];
  const subtitle = !hasSame
    ? `Todavía no hay otras de la misma categoría${group ? ` (${group})` : ""}`
    : steps.length === 1
      ? "Con marca, modelo, precio o año parecidos primero"
      : `Primero ${steps.join(", después ")}`;
  return { title, subtitle, items: items.map(toAircraftRec) } satisfies RecommendationBlock<AircraftRec>;
}

/** "Aeronaves similares" del detalle de aeronave (unifica el "Comparar con similares" de VA-83). */
export function getSimilarAircraft(src: AircraftSource) {
  return unstable_cache(() => computeSimilarAircraft(src), ["rec-aircraft-similar", VERSION, src.id], {
    tags: [RECOMMENDATIONS_TAG],
    revalidate: REVALIDATE,
  })().then(stillVisible);
}

// Repuestos que declaran servir para una aeronave. `aircrafts` guarda textos "Marca Modelo" (los del
// formulario) y también textos libres viejos, así que se compara sin mayúsculas, espacios ni guiones.
async function sparePartIdsForAircraft(target: string, mode: "exact" | "prefix"): Promise<string[]> {
  const key = compact(target);
  if (key.length < 2) return [];
  const pattern = mode === "exact" ? key : `${key}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT s.id FROM "SparePart" s
    WHERE EXISTS (
      SELECT 1 FROM unnest(s.aircrafts) AS a
      WHERE regexp_replace(lower(a), '[^a-z0-9]', '', 'g') LIKE ${pattern}
    )
    LIMIT 200`;
  return rows.map((r) => r.id);
}

type PartsForAircraftLevel = "model" | "brand";

async function computePartsForAircraft(src: { id: string; brandName: string | null; modelName: string | null }) {
  if (!src.brandName) return null;
  const find = async (ids: string[], excludeIds: string[]) =>
    ids.length === 0
      ? []
      : prisma.sparePart.findMany({
          where: { ...activeListingWhere(), id: { in: ids, notIn: excludeIds } },
          select: SPARE_PART_CARD_SELECT,
          orderBy: { createdAt: "desc" },
          take: CANDIDATES,
        });
  const modelLabel = src.modelName ? `${src.brandName} ${src.modelName}` : null;
  const levels: CascadeLevel<SparePartRow, PartsForAircraftLevel>[] = [
    { key: "model", fetch: async (ex) => (modelLabel ? find(await sparePartIdsForAircraft(modelLabel, "exact"), ex) : []) },
    { key: "brand", fetch: async (ex) => find(await sparePartIdsForAircraft(src.brandName!, "prefix"), ex) },
  ];
  // El repuesto nunca es el aviso actual (son tipos distintos): se pasa un id que no existe.
  const { items, levels: used } = await cascade("", levels);
  if (items.length < MIN_ITEMS) return null;
  const title = used.includes("brand") || !modelLabel ? `Repuestos para ${src.brandName}` : `Repuestos para ${modelLabel}`;
  return {
    title,
    subtitle: "Según las aeronaves que indicó cada vendedor",
    items: items.map(toSparePartRec),
  } satisfies RecommendationBlock<SparePartRec>;
}

/** "Repuestos para <Marca Modelo>" (extra del detalle de aeronave). */
export function getPartsForAircraft(src: { id: string; brandName: string | null; modelName: string | null }) {
  return unstable_cache(() => computePartsForAircraft(src), ["rec-aircraft-parts", VERSION, src.id], {
    tags: [RECOMMENDATIONS_TAG],
    revalidate: REVALIDATE,
  })().then(stillVisible);
}

// --------------------------------------------------------------------------- 2. Repuesto

type SparePartSource = {
  id: string;
  title: string;
  partNumber: string | null;
  description: string;
  categoryId: string;
  brand: string | null;
  aircrafts: string[];
};

type SimilarPartsLevel = "leaf" | "subcategory" | "root" | "keywords";

async function computeSimilarParts(src: SparePartSource) {
  const categories = await getSparePartCategories();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const descendants = (id: string): string[] => {
    const out = [id];
    for (let i = 0; i < out.length; i++) for (const c of categories) if (c.parentId === out[i]) out.push(c.id);
    return out;
  };
  // Camino desde la raíz: [principal, subcategoría, subcategoría específica?]
  const path: string[] = [];
  for (let c = byId.get(src.categoryId); c; c = c.parentId ? byId.get(c.parentId) : undefined) path.unshift(c.id);
  const root = path[0];
  const sub = path[1];
  const leaf = path.length >= 3 ? path[path.length - 1] : null;

  // Dentro de una categoría: primero los de la misma marca del repuesto, después los más nuevos.
  const sameBrandFirst = (rows: SparePartRow[]) =>
    src.brand ? [...rows].sort((a, b) => Number(b.brand === src.brand) - Number(a.brand === src.brand)) : rows;
  const find = (where: Prisma.SparePartWhereInput, excludeIds: string[]) =>
    prisma.sparePart.findMany({
      where: { ...activeListingWhere(), ...where, id: { notIn: excludeIds } },
      select: SPARE_PART_CARD_SELECT,
      orderBy: { createdAt: "desc" },
      take: CANDIDATES,
    });

  const keywords = partKeywords(src.title, src.partNumber);
  const levels: CascadeLevel<SparePartRow, SimilarPartsLevel>[] = [
    { key: "leaf", fetch: async (ex) => (leaf ? sameBrandFirst(await find({ categoryId: leaf }, ex)) : []) },
    { key: "subcategory", fetch: async (ex) => (sub ? sameBrandFirst(await find({ categoryId: { in: descendants(sub) } }, ex)) : []) },
    { key: "root", fetch: async (ex) => (root ? sameBrandFirst(await find({ categoryId: { in: descendants(root) } }, ex)) : []) },
    {
      key: "keywords",
      fetch: async (ex) => {
        if (keywords.length === 0) return [];
        const rows = await find(
          {
            OR: keywords.flatMap((k) => [
              { title: { contains: k, mode: "insensitive" as const } },
              { partNumber: { contains: k, mode: "insensitive" as const } },
            ]),
          },
          ex
        );
        // Más palabras en común, primero.
        const hits = (r: SparePartRow) => keywords.filter((k) => normalize(r.title).includes(k)).length;
        return [...rows].sort((a, b) => hits(b) - hits(a));
      },
    },
  ];
  const { items, levels: used } = await cascade(src.id, levels);
  if (items.length < MIN_ITEMS) return null;

  const deepest = used[used.length - 1];
  const rootName = root ? byId.get(root)?.name : undefined;
  const subName = sub ? byId.get(sub)?.name : undefined;
  const title =
    deepest === "keywords"
      ? used.length === 1
        ? "Repuestos relacionados"
        : "Repuestos similares y relacionados"
      : deepest === "root" && rootName
        ? `Más repuestos de la categoría ${rootName}`
        : "Repuestos similares";
  const subtitle =
    deepest === "keywords"
      ? `Por categoría y por palabras del título o el P/N (${keywords.slice(0, 3).join(", ")})`
      : deepest === "root"
        ? undefined
        : subName
          ? `Misma categoría: ${subName}`
          : undefined;
  return { title, subtitle, items: items.map(toSparePartRec) } satisfies RecommendationBlock<SparePartRec>;
}

/** Bloque A del detalle de repuesto: "Repuestos similares" (y variantes según el nivel). */
export function getSimilarParts(src: SparePartSource) {
  return unstable_cache(() => computeSimilarParts(src), ["rec-part-similar", VERSION, src.id], {
    tags: [RECOMMENDATIONS_TAG],
    revalidate: REVALIDATE,
  })().then(stillVisible);
}

type Taxonomy = Awaited<ReturnType<typeof getAircraftTaxonomy>>;
type ModelRef = { brandId: string; brandName: string; modelId: string; modelName: string };

/** "Cessna 150" → marca y modelo de la taxonomía, si coinciden (sin mayúsculas, espacios ni guiones). */
function resolveAircraftLabel(label: string, taxonomy: Taxonomy): { brand?: { id: string; name: string }; model?: ModelRef } {
  const key = compact(label);
  // La marca más larga que sea prefijo (para no confundir "Aero" con "Aero Boero").
  const brand = [...taxonomy.brands]
    .filter((b) => compact(b.name).length >= 3 && key.startsWith(compact(b.name)))
    .sort((a, b) => compact(b.name).length - compact(a.name).length)[0];
  if (!brand) return {};
  const rest = key.slice(compact(brand.name).length);
  const model = rest ? brand.models.find((m) => compact(m.name) === rest) : undefined;
  return {
    brand: { id: brand.id, name: brand.name },
    model: model ? { brandId: brand.id, brandName: brand.name, modelId: model.id, modelName: model.name } : undefined,
  };
}

/** Marcas de aeronave mencionadas en un texto (palabra completa). */
function brandsMentioned(text: string, taxonomy: Taxonomy) {
  const haystack = ` ${normalize(text).replace(/[^a-z0-9]+/g, " ")} `;
  return taxonomy.brands.filter((b) => {
    const name = normalize(b.name).replace(/[^a-z0-9]+/g, " ").trim();
    return name.length >= 3 && haystack.includes(` ${name} `);
  });
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : names.length === 2 ? `${names[0]} y ${names[1]}` : `${names.slice(0, 2).join(", ")} y otras`;

async function computeAircraftForPart(src: SparePartSource) {
  const taxonomy = await getAircraftTaxonomy();
  const find = (where: Prisma.AircraftWhereInput) =>
    prisma.aircraft.findMany({
      where: { ...activeListingWhere(), ...where },
      select: AIRCRAFT_CARD_SELECT,
      orderBy: { createdAt: "desc" },
      take: CANDIDATES,
    });
  const pick = async (rows: AircraftRow[]) => (await cascade("", [{ key: "all", fetch: async () => rows }])).items;

  // 1) Aeronaves que indicó el vendedor: primero ese modelo; si no hay avisos, esa marca.
  const resolved = src.aircrafts.map((a) => resolveAircraftLabel(a, taxonomy));
  const models = [...new Map(resolved.flatMap((r) => (r.model ? [[r.model.modelId, r.model] as const] : []))).values()];
  const brands = [...new Map(resolved.flatMap((r) => (r.brand ? [[r.brand.id, r.brand] as const] : []))).values()];
  if (models.length > 0) {
    const items = await pick(await find({ modelId: { in: models.map((m) => m.modelId) } }));
    if (items.length >= MIN_ITEMS)
      return {
        // Solo los modelos que tienen avisos (el vendedor pudo indicar otros sin publicaciones).
        title: `Aeronaves ${joinNames(models.filter((m) => items.some((i) => i.modelId === m.modelId)).map((m) => `${m.brandName} ${m.modelName}`))} en venta`,
        subtitle: "Los modelos para los que el vendedor indicó este repuesto",
        items: items.map(toAircraftRec),
      } satisfies RecommendationBlock<AircraftRec>;
  }
  if (brands.length > 0) {
    const items = await pick(await find({ brandId: { in: brands.map((b) => b.id) } }));
    if (items.length >= MIN_ITEMS)
      return {
        title: `Aeronaves ${joinNames(brands.filter((b) => items.some((i) => i.brandId === b.id)).map((b) => b.name))} en venta`,
        subtitle: "La marca para la que el vendedor indicó este repuesto",
        items: items.map(toAircraftRec),
      } satisfies RecommendationBlock<AircraftRec>;
    return null;
  }
  if (src.aircrafts.length > 0) return null;

  // 2) Sin aeronave indicada: una marca de la base que aparezca en el título o la descripción.
  const mentioned = brandsMentioned(`${src.title} ${src.description}`, taxonomy);
  if (mentioned.length === 0) return null;
  const items = await pick(await find({ brandId: { in: mentioned.map((b) => b.id) } }));
  if (items.length < MIN_ITEMS) return null;
  return {
    title: `Aeronaves ${joinNames(mentioned.filter((b) => items.some((i) => i.brandId === b.id)).map((b) => b.name))} en venta`,
    subtitle: "La marca que menciona el aviso",
    items: items.map(toAircraftRec),
  } satisfies RecommendationBlock<AircraftRec>;
}

/** Bloque B del detalle de repuesto: aeronaves del modelo o la marca asociados (o mencionados). */
export function getAircraftForPart(src: SparePartSource) {
  return unstable_cache(() => computeAircraftForPart(src), ["rec-part-aircraft", VERSION, src.id], {
    tags: [RECOMMENDATIONS_TAG],
    revalidate: REVALIDATE,
  })().then(stillVisible);
}

// --------------------------------------------------------------------------- VA-170. Más del vendedor

/**
 * "Más de [Broker]": sus otros avisos activos (aviones y repuestos), antes de las recomendaciones
 * generales. Mismo tag de caché que el resto de las recomendaciones.
 */
export function getMoreFromSeller(sellerId: string, excludeId: string, sellerName: string) {
  return unstable_cache(
    async () => {
      const [aircraft, parts] = await Promise.all([
        prisma.aircraft.findMany({ where: { ...activeListingWhere(), sellerId, id: { not: excludeId } }, select: AIRCRAFT_CARD_SELECT, orderBy: { lastPublishedAt: "desc" }, take: 8 }),
        prisma.sparePart.findMany({ where: { ...activeListingWhere(), sellerId, id: { not: excludeId } }, select: SPARE_PART_CARD_SELECT, orderBy: { lastPublishedAt: "desc" }, take: 8 }),
      ]);
      const title = `Más de ${sellerName}`;
      return {
        aircraft: aircraft.length ? { title, items: aircraft.map(toAircraftRec) } : null,
        parts: parts.length ? { title: aircraft.length ? `Repuestos de ${sellerName}` : title, items: parts.map(toSparePartRec) } : null,
      };
    },
    ["more-from-seller", sellerId, excludeId],
    { tags: [RECOMMENDATIONS_TAG], revalidate: 600 }
  )();
}
