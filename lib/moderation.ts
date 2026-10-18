import "server-only";
import type { ListingKind, ModerationActionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockAndCheckRoom } from "@/lib/quota";
import { sendModerationEmail } from "@/lib/mail";
import { appUrl } from "@/lib/mercadopago";

// VA-154: pausa indefinida de un aviso reportado. El admin lo pausa con un motivo (estado MODERATED:
// no se ve en ningún lado y no cuenta en el cupo); el dueño no puede reactivarlo, pero puede editarlo
// y pedir revisión; el admin lo reactiva (activo si hay cupo, si no pausado común) o lo mantiene
// pausado con un mensaje. Todo queda en ModerationAction (historial) y el dueño se entera por mail y
// por una ventana en su próxima visita (una vez por acción, hasta que la cierre).

export type ModeratedKind = Extract<ListingKind, "AIRCRAFT" | "SPARE_PART">;
type Listing = { id: string; title: string; status: string; sellerId: string };

async function findListing(kind: ModeratedKind, id: string): Promise<Listing | null> {
  const select = { id: true, title: true, status: true, sellerId: true } as const;
  return kind === "AIRCRAFT" ? prisma.aircraft.findUnique({ where: { id }, select }) : prisma.sparePart.findUnique({ where: { id }, select });
}

export function listingHref(kind: ModeratedKind, id: string) {
  return kind === "AIRCRAFT" ? `/aircraft/${id}` : `/spareparts/sparepart-details/${id}`;
}

export function editHref(kind: ModeratedKind, id: string) {
  return `/publish?edit=${id}&type=${kind === "AIRCRAFT" ? "aircraft" : "parts"}`;
}

/** Última acción de moderación de un aviso (null si nunca se moderó). */
export async function lastAction(kind: ModeratedKind, id: string) {
  return prisma.moderationAction.findFirst({ where: { listingKind: kind, listingId: id }, orderBy: { createdAt: "desc" } });
}

async function notify(actionId: string, ownerId: string, listingTitle: string, kind: "PAUSE" | "REACTIVATE" | "KEEP_PAUSED", message: string | null, reactivatedAs?: "ACTIVE" | "PAUSED") {
  try {
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { email: true, name: true } });
    if (!owner?.email) return;
    await sendModerationEmail({ to: owner.email, name: owner.name, listingTitle, kind, message, reactivatedAs, profileUrl: `${appUrl()}/profile/${ownerId}` });
    await prisma.moderationAction.update({ where: { id: actionId }, data: { emailSentAt: new Date() } });
  } catch (error) {
    console.error("[moderación] no se pudo mandar el mail:", error);
  }
}

export type ModerationResult = { ok: true } | { ok: false; error: string };

/** "Pausar indefinidamente" desde el admin (motivo obligatorio). Marca el reporte como revisado. */
export async function pauseListing(input: { kind: ModeratedKind; id: string; reason: string; adminId: string; reportId?: string | null }): Promise<ModerationResult> {
  const reason = input.reason.trim();
  if (reason.length < 5) return { ok: false, error: "Escribí el motivo (se le muestra al dueño)." };
  if (reason.length > 1000) return { ok: false, error: "El motivo puede tener hasta 1000 caracteres." };
  const listing = await findListing(input.kind, input.id);
  if (!listing) return { ok: false, error: "El aviso no existe." };
  if (listing.status === "MODERATED") return { ok: false, error: "El aviso ya está pausado por moderación." };

  const action = await prisma.$transaction(async (tx) => {
    if (input.kind === "AIRCRAFT") await tx.aircraft.update({ where: { id: input.id }, data: { status: "MODERATED" } });
    else await tx.sparePart.update({ where: { id: input.id }, data: { status: "MODERATED" } });
    if (input.reportId) await tx.report.updateMany({ where: { id: input.reportId }, data: { status: "REVIEWED" } });
    return tx.moderationAction.create({
      data: { listingKind: input.kind, listingId: input.id, action: "PAUSE", message: reason, ownerId: listing.sellerId, adminId: input.adminId, reportId: input.reportId ?? null },
      select: { id: true },
    });
  });
  await notify(action.id, listing.sellerId, listing.title, "PAUSE", reason);
  return { ok: true };
}

