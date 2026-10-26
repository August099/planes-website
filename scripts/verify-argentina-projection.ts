// VA-129: comprueba que projectToMap (lib/argentina-map.ts) da lo mismo que d3-geo, la librería con
// la que se dibujó el mapa. Uso: npx tsx scripts/verify-argentina-projection.ts
import { geoTransverseMercator } from "d3-geo";
import { ARGENTINA_PROJECTION } from "../components/ui/argentina-map/paths";
import { projectToMap } from "../lib/argentina-map";

const d3 = geoTransverseMercator().rotate(ARGENTINA_PROJECTION.rotate).scale(ARGENTINA_PROJECTION.scale).translate(ARGENTINA_PROJECTION.translate);
const points: [string, number, number][] = [
  ["CABA", -58.38, -34.6],
  ["Córdoba", -64.18, -31.42],
  ["Ushuaia", -68.3, -54.8],
  ["La Quiaca", -65.59, -22.1],
  ["Posadas", -55.9, -27.37],
  ["Mendoza", -68.84, -32.89],
];
let worst = 0;
for (const [name, lon, lat] of points) {
  const [dx, dy] = d3([lon, lat])!;
  const m = projectToMap(lon, lat);
  const err = Math.hypot(dx - m.x, dy - m.y);
  worst = Math.max(worst, err);
  console.log(`${name.padEnd(10)} d3 (${dx.toFixed(2)}, ${dy.toFixed(2)})  propia (${m.x.toFixed(2)}, ${m.y.toFixed(2)})  diferencia ${err.toFixed(4)} px`);
}
if (worst > 0.01) {
  console.error(`La proyección propia difiere de d3 en ${worst.toFixed(3)} px`);
  process.exit(1);
}
console.log("OK: misma proyección que d3");
