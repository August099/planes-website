import "server-only";

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_LISTING_IMAGES = 15;
export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB

export interface DetectedFile {
  contentType: string;
  ext: string;
}

// El MIME y el nombre los manda el navegador y se pueden falsificar: el tipo se
// detecta por los primeros bytes del archivo y la extensión sale de ese tipo.
async function sniff(file: File): Promise<DetectedFile | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));

  if (startsWith(0xff, 0xd8, 0xff)) return { contentType: "image/jpeg", ext: "jpg" };
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { contentType: "image/png", ext: "png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { contentType: "image/webp", ext: "webp" };
  if (ascii(0, 5) === "%PDF-") return { contentType: "application/pdf", ext: "pdf" };
  // .doc (formato OLE2 de Office)
  if (startsWith(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) {
    return { contentType: "application/msword", ext: "doc" };
  }
  // .docx es un ZIP: se acepta solo si el navegador también lo declaró como docx.
  if (
    startsWith(0x50, 0x4b, 0x03, 0x04) &&
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return { contentType: file.type, ext: "docx" };
  }
  return null;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Valida una imagen (JPG, PNG o WebP, máx. 10 MB). Devuelve el tipo real o un error. */
export async function validateImage(
  file: File
): Promise<{ ok: true; file: DetectedFile } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: "La imagen está vacía." };
  if (file.size > MAX_IMAGE_SIZE) {
    return { ok: false, error: `"${file.name}" supera los 10 MB.` };
  }
  const detected = await sniff(file);
  if (!detected || !IMAGE_TYPES.includes(detected.contentType)) {
    return { ok: false, error: `"${file.name}" no es una imagen JPG, PNG o WebP.` };
  }
  return { ok: true, file: detected };
}

/** Valida un documento (PDF, DOC, DOCX o imagen, máx. 10 MB). */
export async function validateDocument(
  file: File
): Promise<{ ok: true; file: DetectedFile } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: "El documento está vacío." };
  if (file.size > MAX_DOC_SIZE) {
    return { ok: false, error: `"${file.name}" supera los 10 MB.` };
  }
  const detected = await sniff(file);
  if (!detected) {
    return { ok: false, error: `"${file.name}" no es un PDF, Word o imagen válido.` };
  }
  return { ok: true, file: detected };
}
