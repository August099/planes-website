import "server-only";
import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAccountPlan, getBaseLimits, type AccountKind } from "@/lib/plan-benefits";

// VA-152 / VA-166: cupos fijos sin vencimiento. ÚNICO lugar con la regla del cupo (publicar, activar,
// perfil, admin, /plans y bajas de plan). Cupo = avisos ACTIVE al mismo tiempo, por tipo; no cuentan los
// pausados, vendidos ni (VA-154) los pausados por moderación. Los límites de cada plan salen de
// lib/plan-benefits.ts (Base 1 / 3, Pro 3 / 10, Broker lo elegido ilimitado y lo demás como Base, admins
// sin límite). Los hangares (ocultos) no usan cupos.

type Db = Prisma.TransactionClient | typeof prisma;
export type QuotaKind = "AIRCRAFT" | "SPARE_PART";
/** null = ilimitado. */
export type QuotaLimits = { AIRCRAFT: number | null; SPARE_PART: number | null };
export type QuotaTier = AccountKind;

export const QUOTA_KIND_TEXT: Record<QuotaKind, { one: string; many: string }> = {
  AIRCRAFT: { one: "avión", many: "aviones" },
  SPARE_PART: { one: "repuesto", many: "repuestos" },
};

/** Cupo del plan Base (el de toda cuenta sin plan). */
export async function getFreeQuota(db: Db = prisma): Promise<QuotaLimits> {
  return getBaseLimits(db);
}

export type Entitlement = { tier: QuotaTier; planName: string; limits: QuotaLimits };

/** Plan efectivo y cupo de la cuenta. */
export async function getEntitlement(userId: string, db: Db = prisma, now = new Date()): Promise<Entitlement> {
  const plan = await getAccountPlan(userId, db, now);
  return { tier: plan.kind, planName: plan.planName, limits: plan.limits };
}

export async function countActive(userId: string, db: Db = prisma): Promise<Record<QuotaKind, number>> {
  const AIRCRAFT = await db.aircraft.count({ where: { sellerId: userId, status: "ACTIVE" } });
  const SPARE_PART = await db.sparePart.count({ where: { sellerId: userId, status: "ACTIVE" } });
  return { AIRCRAFT, SPARE_PART };
}

export type QuotaUsage = Entitlement & { used: Record<QuotaKind, number> };

/** Uso del cupo para mostrar (perfil, formulario de publicar, admin). */
export async function getQuotaUsage(userId: string, db: Db = prisma): Promise<QuotaUsage> {
  const ent = await getEntitlement(userId, db);
  const used = await countActive(userId, db);
  return { ...ent, used };
}

export function hasRoom(usage: QuotaUsage, kind: QuotaKind): boolean {
  const limit = usage.limits[kind];
  return limit === null || usage.used[kind] < limit;
}

/** "Aviones 1/1 · Repuestos 3/5" (∞ si es ilimitado). */
export function quotaText(usage: QuotaUsage): string {
  const part = (kind: QuotaKind, label: string) => `${label} ${usage.used[kind]}/${usage.limits[kind] ?? "∞"}`;
  return `${part("AIRCRAFT", "Aviones")} · ${part("SPARE_PART", "Repuestos")}`;
}

/**
 * Dentro de una transacción: bloquea la fila del usuario (dos altas o activaciones simultáneas se
 * esperan una a la otra) y dice si queda cupo para un aviso más de este tipo.
 */
export async function lockAndCheckRoom(tx: Prisma.TransactionClient, userId: string, kind: QuotaKind): Promise<boolean> {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
  return hasRoom(await getQuotaUsage(userId, tx), kind);
}

/**
 * Baja de plan (fin del período, cobro rechazado sin gracia, arrepentimiento o cambio a un plan con
 * menos cupo): si quedan más avisos activos que el cupo, se pausan los más nuevos en el momento (sin
 * plazo, decisión del 18/10). El dueño después puede pausar otro y activar el que prefiera.
 * Devuelve cuántos pausó por tipo.
 */
export async function enforceQuota(userId: string, now = new Date()): Promise<Record<QuotaKind, number>> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const ent = await getEntitlement(userId, tx, now);
    const paused: Record<QuotaKind, number> = { AIRCRAFT: 0, SPARE_PART: 0 };
    const orderBy = [{ listingStartsAt: { sort: "desc" as const, nulls: "last" as const } }, { createdAt: "desc" as const }];
    const limitA = ent.limits.AIRCRAFT;
    if (limitA !== null) {
      const active = await tx.aircraft.findMany({ where: { sellerId: userId, status: "ACTIVE" }, select: { id: true }, orderBy });
      const extra = active.slice(0, Math.max(0, active.length - limitA)).map((a) => a.id);
      if (extra.length) paused.AIRCRAFT = (await tx.aircraft.updateMany({ where: { id: { in: extra } }, data: { status: "PAUSED" } })).count;
    }
    const limitP = ent.limits.SPARE_PART;
    if (limitP !== null) {
      const active = await tx.sparePart.findMany({ where: { sellerId: userId, status: "ACTIVE" }, select: { id: true }, orderBy });
      const extra = active.slice(0, Math.max(0, active.length - limitP)).map((p) => p.id);
      if (extra.length) paused.SPARE_PART = (await tx.sparePart.updateMany({ where: { id: { in: extra } }, data: { status: "PAUSED" } })).count;
    }
    return paused;
  });
}

/** Cuántos avisos se pausarían si la cuenta pasara a estos cupos (para avisar antes de una baja). */
export async function excessFor(userId: string, limits: QuotaLimits, db: Db = prisma): Promise<Record<QuotaKind, number>> {
  const used = await countActive(userId, db);
  const over = (kind: QuotaKind) => (limits[kind] === null ? 0 : Math.max(0, used[kind] - limits[kind]!));
  return { AIRCRAFT: over("AIRCRAFT"), SPARE_PART: over("SPARE_PART") };
}

/** Cupos al quedarse sin suscripción: Base (los admins siguen sin límite). */
export async function limitsWithoutPlan(userId: string, db: Db = prisma): Promise<QuotaLimits> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return user?.isAdmin ? { AIRCRAFT: null, SPARE_PART: null } : getFreeQuota(db);
}

/** "Se pausan tus 2 aviones más nuevos y 3 repuestos más nuevos" (vacío si no hay que pausar nada). */
export function describePaused(p: Record<QuotaKind, number>): string | null {
  const parts = (["AIRCRAFT", "SPARE_PART"] as const)
    .filter((k) => p[k] > 0)
    .map((k) => `${p[k] === 1 ? `tu ${QUOTA_KIND_TEXT[k].one} más nuevo` : `tus ${p[k]} ${QUOTA_KIND_TEXT[k].many} más nuevos`}`);
  return parts.length ? `Se pausan ${parts.join(" y ")}, para quedar dentro del cupo. Después podés elegir cuáles quedan activos.` : null;
}

/** Cupo de Base cacheado para los carteles de páginas estáticas (se refresca al editarlo, tag "quota"). */
export const QUOTA_TAG = "quota";
export const getCachedFreeQuota = unstable_cache(() => getFreeQuota(), ["free-quota", "va166"], { tags: [QUOTA_TAG], revalidate: 3600 });
