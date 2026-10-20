import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAccountPlan } from "@/lib/plan-benefits";

// VA-167: republicar = volver a poner un aviso activo primero en "Más recientes" y "Últimas
// publicaciones" (lastPublishedAt). No cambia el aviso ni su historial; pausar y reactivar no republica.
//
// - Base y Pro: N por año (de la grilla, VA-166), contando 12 meses desde el alta de la cuenta (Base) o de
//   la suscripción (Pro); se reponen al cumplirse el año y no se acumulan. Un mismo aviso, como mucho una
//   vez cada QuotaSettings.republishCooldownDays (7) días.
// - Broker y admins: "Republicar todas" (todos sus avisos activos), cada N días desde la última vez.

type Db = Prisma.TransactionClient | typeof prisma;
export type ListingKind = "AIRCRAFT" | "SPARE_PART";

const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_COOLDOWN = 7;

export type RepublishStatus =
  | { mode: "NONE" }
  | { mode: "COUNT"; perYear: number; used: number; remaining: number; resetsAt: Date; cooldownDays: number }
  | { mode: "ALL"; everyDays: number; lastAt: Date | null; availableAt: Date | null };

/** Comienzo del año en curso contado desde `anchor` (aniversarios). */
export function periodStart(anchor: Date, now = new Date()): Date {
  const start = new Date(anchor);
  start.setFullYear(now.getFullYear());
  if (start > now) start.setFullYear(now.getFullYear() - 1);
  // Si la cuenta se creó hace menos de un año, el período arranca en el alta.
  return start < anchor ? new Date(anchor) : start;
}

async function cooldownDays(db: Db): Promise<number> {
  const s = await db.quotaSettings.findUnique({ where: { id: "default" }, select: { republishCooldownDays: true } });
  return s?.republishCooldownDays ?? DEFAULT_COOLDOWN;
}

