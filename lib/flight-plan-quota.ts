import "server-only";
import { prisma } from "@/lib/prisma";
import { getAccountPlan } from "@/lib/plan-benefits";

// VA-191: cupo de guardado, sumando planes de vuelo y perfiles de aeronave. Null es sin límite (Pro, Broker y admins).
export async function flightPlanQuota(userId: string): Promise<{ limit: number | null; used: number }> {
  const [account, plans, profiles] = await Promise.all([getAccountPlan(userId), prisma.flightPlan.count({ where: { userId } }), prisma.aircraftProfile.count({ where: { userId } })]);
  let limit: number | null = null;
  if (account.kind !== "ADMIN" && account.planId) {
    const plan = await prisma.plan.findUnique({ where: { id: account.planId }, select: { flightPlansLimit: true } });
    limit = plan ? plan.flightPlansLimit : 2;
  }
  return { limit, used: plans + profiles };
}
