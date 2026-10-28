import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// VA-182: miembros fundadores. Las primeras N cuentas no admin (QuotaSettings.foundingMembersLimit, 15 por
// defecto) que publican su primer aviso quedan como fundadoras y reciben 6 meses bonificados de Broker /
// Empresa con todo ilimitado (suscripción MANUAL hasta esa fecha; al vencer vuelve a Base como cualquier
// plan). Se decide en la misma transacción que crea el aviso, con la fila de la configuración bloqueada:
// dos que publican a la vez no pasan el límite.
// 28/10 (socio): DESACTIVADO. La bonificación es 100 % manual desde /admin/users; publicar ya no la otorga
// (app/publish/actions.ts no llama a claimFoundingMembership). Ver lib/business-signup-notice.ts.

export const FOUNDING_MONTHS = 6;
export const FOUNDING_NOTE = "Miembro fundador: 6 meses bonificados";

export type FoundingGrant = { until: Date; planName: string };

export async function claimFoundingMembership(tx: Prisma.TransactionClient, userId: string, now = new Date()): Promise<FoundingGrant | null> {
  await tx.quotaSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
  const [settings] = await tx.$queryRaw<{ limit: number }[]>`SELECT "foundingMembersLimit" AS "limit" FROM "QuotaSettings" WHERE id = 'default' FOR UPDATE`;

  const user = await tx.user.findUnique({ where: { id: userId }, select: { isAdmin: true, isFoundingMember: true } });
  if (!user || user.isAdmin || user.isFoundingMember) return null;
  // Su primer aviso: el que se acaba de crear es el único que tiene.
  const [aircraft, parts] = await Promise.all([tx.aircraft.count({ where: { sellerId: userId } }), tx.sparePart.count({ where: { sellerId: userId } })]);
  if (aircraft + parts !== 1) return null;
  if ((await tx.user.count({ where: { isFoundingMember: true } })) >= settings.limit) return null;

  // Una suscripción vigente (paga o bonificada) no se pisa.
  const current = await tx.subscription.findUnique({ where: { userId }, select: { status: true, currentPeriodEnd: true } });
  if (current && (current.status === "PENDING" || (current.status === "ACTIVE" && current.currentPeriodEnd > now))) return null;
  const plan = await tx.plan.findFirst({
    where: { tier: "BUSINESS", isUnlimitedAircraft: true, isUnlimitedSpareParts: true, archivedAt: null },
    select: { id: true, name: true },
  });
  if (!plan) return null;

  const until = new Date(now);
  until.setMonth(until.getMonth() + FOUNDING_MONTHS);
  await tx.user.update({ where: { id: userId }, data: { isFoundingMember: true, foundingMemberAt: now } });
  const data = {
    planId: plan.id,
    status: "ACTIVE" as const,
    source: "MANUAL" as const,
    mpSubscriptionId: null,
    mpStatus: null,
    currentPeriodStart: now,
    currentPeriodEnd: until,
    cancelAtPeriodEnd: false,
    graceUntil: null,
    grantedById: null,
    note: FOUNDING_NOTE,
  };
  await tx.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return { until, planName: plan.name };
}

/** "Fundadores: N de 15" del admin. */
export async function foundingCount(db: Prisma.TransactionClient | typeof prisma = prisma) {
  const [count, settings] = await Promise.all([
    db.user.count({ where: { isFoundingMember: true } }),
    db.quotaSettings.findUnique({ where: { id: "default" }, select: { foundingMembersLimit: true } }),
  ]);
  return { count, limit: settings?.foundingMembersLimit ?? 15 };
}
