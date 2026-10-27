// 27/10 (socio): la foto de perfil se ve cuadrada (perfil, página personalizada, avisos), así que al subirla
// se recorta en el navegador un cuadrado centrado del lado más corto y se lleva a 600 px. Así no quedan fotos
// angostas con bandas y el archivo sale liviano (límite de 4,5 MB por request en Vercel).
const SIZE = 600;

export async function cropSquare(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin canvas");
  // Fondo blanco por si la imagen tiene transparencia (logos en PNG) y se guarda como JPG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out, out);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("No se pudo recortar la imagen");
  return new File([blob], "avatar.jpg", { type: "image/jpeg", lastModified: Date.now() });
}
