// Recorta los íconos del menú de Servicios de assets/originals/services-menu/iconos-servicios.webp y los guarda
// como máscaras (alfa = trazo, sin color), para que tomen el color del texto del panel con CSS.
// Correr con: node scripts/process-service-icons.mjs
import sharp from "sharp";

const SOURCE = "assets/originals/services-menu/iconos-servicios.webp";
const OUT = "public/icons/services";
const SIZE = 144;
// Columnas de cada ícono en el original, en orden.
const ICONS = [
  ["flight-plan", 72, 411],
  ["guides", 529, 817],
  ["calculators", 957, 1221],
  ["compare", 1339, 1722],
];

const { data: gray, info } = await sharp(SOURCE).greyscale().raw().toBuffer({ resolveWithObject: true });

for (const [name, x0, x1] of ICONS) {
  let top = info.height;
  let bottom = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = x0; x <= x1; x++) {
      if (gray[y * info.width + x] < 128) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  const width = x1 - x0 + 1;
  const height = bottom - top + 1;
  const alpha = await sharp(SOURCE)
    .extract({ left: x0, top, width, height })
    .greyscale()
    .negate({ alpha: false })
    .normalise()
    .extractChannel(0)
    .raw()
    .toBuffer();
  const mask = await sharp({ create: { width, height, channels: 3, background: "#000" } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
  await sharp(mask)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 90 })
    .toFile(`${OUT}/${name}.webp`);
  console.log(name, `${width}x${height}`);
}
