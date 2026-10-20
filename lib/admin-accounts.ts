import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// VA-173: cuentas por tipo (para el resumen del admin y el filtro de /admin/users) y gastos fijos.

export type AccountType = "base" | "pro" | "broker" | "admin" | "cortesia";
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = { base: "Base", pro: "Pro", broker: "Broker", admin: "Admin", cortesia: "Cortesía" };

const currentSub = (now: Date) => ({
  OR: [
    { status: "ACTIVE" as const, currentPeriodEnd: { gt: now } },
    { status: "PAST_DUE" as const, graceUntil: { gt: now } },
  ],
});

/** Filtro de usuarios por tipo de cuenta (lo usa /admin/users?plan=…). */
export function accountTypeWhere(type: AccountType, now = new Date()): Prisma.UserWhereInput {
  switch (type) {
    case "admin":
      return { isAdmin: true };
    case "pro":
      return { isAdmin: false, Subscription: { is: { ...currentSub(now), plan: { tier: "PRO" } } } };
    case "broker":
      return { isAdmin: false, Subscription: { is: { ...currentSub(now), plan: { tier: "BUSINESS" } } } };
    case "cortesia":
      return { isAdmin: false, Subscription: { is: { ...currentSub(now), source: "MANUAL" } } };
    default:
      return { isAdmin: false, NOT: { Subscription: { is: currentSub(now) } } };
  }
}

export type AccountCounts = {
  rows: { type: AccountType; count: number; newThisMonth: number }[];
  brokerByOption: { aircraft: number; parts: number; both: number };
};

/** Cuántas cuentas hay de cada tipo y cuántas entraron este mes (altas o suscripciones nuevas). */
export async function getAccountCounts(now = new Date()): Promise<AccountCounts> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const types: AccountType[] = ["base", "pro", "broker", "admin", "cortesia"];
  const rows = [];
  for (const type of types) {
    const where = accountTypeWhere(type, now);
    const count = await prisma.user.count({ where });
    // Base y Admin: cuentas creadas este mes; los planes: suscripciones que empezaron este mes.
    const newThisMonth =
      type === "base" || type === "admin"
        ? await prisma.user.count({ where: { ...where, createdAt: { gte: monthStart } } })
        : await prisma.user.count({ where: { AND: [where, { Subscription: { is: { createdAt: { gte: monthStart } } } }] } });
    rows.push({ type, count, newThisMonth });
  }
  const brokers = await prisma.subscription.findMany({
    where: { ...currentSub(now), user: { isAdmin: false }, plan: { tier: "BUSINESS" } },
    select: { plan: { select: { isUnlimitedAircraft: true, isUnlimitedSpareParts: true } } },
  });
  const brokerByOption = { aircraft: 0, parts: 0, both: 0 };
  for (const b of brokers) {
    if (b.plan.isUnlimitedAircraft && b.plan.isUnlimitedSpareParts) brokerByOption.both++;
    else if (b.plan.isUnlimitedAircraft) brokerByOption.aircraft++;
    else brokerByOption.parts++;
  }
  return { rows, brokerByOption };
}

/** Tipo de cambio manual más reciente (o null). */
export async function latestExchangeRate() {
  const r = await prisma.exchangeRate.findFirst({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
  return r ? { usdToArs: Number(r.usdToArs), date: r.date } : null;
}

export type ExpensesSummary = {
  monthlyArs: number;
  /** Gastos en dólares sin tipo de cambio cargado (no se pueden sumar). */
  missingRate: boolean;
  rate: { usdToArs: number; date: Date } | null;
  revenueThisMonth: number;
  /** Ingresos de suscripciones del mes contra gastos fijos: true = cubiertos. */
  covered: boolean;
};

/** Total mensual en pesos de los gastos fijos vigentes y cobertura con los ingresos de suscripciones del mes. */
export async function getExpensesSummary(now = new Date()): Promise<ExpensesSummary> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [expenses, rate, revenue] = await Promise.all([
    prisma.fixedExpense.findMany({ where: { since: { lte: now } } }),
    latestExchangeRate(),
    prisma.payment.aggregate({
      where: { subscriptionId: { not: null }, status: "approved", isTest: false, approvedAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ]);
  let monthlyArs = 0;
  let missingRate = false;
  for (const e of expenses) {
    const monthly = Number(e.amount) / (e.frequency === "YEARLY" ? 12 : 1);
    if (e.currency === "USD") {
      if (!rate) missingRate = true;
      else monthlyArs += monthly * rate.usdToArs;
    } else monthlyArs += monthly;
  }
  const revenueThisMonth = Number(revenue._sum.amount) || 0;
  return { monthlyArs: Math.round(monthlyArs), missingRate, rate, revenueThisMonth, covered: revenueThisMonth >= monthlyArs };
}
