// Imágenes de "Explorá por tipo de aeronave" (27/10, renders nuevos del socio en assets/originals/aircraft-types).
// Uso: node scripts/process-aircraft-types.mjs → public/aircraft-types/<tipo>.webp (y .png).
// Cada render tiene una o dos aeronaves sobre un fondo celeste liso con sombra del mismo tono. El fondo se
// reconoce por el matiz (celeste: más azul que rojo), no por el brillo, así el blanco y los grises del avión
// quedan. Se separan las aeronaves por piezas conectadas (no cortando al medio, porque las alas y los rotores
// se cruzan de mitad), se suaviza el borde, se recorta al contorno y se lleva a 500 px de ancho con transparencia.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "assets/originals/aircraft-types";
const OUT = "public/aircraft-types";
const WIDTH = 500;

// [archivo, lado ("left" | "right" | "full"), tipo]
const JOBS = [
  ["Avioneta Blanca Tricolor en Estudio.png", "full", "experimental-lsa"],
  ["Aviones gemelos con franjas rojas y azules.png", "left", "bimotor"],
  ["Aviones gemelos con franjas rojas y azules.png", "right", "otros"],
  ["Aviones de aviación ligera y experimental.png", "left", "monomotor"],
  ["Aviones de aviación ligera y experimental.png", "right", "proyecto"],
  ["Avión fumigador y helicóptero bicolor.png", "left", "agricola"],
  ["Avión fumigador y helicóptero bicolor.png", "right", "helicoptero"],
];

/** Etiqueta piezas conectadas (4 vecinos) de los píxeles marcados. Devuelve etiquetas y datos de cada pieza. */
function components(mask, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  const parts = [];
  const stack = [];
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || label[start] !== -1) continue;
    const id = parts.length;
    const part = { area: 0, sumX: 0, border: false };
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const k = stack.pop();
      const x = k % w, y = (k - x) / w;
      part.area++;
      part.sumX += x;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) part.border = true;
      for (const n of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
        if (n >= 0 && mask[n] && label[n] === -1) {
          label[n] = id;
          stack.push(n);
        }
      }
    }
    parts.push(part);
  }
  return { label, parts };
}

const cache = new Map();
/** Máscara de aeronaves de un render completo (1 = aeronave), con sus piezas. */
async function aircraftMask(file) {
  if (cache.has(file)) return cache.get(file);
  const { data, info } = await sharp(`${SRC}/${file}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // Celeste del fondo y su sombra: claramente más azul que rojo y no oscuro. Los grises del avión son neutros y
  // la franja azul es oscura.
  const bgLike = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) {
    const r = data[k * 3], g = data[k * 3 + 1], b = data[k * 3 + 2];
    bgLike[k] = b - r >= 20 && g - r >= 8 && b >= 150 ? 1 : 0;
  }
  // Fondo = piezas celestes que tocan el borde o son grandes (huecos entre rotor, mástil y cola).
  const bg = components(bgLike, w, h);
  const fg = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) {
    const id = bg.label[k];
    fg[k] = id >= 0 && (bg.parts[id].border || bg.parts[id].area > 150) ? 0 : 1;
  }
  const result = { data, w, h, fg, ...components(fg, w, h) };
  cache.set(file, result);
  return result;
}

await mkdir(OUT, { recursive: true });
for (const [file, side, name] of JOBS) {
  const { data, w, h, fg, label, parts } = await aircraftMask(file);
  // Piezas de esta aeronave: las de más de 40 px cuyo centro cae de su lado.
  const keep = parts.map((p) => {
    if (p.area < 40) return false;
    const cx = p.sumX / p.area;
    return side === "full" || (side === "left" ? cx < w / 2 : cx >= w / 2);
  });
  const alpha = Buffer.alloc(w * h);
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let k = 0; k < w * h; k++) {
    if (!fg[k] || !keep[label[k]]) continue;
    alpha[k] = 255;
    const x = k % w, y = (k - x) / w;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  // Borde suavizado para que no quede serruchado.
  const softAlpha = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let k = 0; k < w * h; k++) {
    rgba[k * 4] = data[k * 3];
    rgba[k * 4 + 1] = data[k * 3 + 1];
    rgba[k * 4 + 2] = data[k * 3 + 2];
    rgba[k * 4 + 3] = softAlpha[k];
  }
  const pad = 4;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const cut = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize({ width: WIDTH })
    .png()
    .toBuffer();
  await sharp(cut).webp({ quality: 85, alphaQuality: 90 }).toFile(`${OUT}/${name}.webp`);
  await sharp(cut).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}.png`);
  const m = await sharp(cut).metadata();
  console.log(name, `${m.width}x${m.height}`);
}
