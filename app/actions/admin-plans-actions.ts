"use server";

import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PLANS_TAG } from "@/lib/plans";
import { QUOTA_TAG } from "@/lib/quota";
import { planInputSchema, planRecordFromInput, type PlanInput } from "@/lib/plan-rules";
import { isLargePriceChange } from "@/lib/listing-price-format";

type Result = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireAdmin() {
  const admin = await getCurrentUser();
  return admin?.isAdmin ? admin : null;
}

function refresh(id?: string) {
  updateTag(PLANS_TAG);
  revalidatePath("/admin/plans");
  if (id) revalidatePath(`/admin/plans/${id}`);
}

// VA-80 / VA-152: edición de un plan (Pro o una opción del Empresarial; la estructura es fija y la
// crea el script de datos de VA-152). Las reglas son las mismas del formulario (lib/plan-rules.ts).
// Un cambio de precio grande (más del 50 %, a 0 o desde 0) pide CONFIRMAR, como en VA-59; el nuevo
// precio vale para los cobros siguientes.
export async function savePlanAction(input: PlanInput & { id: string; confirmText?: string }): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "No autorizado." };

  const parsed = planInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Revisá los campos marcados.", fieldErrors };
  }
  const p = parsed.data;

  try {
    const current = await prisma.plan.findUnique({ where: { id: input.id }, select: { price: true, archivedAt: true, tier: true } });
    if (!current || !current.tier) return { ok: false, error: "El plan no existe." };
    if (current.archivedAt) return { ok: false, error: "El plan está archivado." };
    const previous = Number(current.price);
    if (isLargePriceChange(previous, p.price) && input.confirmText?.trim().toUpperCase() !== "CONFIRMAR") {
      return { ok: false, error: "Es un cambio de precio grande: escribí CONFIRMAR para guardarlo." };
    }
    await prisma.plan.update({ where: { id: input.id }, data: planRecordFromInput(p, current.tier) });
    refresh(input.id);
    return { ok: true, id: input.id };
  } catch (error) {
    console.error("Error al guardar el plan:", error);
    return { ok: false, error: "No se pudo guardar el plan." };
  }
}

// VA-152: cupo del plan Gratis (también lo que no es ilimitado en el Empresarial).
export async function saveFreeQuotaAction(input: { aircraft: unknown; parts: unknown }): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };
  const aircraft = Number(input.aircraft);
  const parts = Number(input.parts);
  const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100;
  if (!valid(aircraft) || !valid(parts)) return { ok: false, error: "Cada cupo va de 0 a 100." };
  const data = { freeAircraftQuota: aircraft, freeSparePartQuota: parts, updatedById: admin.id };
  await prisma.quotaSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  updateTag(QUOTA_TAG);
  updateTag(PLANS_TAG);
  revalidatePath("/admin/plans");
  revalidatePath("/"); // VA-76: la Home es estática y muestra el cartel del cupo
  return { ok: true };
}
