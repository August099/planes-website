// Convierte los fondos de página a WebP de 1920 px (VA-56 / VA-62). Los originales están en
// assets/originals/ (fuera de public/, así no se publican con el sitio).
// Uso: node scripts/optimize-backgrounds.mjs  → escribe public/backgrounds/<nombre>.webp
// Los originales no se tocan. Volver a correrlo si se cambia o agrega un fondo.
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";

const ORIGINALS = "assets/originals";

const SOURCES = [
  "bkg-admin.png",
  "bkg-ads.png",
  "bkg-aircraft.png",
  "bkg-banner.png",
  "bkg-cta.png", // sección "Vender" de la Home (VA-62)
  "bkg-faq.png",
  "bkg-forms.png",
  "bkg-home2.png", // hero de la Home, escritorio (VA-62)
  "bkg-home-mobile.png", // hero de la Home, celular (VA-62)
  "bkg-login.jpg",
  "bkg-planes.png",
  "bkg-plans.jpg",
  "bkg-privacidad.jpg",
  "bkg-profile.jpg",
  "bkg-publish.png",
  "bkg-questions.jpg",
  "bkg-register.jpg",
  "bkg-spareparts.png",
];

await mkdir("public/backgrounds", { recursive: true });
let before = 0;
let after = 0;
for (const file of SOURCES) {
  const out = `public/backgrounds/${file.replace(/^bkg-/, "").replace(/\.(png|jpg)$/, ".webp")}`;
  await sharp(`${ORIGINALS}/${file}`).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 70 }).toFile(out);
  const a = (await stat(`${ORIGINALS}/${file}`)).size;
  const b = (await stat(out)).size;
  before += a;
  after += b;
  console.log(`${file.padEnd(22)} ${(a / 1024).toFixed(0).padStart(5)} KB → ${out.padEnd(36)} ${(b / 1024).toFixed(0).padStart(4)} KB`);
}
console.log(`Total: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB`);
