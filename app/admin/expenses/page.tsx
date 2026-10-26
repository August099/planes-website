import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getExpensesSummary } from "@/lib/admin-accounts";
import { ExpensesManager } from "@/components/admin/ExpensesManager";

export const dynamic = "force-dynamic";

// VA-173: gastos fijos de la web (nombre, monto, moneda, frecuencia, desde cuándo y notas), el tipo de
// cambio manual y el total mensual en pesos. Es de referencia: no factura ni paga nada.
export default async function AdminExpensesPage() {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");
  const [expenses, rates, summary] = await Promise.all([
    prisma.fixedExpense.findMany({ orderBy: [{ since: "asc" }, { name: "asc" }] }),
    prisma.exchangeRate.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 5 }),
    getExpensesSummary(),
  ]);
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Gastos fijos</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Lo que cuesta mantener la web por mes, para compararlo con los ingresos de las suscripciones. Es solo de referencia:
          no factura ni paga nada.
        </p>
      </div>
      <ExpensesManager
        expenses={expenses.map((e) => ({
          id: e.id,
          name: e.name,
          amount: Number(e.amount),
          currency: e.currency as "ARS" | "USD",
          frequency: e.frequency,
          since: e.since.toISOString().slice(0, 10),
          notes: e.notes ?? "",
        }))}
        rates={rates.map((r) => ({ id: r.id, usdToArs: Number(r.usdToArs), date: r.date.toISOString().slice(0, 10) }))}
        summary={{ monthlyArs: summary.monthlyArs, missingRate: summary.missingRate, revenueThisMonth: summary.revenueThisMonth, covered: summary.covered }}
      />
    </div>
  );
}
