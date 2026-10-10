"use server";

import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PLANS_TAG } from "@/lib/plans";
import { planInputSchema, type PlanInput } from "@/lib/plan-rules";
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

// VA-80: alta y edición de un plan. Las reglas son las mismas del formulario (lib/plan-rules.ts).
// Un cambio de precio grande (más del 50 %, a 0 o desde 0) pide CONFIRMAR, como en VA-59; el nuevo
// precio vale para las compras y los cobros siguientes.
export async function savePlanAction(input: PlanInput & { id?: string; confirmText?: string }): Promise<Result> {
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
  const isSubscription = p.type === "SUBSCRIPTION";
  const data = {
    name: p.name,
    type: p.type,
    price: p.price,
    billingType: isSubscription ? ("SUBSCRIPTION" as const) : ("ONE_TIME" as const),
    billingInterval: isSubscription ? p.billingInterval : null,
    aircraftListingsCount: p.isUnlimitedAircraft ? 0 : p.aircraftListingsCount,
    sparePartsListingsCount: p.isUnlimitedSpareParts ? 0 : p.sparePartsListingsCount,
    isUnlimitedAircraft: isSubscription && p.isUnlimitedAircraft,
    isUnlimitedSpareParts: isSubscription && p.isUnlimitedSpareParts,
    noExpiry: p.noExpiry,
    includesVerifiedBadge: p.includesVerifiedBadge,
    includesCustomPage: p.includesCustomPage,
    usageDescription: p.usageDescription || null,
    description: p.description || null,
    features: p.features,
    badge: p.badge || null,
    isPopular: p.isPopular,
    showInAircraftTab: p.showInAircraftTab,
    showInPartsTab: p.showInPartsTab,
    sortOrder: p.sortOrder,
    isActive: p.isActive,
  };

  try {
    if (input.id) {
      const current = await prisma.plan.findUnique({ where: { id: input.id }, select: { price: true, archivedAt: true } });
      if (!current) return { ok: false, error: "El plan no existe." };
      if (current.archivedAt) return { ok: false, error: "El plan está archivado: restauralo antes de editarlo." };
      const previous = Number(current.price);
      if (isLargePriceChange(previous, p.price) && input.confirmText?.trim().toUpperCase() !== "CONFIRMAR") {
        return { ok: false, error: "Es un cambio de precio grande: escribí CONFIRMAR para guardarlo." };
      }
      await prisma.plan.update({ where: { id: input.id }, data });
      refresh(input.id);
      return { ok: true, id: input.id };
    }
    const created = await prisma.plan.create({ data, select: { id: true } });
    refresh();
    return { ok: true, id: created.id };
  } catch (error) {
    console.error("Error al guardar el plan:", error);
    return { ok: false, error: "No se pudo guardar el plan." };
  }
}

// Archivar: sale de /plans y no se puede comprar, pero conserva compras y suscripciones.
export async function archivePlanAction(id: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "No autorizado." };
  await prisma.plan.update({ where: { id }, data: { archivedAt: new Date(), isActive: false } });
  refresh(id);
  return { ok: true, id };
}

// Restaurar vuelve a dejarlo editable, inactivo: el admin decide cuándo mostrarlo.
export async function restorePlanAction(id: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "No autorizado." };
  await prisma.plan.update({ where: { id }, data: { archivedAt: null, isActive: false } });
  refresh(id);
  return { ok: true, id };
}

// Eliminar solo si nadie lo compró ni está suscripto; si no, hay que archivarlo.
export async function deletePlanAction(id: string, confirmText: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "No autorizado." };
  if (confirmText.trim().toUpperCase() !== "ELIMINAR") return { ok: false, error: "Escribí ELIMINAR para confirmar." };
  const plan = await prisma.plan.findUnique({
    where: { id },
    select: { _count: { select: { purchases: true, subscriptions: true } } },
  });
  if (!plan) return { ok: false, error: "El plan no existe." };
  if (plan._count.purchases > 0 || plan._count.subscriptions > 0) {
    return { ok: false, error: "Tiene compras o suscripciones: archivalo en vez de eliminarlo." };
  }
  await prisma.plan.delete({ where: { id } });
  refresh();
  return { ok: true, id };
}
