"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AIRCRAFT_TAXONOMY_TAG } from "@/lib/cached-data";
import { mergeEntry, renameEntry, setHidden, type TaxonomyKind } from "@/lib/taxonomy-admin";

// VA-190: revisión de las marcas y modelos que cargaron los usuarios (/admin/taxonomy).

async function run(fn: () => Promise<{ ok: true; moved?: number } | { ok: false; error: string }>) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return { ok: false as const, error: "No autorizado." };
  try {
    const res = await fn();
    if (res.ok) {
      updateTag(AIRCRAFT_TAXONOMY_TAG);
      revalidatePath("/admin/taxonomy");
      revalidatePath("/aircraft");
    }
    return res;
  } catch (error) {
    console.error("[taxonomía] error:", error);
    return { ok: false as const, error: "No se pudo guardar. Probá de nuevo." };
  }
}

const kindOf = (k: unknown): TaxonomyKind => (k === "model" ? "model" : "brand");

export async function renameUserTaxonomyAction(kind: TaxonomyKind, id: string, name: string) {
  return run(() => renameEntry(kindOf(kind), String(id), String(name ?? "")));
}

export async function setUserTaxonomyHiddenAction(kind: TaxonomyKind, id: string, hidden: boolean) {
  return run(() => setHidden(kindOf(kind), String(id), !!hidden));
}

export async function mergeUserTaxonomyAction(kind: TaxonomyKind, fromId: string, intoId: string) {
  return run(() => mergeEntry(kindOf(kind), String(fromId), String(intoId)));
}
