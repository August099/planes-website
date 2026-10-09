// Genera components/ui/argentina-map/paths.ts (VA-77): un path SVG por provincia, listo para la
// Home, sin librerías de mapas en el cliente. Se corre una sola vez (o si cambia el diseño):
//
//   npx tsx scripts/build-argentina-map.ts <ruta a ne_10m_admin_1_states_provinces.geojson>
//
// Fuente: Natural Earth admin-1 1:10m (dominio público),
// https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_1_states_provinces.geojson
// - Las 24 jurisdicciones se identifican por su código ISO 3166-2 (lib/provinces.ts).
// - Natural Earth pone a las Islas Malvinas como otro país (FLK): acá se suman a Tierra del Fuego
//   (mismo slug, se pintan juntas). La Antártida no va.
// - Topología compartida + simplificación (los bordes vecinos quedan iguales) y coordenadas con
//   1 decimal, para que el archivo pese menos de 60 KB.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { geoPath, geoTransverseMercator } from "d3-geo";
import { topology } from "topojson-server";
import { presimplify, simplify, quantile } from "topojson-simplify";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { PROVINCES } from "../lib/provinces";

const input = process.argv[2];
if (!input) {
  console.error("Uso: npx tsx scripts/build-argentina-map.ts <ne_10m_admin_1_states_provinces.geojson>");
  process.exit(1);
}

const OUT_DIR = "components/ui/argentina-map";
const WIDTH = 320;
const PADDING = 6;
// Fracción de vértices que se conservan (más alto = más detalle y más peso).
const KEEP = Number(process.env.MAP_KEEP ?? 0.15);

type Props = { adm0_a3: string; iso_3166_2: string; name: string };
const source = JSON.parse(readFileSync(input, "utf8")) as FeatureCollection<Geometry, Props>;

const slugByCode = new Map(PROVINCES.map((p) => [p.code, p.slug]));
const features: Feature<Polygon | MultiPolygon, { slug: string }>[] = [];

for (const f of source.features) {
  const { adm0_a3, iso_3166_2 } = f.properties;
  let slug: string | undefined;
  if (adm0_a3 === "ARG") slug = slugByCode.get(iso_3166_2);
  else if (adm0_a3 === "FLK") slug = "tierra-del-fuego"; // Islas Malvinas
  if (!slug) continue;
  if (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon") continue;
  features.push({ type: "Feature", properties: { slug }, geometry: f.geometry });
}

const missing = PROVINCES.filter((p) => !features.some((f) => f.properties.slug === p.slug));
if (missing.length > 0) {
  console.error("Faltan provincias en la fuente:", missing.map((p) => p.name).join(", "));
  process.exit(1);
}

// Topología compartida y simplificación.
const collection: FeatureCollection<Polygon | MultiPolygon, { slug: string }> = { type: "FeatureCollection", features };
let topo = topology({ provinces: collection } as Parameters<typeof topology>[0], 1e5) as unknown as Topology<{
  provinces: GeometryCollection<{ slug: string }>;
}>;
topo = presimplify(topo) as typeof topo;
topo = simplify(topo, quantile(topo, KEEP)) as typeof topo;
const simplified = feature(topo, topo.objects.provinces) as FeatureCollection<Polygon | MultiPolygon, { slug: string }>;

// Transversa de Mercator centrada en el meridiano 64° O (como el sistema Gauss-Krüger argentino):
// el país se ve derecho y sin el estiramiento del sur que tiene la Mercator común.
const projection = geoTransverseMercator().rotate([64, 0]);
projection.fitWidth(WIDTH - PADDING * 2, simplified);
projection.translate([projection.translate()[0] + PADDING, projection.translate()[1] + PADDING]);

const path = geoPath(projection).digits(1);
const [, [, maxY]] = path.bounds(simplified);
const height = Math.ceil(maxY + PADDING);

const paths: Record<string, string> = {};
for (const f of simplified.features) {
  const d = path(f);
  if (!d) continue;
  paths[f.properties.slug] = (paths[f.properties.slug] ?? "") + d;
}

// Ubicación del círculo de CABA (demasiado chica para tocarla en el mapa).
const caba = simplified.features.find((f) => f.properties.slug === "caba")!;
const [cx, cy] = path.centroid(caba).map((n) => Math.round(n * 10) / 10);

const ordered = PROVINCES.map((p) => `  ${JSON.stringify(p.slug)}: ${JSON.stringify(paths[p.slug])},`).join("\n");
const out = `// Generado por scripts/build-argentina-map.ts a partir de Natural Earth admin-1 1:10m (dominio
// público). No editar a mano: volver a correr el script. Tierra del Fuego incluye las Islas Malvinas.
export const ARGENTINA_VIEWBOX = "0 0 ${WIDTH} ${height}";

export const PROVINCE_PATHS: Record<string, string> = {
${ordered}
};

// Centro de CABA, para el círculo clickeable.
export const CABA_MARKER = { cx: ${cx}, cy: ${cy} };
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/paths.ts`, out);
console.log(`${OUT_DIR}/paths.ts · ${(Buffer.byteLength(out) / 1024).toFixed(1)} KB · viewBox 0 0 ${WIDTH} ${height} · KEEP=${KEEP}`);
