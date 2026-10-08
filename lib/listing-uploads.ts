import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { MAX_LISTING_DOCUMENTS, MAX_LISTING_IMAGES } from "@/lib/listing-schema";
import { DOCUMENT_TYPES, IMAGE_TYPES, MAX_DOC_SIZE, MAX_IMAGE_SIZE, detectFileType } from "@/lib/upload-validation";

// Subida directa del navegador a Supabase Storage (VA-30): el servidor firma una URL
// por archivo y después verifica lo que se subió. Así las fotos no pasan por la
// función de Vercel (límite de 4,5 MB por request).

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const LISTING_BUCKETS = { image: "listings", document: "documents" } as const;
export type UploadKind = keyof typeof LISTING_BUCKETS;
export type ListingType = "aircraft" | "parts";

export interface UploadRequest {
  kind: UploadKind;
  name: string;
  type: string;
  size: number;
}

export interface UploadTarget {
  kind: UploadKind;
  bucket: string;
  path: string;
  token: string;
}

// Carpeta de cada usuario: las rutas que llegan del cliente tienen que estar acá adentro.
function folderFor(kind: UploadKind, listingType: ListingType, userId: string) {
  return kind === "image" ? `${listingType}/${userId}/` : `${userId}/`;
}

function isOwnPath(kind: UploadKind, listingType: ListingType, userId: string, path: string) {
  const folder = folderFor(kind, listingType, userId);
  return path.startsWith(folder) && !path.includes("..") && /^[\w./-]+$/.test(path);
}

export async function createUploadTargets(
  userId: string,
  listingType: ListingType,
  files: UploadRequest[]
): Promise<{ ok: true; targets: UploadTarget[] } | { ok: false; error: string }> {
  const images = files.filter((f) => f.kind === "image");
  const docs = files.filter((f) => f.kind === "document");
  if (images.length > MAX_LISTING_IMAGES) return { ok: false, error: `Podés subir hasta ${MAX_LISTING_IMAGES} imágenes.` };
  if (docs.length > MAX_LISTING_DOCUMENTS) return { ok: false, error: `Podés adjuntar hasta ${MAX_LISTING_DOCUMENTS} documentos.` };

  const targets: UploadTarget[] = [];
  for (const file of files) {
    const allowed = file.kind === "image" ? IMAGE_TYPES : DOCUMENT_TYPES;
    const maxSize = file.kind === "image" ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
    const ext = allowed[file.type];
    if (!ext) {
      return {
        ok: false,
        error: file.kind === "image"
          ? `"${file.name}" no es una imagen JPG, PNG o WebP.`
          : `"${file.name}" no es un PDF, Word o imagen válido.`,
      };
    }
    if (!(file.size > 0) || file.size > maxSize) return { ok: false, error: `"${file.name}" supera los 10 MB.` };

    const bucket = LISTING_BUCKETS[file.kind];
    const path = `${folderFor(file.kind, listingType, userId)}${Date.now()}-${randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("Error al firmar la subida:", error);
      return { ok: false, error: "No se pudo preparar la subida de archivos. Probá de nuevo." };
    }
    targets.push({ kind: file.kind, bucket, path: data.path, token: data.token });
  }
  return { ok: true, targets };
}

// Verifica un archivo ya subido: que sea del usuario, que exista, el tamaño y el tipo
// real por sus primeros bytes (la extensión de la ruta la eligió el servidor al firmar).
async function verifyOne(kind: UploadKind, listingType: ListingType, userId: string, path: string) {
  if (!isOwnPath(kind, listingType, userId, path)) return "Archivo inválido.";

  const bucket = supabase.storage.from(LISTING_BUCKETS[kind]);
  const { data: info, error } = await bucket.info(path);
  if (error || !info) return "Uno de los archivos no se terminó de subir. Probá de nuevo.";

  const maxSize = kind === "image" ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
  if (!info.size || info.size > maxSize) return "Uno de los archivos supera los 10 MB.";

  const { data: signed } = await bucket.createSignedUrl(path, 60);
  if (!signed?.signedUrl) return "No se pudo verificar un archivo.";
  const res = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-15" } });
  if (!res.ok) return "No se pudo verificar un archivo.";
  const bytes = new Uint8Array(await res.arrayBuffer()).slice(0, 16);

  const ext = path.split(".").pop() ?? "";
  const declared = Object.entries(kind === "image" ? IMAGE_TYPES : DOCUMENT_TYPES).find(([, e]) => e === ext)?.[0];
  const detected = detectFileType(bytes, declared);
  if (!detected || detected.ext !== ext) {
    return kind === "image" ? "Una de las fotos no es una imagen JPG, PNG o WebP." : "Uno de los documentos no es válido.";
  }
  return null;
}

/** Verifica todos los archivos subidos y devuelve sus URLs públicas, en el mismo orden. */
export async function verifyUploads(
  userId: string,
  listingType: ListingType,
  images: string[],
  documents: { path: string; name: string }[]
): Promise<{ ok: true; imageUrls: string[]; documents: { name: string; url: string }[] } | { ok: false; error: string }> {
  const checks = await Promise.all([
    ...images.map((p) => verifyOne("image", listingType, userId, p)),
    ...documents.map((d) => verifyOne("document", listingType, userId, d.path)),
  ]);
  const failure = checks.find(Boolean);
  if (failure) return { ok: false, error: failure };

  const publicUrl = (kind: UploadKind, path: string) =>
    supabase.storage.from(LISTING_BUCKETS[kind]).getPublicUrl(path).data.publicUrl;

  return {
    ok: true,
    imageUrls: images.map((p) => publicUrl("image", p)),
    documents: documents.map((d) => ({ name: d.name, url: publicUrl("document", d.path) })),
  };
}

/** Borra archivos subidos (solo dentro de la carpeta del usuario). Nunca lanza. */
export async function removeUploads(
  userId: string,
  listingType: ListingType,
  images: string[],
  documentPaths: string[]
) {
  const own = (kind: UploadKind, paths: string[]) => paths.filter((p) => isOwnPath(kind, listingType, userId, p));
  const jobs: Promise<unknown>[] = [];
  const imgs = own("image", images);
  const docs = own("document", documentPaths);
  if (imgs.length) jobs.push(supabase.storage.from(LISTING_BUCKETS.image).remove(imgs));
  if (docs.length) jobs.push(supabase.storage.from(LISTING_BUCKETS.document).remove(docs));
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === "rejected") console.error("Error al borrar archivos subidos:", r.reason);
  }
}
