"use server";

import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PLANS_TAG } from "@/lib/plans";
import { TEST_PLAN_DEFAULTS, TEST_PLAN_ID } from "@/lib/test-plan";
import { QUOTA_TAG } from "@/lib/quota";
import { FEATURED_SELLERS_TAG } from "@/lib/featured";
import { gridDraftSchema, type GridBenefits, type GridDraft } from "@/lib/plan-grid-rules";

type Result = { ok: true } | { ok: false; error: string; needsPriceConfirm?: boolean };

// VA-166: guarda la grilla de /admin/plans: planes Base, Pro y las 3 opciones del Broker (la estructura es
// fija; la crean la migración va166_planes_grilla y scripts/va166-migrate-data.ts) y las filas de la
// grilla. Cambiar un precio real con suscriptores vigentes pide confirmación (vale para los cobros
// siguientes y hay que avisarles, como VA-59).
export async function savePlanGridAction(input: GridDraft, opts: { confirmPrice?: boolean } = {}): Promise<Result> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };

  const parsed = gridDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá la grilla." };
  const d = parsed.data;

  const plans = await prisma.plan.findMany({ where: { tier: { not: null }, archivedAt: null } });
  const base = plans.find((p) => p.tier === "BASE");
  const pro = plans.find((p) => p.tier === "PRO");
  const brokers = plans.filter((p) => p.tier === "BUSINESS");
  if (!base) return { ok: false, error: "Falta el plan Base (lo crea la migración va166_planes_grilla)." };

  // Precio real nuevo con suscriptores: confirmación.
  const brokerPrice = (p: (typeof brokers)[number]) => (p.isUnlimitedAircraft && p.isUnlimitedSpareParts ? d.broker?.priceBoth : d.broker?.priceOne);
  const priceChanged = [
    ...(pro && d.pro && Number(pro.price) !== d.pro.price ? [pro.id] : []),
    ...brokers.filter((p) => d.broker && Number(p.price) !== brokerPrice(p)).map((p) => p.id),
  ];
  if (priceChanged.length && !opts.confirmPrice) {
    const now = new Date();
    const affected = await prisma.subscription.count({
      where: { planId: { in: priceChanged }, source: { not: "MANUAL" }, OR: [{ status: "ACTIVE", currentPeriodEnd: { gt: now } }, { status: "PAST_DUE", graceUntil: { gt: now } }] },
    });
    if (affected > 0) return { ok: false, needsPriceConfirm: true, error: `El cambio de precio afecta a ${affected} suscriptor${affected === 1 ? "" : "es"}.` };
  }

  const benefits = (b: GridBenefits) => ({
    includesVerifiedBadge: b.verified,
    includesFeatured: b.featured,
    vaPageLevel: b.vaPage,
    includesCustomDetail: b.customDetail,
    metricsLevel: b.metrics,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.plan.update({
        where: { id: base.id },
        data: { aircraftListingsCount: d.base.aircraft, sparePartsListingsCount: d.base.parts, republishesPerYear: d.base.republishesPerYear, ...benefits(d.base) },
      });
      if (pro && d.pro) {
        await tx.plan.update({
          where: { id: pro.id },
          data: {
            price: d.pro.price,
            listPrice: d.pro.listPrice,
            isActive: d.pro.isActive,
            aircraftListingsCount: d.pro.aircraft,
            sparePartsListingsCount: d.pro.parts,
            republishesPerYear: d.pro.republishesPerYear,
            republishAllEveryDays: null,
            ...benefits(d.pro),
          },
        });
      }
      if (d.broker) {
        for (const p of brokers) {
          const both = p.isUnlimitedAircraft && p.isUnlimitedSpareParts;
          await tx.plan.update({
            where: { id: p.id },
            data: {
              price: both ? d.broker.priceBoth : d.broker.priceOne,
              listPrice: both ? d.broker.listBoth : d.broker.listOne,
              isActive: d.broker.isActive,
              republishesPerYear: 0,
              republishAllEveryDays: d.broker.republishAllEveryDays,
              ...benefits(d.broker),
            },
          });
        }
      }
      // Filas: las de sistema se actualizan (no se borran); las propias se crean, editan o quitan.
      const existing = await tx.planGridRow.findMany({ select: { id: true, systemKey: true } });
      const keep = new Set(d.rows.map((r) => r.id));
      const removable = existing.filter((r) => !r.systemKey && !keep.has(r.id)).map((r) => r.id);
      if (removable.length) await tx.planGridRow.deleteMany({ where: { id: { in: removable } } });
      for (const [i, r] of d.rows.entries()) {
        const data = { label: r.label, sortOrder: (i + 1) * 10, cells: r.systemKey ? {} : r.cells };
        const found = existing.find((e) => e.id === r.id);
        if (found) await tx.planGridRow.update({ where: { id: r.id }, data });
        else await tx.planGridRow.create({ data: { ...data, systemKey: null } });
      }
    });
  } catch (error) {
    console.error("Error al guardar la grilla de planes:", error);
    return { ok: false, error: "No se pudo guardar la grilla." };
  }

  updateTag(PLANS_TAG);
  updateTag(QUOTA_TAG);
  updateTag(FEATURED_SELLERS_TAG); // VA-168: el interruptor "Destacadas" de un plan
  revalidatePath("/admin/plans");
  revalidatePath("/"); // VA-76: la Home es estática y muestra el cartel del cupo de Base
  return { ok: true };
}

// 27/10: plan de prueba (lib/test-plan.ts). Publicado = aparece al pie de /plans y se puede pagar; borrador =
// no se ve ni se puede comprar. La primera vez crea la fila.
export async function saveTestPlanAction(input: { isActive: boolean; price: number }): Promise<Result> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { ok: false, error: "No autorizado." };
  const price = Math.round(Number(input.price));
  if (!Number.isFinite(price) || price < 1 || price > 10_000_000) return { ok: false, error: "Cargá un precio válido (al menos $1)." };
  const isActive = input.isActive === true;
  try {
    await prisma.plan.upsert({
      where: { id: TEST_PLAN_ID },
      create: { id: TEST_PLAN_ID, ...TEST_PLAN_DEFAULTS, price, isActive, sortOrder: 9999 },
      update: { price, isActive, archivedAt: null },
    });
  } catch (error) {
    console.error("Error al guardar el plan de prueba:", error);
    return { ok: false, error: "No se pudo guardar el plan de prueba." };
  }
  updateTag(PLANS_TAG);
  revalidatePath("/admin/plans");
  return { ok: true };
}
