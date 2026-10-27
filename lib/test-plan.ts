import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PLANS_TAG } from "@/lib/plans";

// 27/10 (socio): plan de prueba, aparte de la grilla, para probar cobros y facturación. Pago único que no
// da cupo ni beneficios. El admin lo publica (aparece al pie de /plans) o lo deja como borrador desde
// /admin/plans. Fila fija (id conocido), sin nivel (tier null), creada la primera vez que se guarda.
export const TEST_PLAN_ID = "plan-de-prueba";

export const TEST_PLAN_DEFAULTS = {
  name: "Plan de prueba",
  type: "SUBSCRIPTION" as const,
  billingType: "ONE_TIME" as const,
  usageDescription: "Pago de prueba para verificar el cobro y la factura. No incluye avisos ni beneficios.",
  description: "Solo para probar el cobro y la factura.",
};

export type TestPlan = { id: string; name: string; price: number; isActive: boolean };

export async function loadTestPlan(): Promise<TestPlan | null> {
  const p = await prisma.plan.findUnique({ where: { id: TEST_PLAN_ID }, select: { id: true, name: true, price: true, isActive: true, archivedAt: true } });
  return p && !p.archivedAt ? { id: p.id, name: p.name, price: Number(p.price), isActive: p.isActive } : null;
}

/** Para /plans (estática): solo si está publicado y con precio. */
export const getPublishedTestPlan = unstable_cache(
  async (): Promise<TestPlan | null> => {
    const p = await loadTestPlan();
    return p?.isActive && p.price > 0 ? p : null;
  },
  ["test-plan"],
  { tags: [PLANS_TAG], revalidate: 3600 }
);
