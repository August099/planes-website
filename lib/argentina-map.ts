import { ARGENTINA_PROJECTION, PROVINCE_PATHS } from "@/components/ui/argentina-map/paths";

// VA-129: ubica un punto (longitud, latitud) en el SVG de la Argentina de la Home (VA-77), con la
// misma Transversa de Mercator con la que se dibujó (scripts/build-argentina-map.ts usa d3-geo).
// Es la fórmula de d3 (geoTransverseMercator().rotate([64, 0])) escrita a mano para no sumar la
// librería a la web; scripts/verify-argentina-projection.ts la compara contra d3.
const RAD = Math.PI / 180;

export function projectToMap(lon: number, lat: number): { x: number; y: number } {
  const { rotate, scale, translate } = ARGENTINA_PROJECTION;
  const lambda = (lon + rotate[0]) * RAD;
  const phi = lat * RAD;
  const x = Math.cos(lambda) * Math.cos(phi);
  const y = Math.sin(lambda) * Math.cos(phi);
  const z = Math.sin(phi);
  // Rotación de d3 con δφ = 0 y δγ = 90° (la que agrega la Transversa de Mercator).
  const rl = Math.atan2(-z, x);
  const rp = Math.asin(y);
  const rawX = Math.log(Math.tan((Math.PI / 2 + rp) / 2));
  const rawY = -rl;
  return { x: translate[0] + scale * rawX, y: translate[1] - scale * rawY };
}

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

/** Caja que ocupa una provincia en el SVG (los paths son M/L/Z con coordenadas absolutas). */
export function provinceBBox(slug: string): BBox | null {
  const d = PROVINCE_PATHS[slug];
  if (!d) return null;
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const box: BBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (let i = 0; i + 1 < nums.length; i += 2) {
    box.minX = Math.min(box.minX, nums[i]);
    box.maxX = Math.max(box.maxX, nums[i]);
    box.minY = Math.min(box.minY, nums[i + 1]);
    box.maxY = Math.max(box.maxY, nums[i + 1]);
  }
  return Number.isFinite(box.minX) ? box : null;
}
