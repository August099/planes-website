"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { RECOMMENDATIONS_TAG } from "@/lib/recommendations";
import {
  acknowledgeNotice,
  ownerNotice,
  pauseListing,
  requestReview,
  resolveReview,
  type ModeratedKind,
  type ModerationResult,
  type OwnerNotice,
} from "@/lib/moderation";

// VA-154: acciones de moderación (admin) y del dueño de un aviso moderado.

function parseKind(kind: unknown): ModeratedKind | null {
  return kind === "AIRCRAFT" || kind === "SPARE_PART" ? kind : null;
}

function refreshListing(kind: ModeratedKind, id: string) {
  revalidatePath(kind === "AIRCRAFT" ? "/aircraft" : "/spareparts");
  revalidatePath(kind === "AIRCRAFT" ? `/aircraft/${id}` : `/spareparts/sparepart-details/${id}`);
  revalidatePath("/profile/[id]", "page");
  revalidatePath("/admin/report");
  revalidatePath("/"); // VA-76: la Home es estática
  updateTag(RECOMMENDATIONS_TAG); // VA-88
}

export async function pauseListingAction(input: { kind: string; id: string; reason: string; reportId?: string | null }): Promise<ModerationResult> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  const kind = parseKind(input.kind);
  if (!kind || !input.id) return { ok: false, error: "Aviso inválido." };
  const res = await pauseListing({ kind, id: String(input.id), reason: String(input.reason ?? ""), adminId: admin.id, reportId: input.reportId ?? null });
  if (res.ok) refreshListing(kind, input.id);
  return res;
}

export async function resolveReviewAction(input: { kind: string; id: string; decision: string; message?: string }): Promise<ModerationResult> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  const kind = parseKind(input.kind);
  if (!kind || !input.id) return { ok: false, error: "Aviso inválido." };
  if (input.decision !== "REACTIVATE" && input.decision !== "KEEP_PAUSED") return { ok: false, error: "Decisión inválida." };
  const res = await resolveReview({ kind, id: String(input.id), adminId: admin.id, decision: input.decision, message: input.message ?? null });
  if (res.ok) refreshListing(kind, input.id);
  return res;
}

export async function requestReviewAction(input: { kind: string; id: string; message?: string }): Promise<ModerationResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  const kind = parseKind(input.kind);
  if (!kind || !input.id) return { ok: false, error: "Aviso inválido." };
  const res = await requestReview({ kind, id: String(input.id), userId: user.id, message: input.message ?? null });
  if (res.ok) {
    revalidatePath("/profile/[id]", "page");
    revalidatePath("/admin/report");
  }
  return res;
}

/** Ventana flotante del dueño (la pide el navegador en cada carga; null si no hay nada). */
export async function getModerationNoticeAction(): Promise<OwnerNotice | null> {
  const user = await getCurrentUser();
  if (!user?.id) return null;
  return ownerNotice(user.id);
}

export async function acknowledgeModerationNoticeAction(actionId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) return;
  await acknowledgeNotice(user.id, String(actionId ?? ""));
}
