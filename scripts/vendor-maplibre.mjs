// VA-156: copia MapLibre GL JS a public/vendor/maplibre-gl-<versión>/ para cargarlo como módulo nativo
// recién cuando el mapa del detalle entra en pantalla (no suma al JS de ninguna página). Desde ahí,
// MapLibre encuentra solo su worker y el módulo compartido (los resuelve relativos a su propia URL).
// Corre antes de `next build` y de `next dev` (package.json); la carpeta no se commitea (.gitignore).
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "maplibre-gl");
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const out = join(root, "public", "vendor", `maplibre-gl-${version}`);
const files = ["maplibre-gl.mjs", "maplibre-gl-shared.mjs", "maplibre-gl-worker.mjs", "maplibre-gl.css"];

mkdirSync(out, { recursive: true });
for (const f of files) copyFileSync(join(pkgDir, "dist", f), join(out, f));
const expected = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).dependencies["maplibre-gl"];
if (expected !== version) {
  console.error(`maplibre-gl instalado ${version} ≠ package.json ${expected}: correr npm install.`);
  process.exit(1);
}
console.log(`MapLibre ${version} copiado a public/vendor/maplibre-gl-${version}/ (${files.length} archivos)`);
