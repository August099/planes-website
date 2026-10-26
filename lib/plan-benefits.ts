import "server-only";
import type { MetricsLevel, Prisma, VaPageLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentSubscriptionWhere } from "@/lib/subscriptions";

// VA-166 / VA-174: ÚNICO lugar que dice qué tiene cada cuenta según su plan (la grilla de los socios del
// 19/10). Todo sale de las columnas de Plan (editables en /admin/plans), no del nombre del plan.
//
// - Base (toda cuenta sin suscripción vigente): la fila de Plan con tier BASE.
// - Pro: su fila.
// - Broker / Empresa (tier BUSINESS): su fila; lo que no eligió ilimitado tiene el cupo de Base.
// - Admin: Broker completo (ambos ilimitados) para siempre, sin suscripción ni cortesía.

type Db = Prisma.TransactionClient | typeof prisma;

export type AccountKind = "BASE" | "PRO" | "BROKER" | "ADMIN";
/** null = ilimitado. */
export type PlanLimits = { AIRCRAFT: number | null; SPARE_PART: number | null };

export type AccountPlan = {
  kind: AccountKind;
  planId: string | null;
  planName: string;
  limits: PlanLimits;
  /** Republicaciones por año (Base y Pro); 0 si el plan republica todas juntas. */
  republishesPerYear: number;
  /** "Republicar todas" cada N días (Broker y admins); null si no tiene. */
  republishAllEveryDays: number | null;
  /** Desde cuándo se cuenta el año de las republicaciones: alta de la cuenta (Base) o de la suscripción (Pro). */
  periodAnchor: Date;
  verified: boolean;
  featured: boolean;
  vaPage: VaPageLevel;
  customDetail: boolean;
  metrics: MetricsLevel;
  /** Suscripción de cortesía (asignada desde el admin). */
  courtesy: boolean;
};

const BASE_FALLBACK = { id: null, name: "Base", aircraftListingsCount: 1, sparePartsListingsCount: 3, republishesPerYear: 2 };
const ADMIN_REPUBLISH_DAYS = 30;

const planSelect = {
  id: true,
  name: true,
  tier: true,
  aircraftListingsCount: true,
  sparePartsListingsCount: true,
  isUnlimitedAircraft: true,
  isUnlimitedSpareParts: true,
  republishesPerYear: true,
  republishAllEveryDays: true,
  includesVerifiedBadge: true,
  includesFeatured: true,
  vaPageLevel: true,
  includesCustomDetail: true,
  metricsLevel: true,
} as const;

/** El plan Base (si falta la fila, los valores de la grilla del 19/10). */
export async function getBasePlan(db: Db = prisma) {
  return (await db.plan.findFirst({ where: { tier: "BASE" }, select: { id: true, name: true, aircraftListingsCount: true, sparePartsListingsCount: true, republishesPerYear: true } })) ?? BASE_FALLBACK;
}

/** Cupo de Base: el de toda cuenta sin plan y el de lo no ilimitado del Broker. */
export async function getBaseLimits(db: Db = prisma): Promise<{ AIRCRAFT: number; SPARE_PART: number }> {
  const base = await getBasePlan(db);
  return { AIRCRAFT: base.aircraftListingsCount, SPARE_PART: base.sparePartsListingsCount };
}

/** Plan efectivo de la cuenta y todo lo que incluye. En serie: dentro de una transacción todo va por la misma conexión. */
export async function getAccountPlan(userId: string, db: Db = prisma, now = new Date()): Promise<AccountPlan> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { isAdmin: true, createdAt: true } });
  const sub = await db.subscription.findFirst({
    where: currentSubscriptionWhere(userId, now),
    select: { createdAt: true, source: true, plan: { select: planSelect } },
  });
  const base = await getBasePlan(db);
  const baseLimits = { AIRCRAFT: base.aircraftListingsCount, SPARE_PART: base.sparePartsListingsCount };

  if (user?.isAdmin) {
    return {
      kind: "ADMIN",
      planId: null,
      planName: "Admin",
      limits: { AIRCRAFT: null, SPARE_PART: null },
      republishesPerYear: 0,
      republishAllEveryDays: ADMIN_REPUBLISH_DAYS,
      periodAnchor: user.createdAt,
      verified: true,
      featured: true,
      vaPage: "FULL",
      customDetail: true,
      metrics: "FULL",
      courtesy: false,
    };
  }

  const plan = sub?.plan;
  if (!plan || plan.tier === "BASE" || !plan.tier) {
    return {
      kind: "BASE",
      planId: base.id,
      planName: base.name,
      limits: baseLimits,
      republishesPerYear: base.republishesPerYear,
      republishAllEveryDays: null,
      periodAnchor: user?.createdAt ?? now,
      verified: false,
      featured: false,
      vaPage: "NONE",
      customDetail: false,
      metrics: "BASIC",
      courtesy: false,
    };
  }

  const broker = plan.tier === "BUSINESS";
  return {
    kind: broker ? "BROKER" : "PRO",
    planId: plan.id,
    planName: plan.name,
    limits: broker
      ? { AIRCRAFT: plan.isUnlimitedAircraft ? null : baseLimits.AIRCRAFT, SPARE_PART: plan.isUnlimitedSpareParts ? null : baseLimits.SPARE_PART }
      : { AIRCRAFT: plan.aircraftListingsCount, SPARE_PART: plan.sparePartsListingsCount },
    republishesPerYear: plan.republishesPerYear,
    republishAllEveryDays: plan.republishAllEveryDays,
    periodAnchor: sub!.createdAt,
    verified: plan.includesVerifiedBadge,
    featured: plan.includesFeatured,
    vaPage: plan.vaPageLevel,
    customDetail: plan.includesCustomDetail,
    metrics: plan.metricsLevel,
    courtesy: sub!.source === "MANUAL",
  };
}

/** Nombre corto para mostrar el tipo de cuenta ("Base", "Pro", "Broker", "Admin"). */
export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = { BASE: "Base", PRO: "Pro", BROKER: "Broker", ADMIN: "Admin" };
