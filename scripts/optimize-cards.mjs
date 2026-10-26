// Imágenes de las tarjetas Aviones / Repuestos / Servicios de la Home (VA-52).
// Uso: node scripts/optimize-cards.mjs  → escribe public/cards/<nombre>.webp (960 px de ancho:
// la tarjeta mide como mucho ~420 px, así alcanza para pantallas 2x). Los originales están en
// assets/originals/ y no se tocan.
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";

const CARDS = {
  // Fotos nuevas del socio (26/10) para las tarjetas del final de la Home.
  "aircraft-home.webp": "aircraft-home.jpg",
  "sparepart-home.webp": "sparepart-home.jpg",
  "services-home.webp": "services-home.jpg",
};

await mkdir("public/cards", { recursive: true });
for (const [out, source] of Object.entries(CARDS)) {
  const target = `public/cards/${out}`;
  await sharp(`assets/originals/${source}`).resize({ width: 960, withoutEnlargement: true }).webp({ quality: 72 }).toFile(target);
  const [a, b] = await Promise.all([stat(`assets/originals/${source}`), stat(target)]);
  console.log(`${source} (${Math.round(a.size / 1024)} KB) → ${target} (${Math.round(b.size / 1024)} KB)`);
}