/** El dueño pide revisión (después de editarlo). Una sola pendiente por aviso. */
export async function requestReview(input: { kind: ModeratedKind; id: string; userId: string; message?: string | null }): Promise<ModerationResult> {
  const listing = await findListing(input.kind, input.id);
  if (!listing || listing.sellerId !== input.userId) return { ok: false, error: "El aviso no existe." };
  if (listing.status !== "MODERATED") return { ok: false, error: "Este aviso no está pausado por moderación." };
  const last = await lastAction(input.kind, input.id);
  if (last?.action === "REVIEW_REQUESTED") return { ok: false, error: "Ya pediste la revisión: te avisamos cuando la veamos." };
  await prisma.moderationAction.create({
    data: { listingKind: input.kind, listingId: input.id, action: "REVIEW_REQUESTED", message: input.message?.trim().slice(0, 1000) || null, ownerId: input.userId },
  });
  return { ok: true };
}

/** El admin responde una revisión: reactivar (activo si hay cupo) o mantener pausado con un mensaje. */
export async function resolveReview(input: { kind: ModeratedKind; id: string; adminId: string; decision: "REACTIVATE" | "KEEP_PAUSED"; message?: string | null }): Promise<ModerationResult> {
  const message = input.message?.trim() || null;
  if (input.decision === "KEEP_PAUSED" && (!message || message.length < 5)) return { ok: false, error: "Escribí el mensaje para el dueño." };
  const listing = await findListing(input.kind, input.id);
  if (!listing) return { ok: false, error: "El aviso no existe." };
  if (listing.status !== "MODERATED") return { ok: false, error: "El aviso ya no está pausado por moderación." };

  const result = await prisma.$transaction(async (tx) => {
    let to: "ACTIVE" | "PAUSED" | null = null;
    if (input.decision === "REACTIVATE") {
      to = (await lockAndCheckRoom(tx, listing.sellerId, input.kind)) ? "ACTIVE" : "PAUSED";
      const data = { status: to };
      if (input.kind === "AIRCRAFT") await tx.aircraft.update({ where: { id: input.id }, data });
      else await tx.sparePart.update({ where: { id: input.id }, data });
    }
    const action = await tx.moderationAction.create({
      data: { listingKind: input.kind, listingId: input.id, action: input.decision, message, ownerId: listing.sellerId, adminId: input.adminId },
      select: { id: true },
    });
    return { actionId: action.id, to };
  });
  await notify(result.actionId, listing.sellerId, listing.title, input.decision, message, result.to ?? undefined);
  return { ok: true };
}

// --------------------------------------------------------------------------- Lecturas

const ADMIN_ACTIONS: ModerationActionType[] = ["PAUSE", "REACTIVATE", "KEEP_PAUSED"];

export type OwnerNotice = {
  actionId: string;
  action: "PAUSE" | "REACTIVATE" | "KEEP_PAUSED";
  message: string | null;
  listingTitle: string;
  listingStatus: string;
  editHref: string;
  listingHref: string;
};

/** Ventana del dueño: la acción del admin más reciente que todavía no cerró. */
export async function ownerNotice(userId: string): Promise<OwnerNotice | null> {
  const a = await prisma.moderationAction.findFirst({
    where: { ownerId: userId, ownerAcknowledgedAt: null, action: { in: ADMIN_ACTIONS } },
    orderBy: { createdAt: "desc" },
  });
  if (!a || a.listingKind === "HANGAR") return null;
  const kind = a.listingKind as ModeratedKind;
  const listing = await findListing(kind, a.listingId);
  if (!listing) {
    await prisma.moderationAction.update({ where: { id: a.id }, data: { ownerAcknowledgedAt: new Date() } });
    return null;
  }
  return {
    actionId: a.id,
    action: a.action as OwnerNotice["action"],
    message: a.message,
    listingTitle: listing.title,
    listingStatus: listing.status,
    editHref: editHref(kind, listing.id),
    listingHref: listingHref(kind, listing.id),
  };
}

