// Imágenes de las tarjetas Aviones / Repuestos / Servicios de la Home (VA-52).
// Uso: node scripts/optimize-cards.mjs  → escribe public/cards/<nombre>.webp (960 px de ancho:
// la tarjeta mide como mucho ~420 px, así alcanza para pantallas 2x). Los originales están en
// assets/originals/ y no se tocan.
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";

const CARDS = {
  "planes.webp": "bkg-aircraft.png", // agrícola al atardecer (elegida por el socio, 9/10)
  "spareparts.webp": "bkg-spareparts.png", // depósito de repuestos (elegida por el socio, 9/10)
  "services.webp": "card-service.png",
};

await mkdir("public/cards", { recursive: true });
for (const [out, source] of Object.entries(CARDS)) {
  const target = `public/cards/${out}`;
  await sharp(`assets/originals/${source}`).resize({ width: 960, withoutEnlargement: true }).webp({ quality: 72 }).toFile(target);
  const [a, b] = await Promise.all([stat(`assets/originals/${source}`), stat(target)]);
  console.log(`${source} (${Math.round(a.size / 1024)} KB) → ${target} (${Math.round(b.size / 1024)} KB)`);
}
