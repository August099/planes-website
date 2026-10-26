import "server-only";
export { MAX_LISTING_IMAGES } from "@/lib/listing-schema";

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB

export interface DetectedFile {
  contentType: string;
  ext: string;
}

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const DOCUMENT_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  "application/pdf": "pdf",
  "application/msword": "doc",
  [DOCX]: "docx",
};

// El MIME y el nombre los manda el navegador y se pueden falsificar: el tipo se
// detecta por los primeros bytes del archivo y la extensión sale de ese tipo.
// "declaredType" solo desempata el caso del .docx, que por dentro es un ZIP.
export function detectFileType(bytes: Uint8Array, declaredType?: string): DetectedFile | null {
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
  if (startsWith(0x50, 0x4b, 0x03, 0x04) && declaredType === DOCX) {
    return { contentType: DOCX, ext: "docx" };
  }
  return null;
}

async function sniff(file: File): Promise<DetectedFile | null> {
  return detectFileType(new Uint8Array(await file.slice(0, 12).arrayBuffer()), file.type);
}

/** Valida una imagen (JPG, PNG o WebP, máx. 10 MB). Devuelve el tipo real o un error. */
export async function validateImage(
  file: File
): Promise<{ ok: true; file: DetectedFile } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: "La imagen está vacía." };
  if (file.size > MAX_IMAGE_SIZE) {
    return { ok: false, error: `"${file.name}" supera los 10 MB.` };
  }
  const detected = await sniff(file);
  if (!detected || !IMAGE_TYPES[detected.contentType]) {
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