/** Saldo de republicaciones de la cuenta. */
export async function getRepublishStatus(userId: string, db: Db = prisma, now = new Date()): Promise<RepublishStatus> {
  const plan = await getAccountPlan(userId, db, now);
  if (plan.republishAllEveryDays) {
    const last = await db.republication.findFirst({ where: { userId, bulk: true }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    const next = last ? new Date(last.createdAt.getTime() + plan.republishAllEveryDays * DAY) : null;
    return { mode: "ALL", everyDays: plan.republishAllEveryDays, lastAt: last?.createdAt ?? null, availableAt: next && next > now ? next : null };
  }
  if (plan.republishesPerYear <= 0) return { mode: "NONE" };
  const start = periodStart(plan.periodAnchor, now);
  const resetsAt = new Date(start);
  resetsAt.setFullYear(resetsAt.getFullYear() + 1);
  const used = await db.republication.count({ where: { userId, bulk: false, createdAt: { gte: start } } });
  return { mode: "COUNT", perYear: plan.republishesPerYear, used, remaining: Math.max(0, plan.republishesPerYear - used), resetsAt, cooldownDays: await cooldownDays(db) };
}

/** ¿Hay algo para republicar ahora? (para el punto del menú y el cartel de "Mis publicaciones"). */
export function hasRepublishAvailable(s: RepublishStatus): boolean {
  return (s.mode === "COUNT" && s.remaining > 0) || (s.mode === "ALL" && !s.availableAt);
}

/** Clave del saldo actual: si el usuario cierra el cartel, vuelve recién cuando cambia (VA-167). */
export function republishKey(s: RepublishStatus): string {
  if (s.mode === "COUNT") return `count-${s.remaining}-${s.resetsAt.toISOString().slice(0, 10)}`;
  if (s.mode === "ALL") return `all-${s.lastAt?.toISOString() ?? "nunca"}`;
  return "none";
}

/** Para mandar al navegador (fechas como texto). */
export type RepublishView =
  | { mode: "NONE" }
  | { mode: "COUNT"; perYear: number; remaining: number; resetsAt: string; cooldownDays: number; key: string }
  | { mode: "ALL"; everyDays: number; availableAt: string | null; key: string };

export function republishView(s: RepublishStatus): RepublishView {
  if (s.mode === "COUNT") return { mode: "COUNT", perYear: s.perYear, remaining: s.remaining, resetsAt: s.resetsAt.toISOString(), cooldownDays: s.cooldownDays, key: republishKey(s) };
  if (s.mode === "ALL") return { mode: "ALL", everyDays: s.everyDays, availableAt: s.availableAt?.toISOString() ?? null, key: republishKey(s) };
  return { mode: "NONE" };
}

type Result = { ok: true; republished: number } | { ok: false; error: string };

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
export const shortDate = (d: Date) => dateFmt.format(d);

/** Republica un aviso propio y activo (Base y Pro, con saldo). */
export async function republishListing(userId: string, kind: ListingKind, id: string, now = new Date()): Promise<Result> {
  return prisma.$transaction(async (tx) => {
    // Dos republicaciones simultáneas se esperan (no se gasta saldo de más).
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const listing =
      kind === "AIRCRAFT"
        ? await tx.aircraft.findUnique({ where: { id }, select: { sellerId: true, status: true } })
        : await tx.sparePart.findUnique({ where: { id }, select: { sellerId: true, status: true } });
    if (!listing || listing.sellerId !== userId) return { ok: false, error: "El aviso no existe." };
    if (listing.status !== "ACTIVE") return { ok: false, error: "Solo se republican los avisos activos." };

    const status = await getRepublishStatus(userId, tx, now);
    if (status.mode === "ALL") return { ok: false, error: "Con tu plan republicás todos tus avisos juntos con \"Republicar todas\"." };
    if (status.mode === "NONE") return { ok: false, error: "Tu plan no incluye republicaciones." };
    if (status.remaining <= 0) return { ok: false, error: `No te quedan republicaciones: se reponen el ${shortDate(status.resetsAt)}.` };

    const where = kind === "AIRCRAFT" ? { aircraftId: id } : { sparePartId: id };
    const last = await tx.republication.findFirst({ where: { ...where, bulk: false }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    if (last && now.getTime() - last.createdAt.getTime() < status.cooldownDays * DAY) {
      const next = new Date(last.createdAt.getTime() + status.cooldownDays * DAY);
      return { ok: false, error: `Ya republicaste este aviso: podés volver a hacerlo el ${shortDate(next)}.` };
    }

    if (kind === "AIRCRAFT") await tx.aircraft.update({ where: { id }, data: { lastPublishedAt: now } });
    else await tx.sparePart.update({ where: { id }, data: { lastPublishedAt: now } });
    await tx.republication.create({ data: { userId, ...where, createdAt: now } });
    return { ok: true, republished: 1 };
  });
}

/** "Republicar todas" (Broker y admins): todos los avisos activos, cada N días. */
export async function republishAll(userId: string, now = new Date()): Promise<Result> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const status = await getRepublishStatus(userId, tx, now);
    if (status.mode !== "ALL") return { ok: false, error: "Tu plan republica aviso por aviso." };
    if (status.availableAt) return { ok: false, error: `Podés volver a republicar el ${shortDate(status.availableAt)}.` };

    const aircraft = await tx.aircraft.findMany({ where: { sellerId: userId, status: "ACTIVE" }, select: { id: true } });
    const parts = await tx.sparePart.findMany({ where: { sellerId: userId, status: "ACTIVE" }, select: { id: true } });
    if (aircraft.length + parts.length === 0) return { ok: false, error: "No tenés avisos activos para republicar." };
    await tx.aircraft.updateMany({ where: { id: { in: aircraft.map((a) => a.id) } }, data: { lastPublishedAt: now } });
    await tx.sparePart.updateMany({ where: { id: { in: parts.map((p) => p.id) } }, data: { lastPublishedAt: now } });
    await tx.republication.createMany({
      data: [
        ...aircraft.map((a) => ({ userId, aircraftId: a.id, bulk: true, createdAt: now })),
        ...parts.map((p) => ({ userId, sparePartId: p.id, bulk: true, createdAt: now })),
      ],
    });
    return { ok: true, republished: aircraft.length + parts.length };
  });
}
