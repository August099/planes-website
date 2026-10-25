"use server";

import "server-only";
import { prisma } from "@/lib/prisma";
import { revalidatePath, updateTag } from "next/cache";
import { FEATURED_SELLERS_TAG } from "@/lib/featured";
import { getCurrentUser } from "@/lib/auth-helpers";
import { parseAnyUserType } from "@/lib/user-types";
import { grantCourtesyPlan, revokeCourtesyPlan } from "@/lib/courtesy-plans";

// VA-33: el admin corrige el tipo de cuenta (incluida "Fábrica", que el usuario no puede elegir).
export async function setUserTypeAction(
  userId: string,
  value: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  if (typeof userId !== "string" || !userId) return { ok: false, error: "Usuario inválido." };
  const userType = parseAnyUserType(value);
  if (!userType) return { ok: false, error: "Tipo de cuenta inválido." };

  try {
    await prisma.user.update({ where: { id: userId }, data: { userType, userTypeConfirmed: true } });
    revalidatePath("/admin/users");
    revalidatePath(`/profile/${userId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error al cambiar el tipo de cuenta:", error);
    return { ok: false, error: "No se pudo guardar el cambio." };
  }
}

// VA-92: plan de cortesía (suscripción MANUAL hasta una fecha). Ver lib/courtesy-plans.ts.
export async function grantCourtesyPlanAction(input: {
  userId: string;
  planId: string;
  until: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  // La fecha llega como AAAA-MM-DD: vence al final de ese día (hora de Argentina).
  const until = /^\d{4}-\d{2}-\d{2}$/.test(input.until) ? new Date(`${input.until}T23:59:59-03:00`) : new Date(NaN);
  const res = await grantCourtesyPlan({ adminId: admin.id, userId: input.userId, planId: input.planId, until, note: input.note });
  if (res.ok) {
    revalidatePath("/admin/users");
    revalidatePath(`/profile/${input.userId}`);
    updateTag(FEATURED_SELLERS_TAG); // VA-168: la cortesía puede incluir destacadas
  }
  return res;
}

export async function revokeCourtesyPlanAction(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  const res = await revokeCourtesyPlan(userId);
  if (res.ok) updateTag(FEATURED_SELLERS_TAG); // VA-168
  if (res.ok) {
    revalidatePath("/admin/users");
    revalidatePath(`/profile/${userId}`);
  }
  return res;
}

// VA-182: cuántas cuentas pueden ser fundadoras. No quita el beneficio a las que ya lo tienen.
export async function updateFoundingLimitAction(limit: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  const n = Math.trunc(Number(limit));
  if (!Number.isFinite(n) || n < 0 || n > 1000) return { ok: false, error: "Poné un número entre 0 y 1000." };
  await prisma.quotaSettings.upsert({ where: { id: "default" }, create: { id: "default", foundingMembersLimit: n, updatedById: admin.id }, update: { foundingMembersLimit: n, updatedById: admin.id } });
  revalidatePath("/admin/users");
  return { ok: true };
}
