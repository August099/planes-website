"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminSummaryAction } from "@/app/actions/admin-expenses-actions";

// VA-173: en el resumen del admin, cuántas cuentas hay de cada tipo (con lo nuevo del mes y el link a
// /admin/users filtrado) y la cobertura de los gastos fijos con los ingresos de suscripciones del mes.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUM = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const NAMES: Record<string, string> = { base: "Base", pro: "Pro", broker: "Broker", admin: "Admin", cortesia: "Cortesías" };

type Summary = NonNullable<Awaited<ReturnType<typeof getAdminSummaryAction>>>;

export function AccountsSummary() {
  const [data, setData] = useState<Summary | null>(null);
  useEffect(() => {
    let alive = true;
    getAdminSummaryAction()
      .then((r) => alive && setData(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!data) return null;
  const { accounts, expenses } = data;
  const pct = expenses.monthlyArs > 0 ? Math.round((expenses.revenueThisMonth / expenses.monthlyArs) * 100) : null;

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-label="Cuentas y gastos fijos">
      <div className="rounded-lg border border-[#001F58]/12 bg-white p-4">
        <p className={LABEL}>Cuentas por tipo</p>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {accounts.rows.map((r) => (
            <li key={r.type}>
              <Link href={`/admin/users?plan=${r.type}`} className="block rounded-md border border-slate-200 p-3 hover:border-[#001F58]/40">
                <span className="block text-xs text-slate-600">{NAMES[r.type]}</span>
                <span className="block text-2xl font-bold tabular-nums text-[#001F58]">{NUM.format(r.count)}</span>
                <span className="block text-[11px] text-slate-500">+{NUM.format(r.newThisMonth)} este mes</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-600">
          Broker: {accounts.brokerByOption.aircraft} aviones ilimitados · {accounts.brokerByOption.parts} repuestos ilimitados · {accounts.brokerByOption.both} ambos
        </p>
      </div>
      <Link
        href="/admin/expenses"
        className={`block rounded-lg border p-4 ${expenses.monthlyArs === 0 ? "border-[#001F58]/12 bg-white" : expenses.covered ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}
      >
        <p className={LABEL}>Cobertura de gastos fijos</p>
        <p className={`mt-1 text-2xl font-bold ${expenses.monthlyArs === 0 ? "text-[#001F58]" : expenses.covered ? "text-emerald-800" : "text-red-700"}`}>
          {pct === null ? "Sin gastos cargados" : `${pct} %`}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Suscripciones del mes AR$ {NUM.format(expenses.revenueThisMonth)} contra gastos AR$ {NUM.format(expenses.monthlyArs)} por mes.
          {expenses.missingRate && " Falta el tipo de cambio."}
        </p>
      </Link>
    </section>
  );
}