/** Cierra la ventana (y las anteriores del mismo dueño que hubieran quedado sin cerrar). */
export async function acknowledgeNotice(userId: string, actionId: string) {
  const a = await prisma.moderationAction.findFirst({ where: { id: actionId, ownerId: userId }, select: { createdAt: true } });
  if (!a) return;
  await prisma.moderationAction.updateMany({
    where: { ownerId: userId, ownerAcknowledgedAt: null, action: { in: ADMIN_ACTIONS }, createdAt: { lte: a.createdAt } },
    data: { ownerAcknowledgedAt: new Date() },
  });
}

export type ModerationInfo = { reason: string | null; reviewRequested: boolean };

/** Para "Mis publicaciones": motivo vigente y si ya pidió revisión, por aviso moderado. */
export async function moderationInfoFor(items: { kind: ModeratedKind; id: string }[]): Promise<Record<string, ModerationInfo>> {
  if (!items.length) return {};
  const actions = await prisma.moderationAction.findMany({
    where: { OR: items.map((i) => ({ listingKind: i.kind, listingId: i.id })) },
    orderBy: { createdAt: "asc" },
    select: { listingId: true, action: true, message: true },
  });
  const out: Record<string, ModerationInfo> = {};
  for (const a of actions) {
    const cur = out[a.listingId] ?? { reason: null, reviewRequested: false };
    if (a.action === "PAUSE" || a.action === "KEEP_PAUSED") out[a.listingId] = { reason: a.message, reviewRequested: false };
    else if (a.action === "REVIEW_REQUESTED") out[a.listingId] = { ...cur, reviewRequested: true };
    else out[a.listingId] = { reason: null, reviewRequested: false };
  }
  return out;
}

export type PendingReview = {
  kind: ModeratedKind;
  id: string;
  title: string;
  href: string;
  owner: { id: string; name: string | null; email: string };
  requestedAt: string;
  ownerMessage: string | null;
  history: { action: ModerationActionType; message: string | null; at: string; admin: string | null }[];
};

/** Cola "Revisiones pendientes": avisos moderados cuya última acción es el pedido de revisión. */
export async function pendingReviews(): Promise<PendingReview[]> {
  const requested = await prisma.moderationAction.findMany({
    where: { action: "REVIEW_REQUESTED" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { listingKind: true, listingId: true },
  });
  const seen = new Set<string>();
  const out: PendingReview[] = [];
  for (const r of requested) {
    const key = `${r.listingKind}:${r.listingId}`;
    if (seen.has(key) || r.listingKind === "HANGAR") continue;
    seen.add(key);
    const kind = r.listingKind as ModeratedKind;
    const listing = await findListing(kind, r.listingId);
    if (!listing || listing.status !== "MODERATED") continue;
    const history = await prisma.moderationAction.findMany({
      where: { listingKind: kind, listingId: r.listingId },
      orderBy: { createdAt: "asc" },
      include: { admin: { select: { name: true, email: true } }, owner: { select: { id: true, name: true, email: true } } },
    });
    const last = history[history.length - 1];
    if (last?.action !== "REVIEW_REQUESTED") continue;
    out.push({
      kind,
      id: listing.id,
      title: listing.title,
      href: listingHref(kind, listing.id),
      owner: last.owner,
      requestedAt: last.createdAt.toISOString(),
      ownerMessage: last.message,
      history: history.map((h) => ({ action: h.action, message: h.message, at: h.createdAt.toISOString(), admin: h.admin?.name ?? h.admin?.email ?? null })),
    });
  }
  return out;
}

/** Historial de moderación de un conjunto de avisos (para la tabla de reportes del admin). */
export async function historyFor(items: { kind: ModeratedKind; id: string }[]) {
  if (!items.length) return {} as Record<string, { action: ModerationActionType; message: string | null; at: string; admin: string | null }[]>;
  const rows = await prisma.moderationAction.findMany({
    where: { OR: items.map((i) => ({ listingKind: i.kind, listingId: i.id })) },
    orderBy: { createdAt: "asc" },
    include: { admin: { select: { name: true, email: true } } },
  });
  const out: Record<string, { action: ModerationActionType; message: string | null; at: string; admin: string | null }[]> = {};
  for (const r of rows) (out[r.listingId] ??= []).push({ action: r.action, message: r.message, at: r.createdAt.toISOString(), admin: r.admin?.name ?? r.admin?.email ?? null });
  return out;
}
