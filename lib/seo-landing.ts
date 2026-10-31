import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { PROVINCES, provinceBySlug } from "@/lib/provinces";

// 31/10 (socio): que el sitio aparezca en los buscadores por cada aspecto ("aviones agrícolas en venta",
// "Cessna en venta", "repuestos en Córdoba"...). Un listado con UN solo filtro (tipo, marca o provincia en
// aviones; categoría o provincia en repuestos) es una página propia: título, descripción y canonical a esa
// URL, y entra al sitemap. Con más de un filtro (o filtros de rango, orden, etc.) sigue apuntando al listado
// general, como antes, para no llenar el índice de combinaciones.

export type Landing = { path: string; title: string; description: string; heading: string };

type Params = Record<string, string | string[] | undefined>;

/** El único filtro del listado ({ clave, valor }) o null si hay varios, ninguno o uno con varios valores. */
function singleFilter(params: Params, allowed: string[]): { key: string; value: string } | null {
  const keys = Object.keys(params).filter((k) => k !== "page" && params[k] !== undefined && params[k] !== "");
  if (keys.length !== 1 || !allowed.includes(keys[0])) return null;
  const value = params[keys[0]];
  if (typeof value !== "string" || !value || value.includes(",")) return null;
  return { key: keys[0], value };
}

// Nombre del tipo para el título: helicópteros y agrícolas en plural; el resto, el nombre de la categoría.
function aircraftTypeTitle(name: string): string {
  const n = name.toLowerCase();
  if (n.startsWith("helic")) return "Helicópteros";
  if (n.startsWith("agr")) return "Aviones agrícolas";
  return name;
}

export const aircraftLanding = cache(async (params: Params): Promise<Landing | null> => {
  const f = singleFilter(params, ["category", "brand", "province"]);
  if (!f) return null;
  const path = `/aircraft?${f.key}=${encodeURIComponent(f.value)}`;
  if (f.key === "category") {
    const c = await prisma.aircraftCategory.findUnique({ where: { id: f.value }, select: { name: true } });
    if (!c) return null;
    const what = aircraftTypeTitle(c.name);
    return {
      path,
      heading: what,
      title: `${what} en venta en Argentina`,
      description: `${what} en venta en Argentina: compará precios, año, horas y estado, y contactá directo con el vendedor en Ventas Aeronáuticas.`,
    };
  }
  if (f.key === "brand") {
    const b = await prisma.aircraftBrand.findUnique({ where: { id: f.value }, select: { name: true } });
    if (!b) return null;
    return {
      path,
      heading: `Aviones ${b.name}`,
      title: `${b.name} en venta en Argentina`,
      description: `Aviones ${b.name} en venta en Argentina: modelos, años, horas y precios. Contactá directo con el vendedor en Ventas Aeronáuticas.`,
    };
  }
  const p = provinceBySlug(f.value);
  if (!p) return null;
  return {
    path,
    heading: `Aviones en ${p.name}`,
    title: `Aviones en venta en ${p.name}`,
    description: `Aviones, helicópteros y aeronaves agrícolas en venta en ${p.name}. Precios, horas y contacto directo con el vendedor.`,
  };
});

export const sparePartLanding = cache(async (params: Params): Promise<Landing | null> => {
  const f = singleFilter(params, ["category", "province"]);
  if (!f) return null;
  const path = `/spareparts?${f.key}=${encodeURIComponent(f.value)}`;
  if (f.key === "category") {
    const c = await prisma.category.findUnique({ where: { id: f.value }, select: { name: true } });
    if (!c) return null;
    return {
      path,
      heading: c.name,
      title: `${c.name}: repuestos aeronáuticos en venta`,
      description: `${c.name} para aviones y helicópteros en venta en Argentina. Buscá por número de parte, estado y precio, y contactá directo con el vendedor.`,
    };
  }
  const p = provinceBySlug(f.value);
  if (!p) return null;
  return {
    path,
    heading: `Repuestos en ${p.name}`,
    title: `Repuestos aeronáuticos en venta en ${p.name}`,
    description: `Repuestos, motores, hélices, aviónica y accesorios aeronáuticos en venta en ${p.name}. Contactá directo con el vendedor.`,
  };
});

/** Páginas por tipo, marca, categoría y provincia que tienen al menos un aviso activo (para el sitemap). */
export async function landingPaths(): Promise<string[]> {
  const where = activeListingWhere();
  const [aCats, aBrands, aProv, pCats, pProv] = await Promise.all([
    prisma.aircraft.groupBy({ by: ["categoryId"], where, _count: { _all: true } }),
    prisma.aircraft.groupBy({ by: ["brandId"], where, _count: { _all: true } }),
    prisma.aircraft.groupBy({ by: ["province"], where, _count: { _all: true } }),
    prisma.sparePart.groupBy({ by: ["categoryId"], where, _count: { _all: true } }),
    prisma.sparePart.groupBy({ by: ["province"], where, _count: { _all: true } }),
  ]);
  const slug = (name: string | null) => PROVINCES.find((p) => p.name === name)?.slug;
  // Las categorías de repuestos también suman a su categoría madre (el listado la incluye).
  const parents = await prisma.category.findMany({ where: { id: { in: pCats.map((c) => c.categoryId) } }, select: { parentId: true } });
  const partCategoryIds = new Set([...pCats.map((c) => c.categoryId), ...parents.map((p) => p.parentId).filter((id): id is string => !!id)]);
  return [
    ...aCats.map((c) => `/aircraft?category=${encodeURIComponent(c.categoryId)}`),
    ...aBrands.filter((b) => b.brandId).map((b) => `/aircraft?brand=${encodeURIComponent(b.brandId!)}`),
    ...aProv.map((p) => slug(p.province)).filter(Boolean).map((s) => `/aircraft?province=${s}`),
    ...[...partCategoryIds].map((id) => `/spareparts?category=${encodeURIComponent(id)}`),
    ...pProv.map((p) => slug(p.province)).filter(Boolean).map((s) => `/spareparts?province=${s}`),
  ];
}
