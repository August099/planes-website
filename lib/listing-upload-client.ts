"use client";

import { discardListingUploads, prepareListingUploads } from "@/app/publish/actions";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// Sube las fotos y documentos de una publicación directo a Supabase Storage (VA-30).
// Si algo falla, borra lo que ya se había subido y devuelve un error claro.

type ListingType = "aircraft" | "parts";

export interface UploadProgress {
  done: number;
  total: number;
}

export type UploadResult =
  | { ok: true; images: string[]; documents: { path: string; name: string }[] }
  | { ok: false; error: string };

const CONCURRENCY = 3;

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

export async function uploadListingFiles(
  listingType: ListingType,
  images: File[],
  documents: File[],
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const files = [
    ...images.map((file) => ({ kind: "image" as const, file })),
    ...documents.map((file) => ({ kind: "document" as const, file })),
  ];

  const prepared = await prepareListingUploads({
    listingType,
    files: files.map(({ kind, file }) => ({ kind, name: file.name, type: file.type, size: file.size })),
  });
  if (!prepared.ok) return { ok: false, error: prepared.error };

  const supabase = getBrowserSupabase();
  const uploaded: { kind: "image" | "document"; path: string }[] = [];
  let done = 0;
  onProgress?.({ done, total: files.length });

  const results = await runWithConcurrency(
    prepared.targets.map((target, i) => async () => {
      const { file } = files[i];
      try {
        const { error } = await supabase.storage
          .from(target.bucket)
          .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type });
        if (error) throw error;
        uploaded.push({ kind: target.kind, path: target.path });
        onProgress?.({ done: ++done, total: files.length });
        return null;
      } catch (err) {
        console.error("Error al subir", file.name, err);
        return file.name;
      }
    }),
    CONCURRENCY
  );

  const failed = results.filter((name): name is string => !!name);
  if (failed.length > 0) {
    await discardListingUploads({
      listingType,
      images: uploaded.filter((u) => u.kind === "image").map((u) => u.path),
      documents: uploaded.filter((u) => u.kind === "document").map((u) => u.path),
    }).catch(() => {});
    return {
      ok: false,
      error: `${failed.length === 1 ? `No se pudo subir "${failed[0]}"` : `No se pudieron subir ${failed.length} archivos`}. Revisá tu conexión y probá de nuevo.`,
    };
  }

  return {
    ok: true,
    images: prepared.targets.filter((t) => t.kind === "image").map((t) => t.path),
    documents: prepared.targets
      .map((t, i) => ({ t, name: files[i].file.name }))
      .filter(({ t }) => t.kind === "document")
      .map(({ t, name }) => ({ path: t.path, name })),
  };
}

/** Borra archivos ya subidos (por ejemplo, si después falla createListing por la red). */
export async function discardUploaded(
  listingType: ListingType,
  images: string[],
  documents: { path: string }[]
) {
  await discardListingUploads({ listingType, images, documents: documents.map((d) => d.path) }).catch(() => {});
}
