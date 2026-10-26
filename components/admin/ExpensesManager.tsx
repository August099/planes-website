"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { addExchangeRateAction, deleteExpenseAction, saveExpenseAction, type ExpenseInput } from "@/app/actions/admin-expenses-actions";

// VA-173: lista de gastos fijos (agregar, editar y quitar), el tipo de cambio manual con fecha y el total
// mensual en pesos con la cobertura (ingresos de suscripciones del mes contra gastos fijos).

type Expense = { id: string; name: string; amount: number; currency: "ARS" | "USD"; frequency: "MONTHLY" | "YEARLY"; since: string; notes: string };
type Rate = { id: string; usdToArs: number; date: string };
type Summary = { monthlyArs: number; missingRate: boolean; revenueThisMonth: number; covered: boolean };

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const NUM = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const money = (n: number, c: string) => `${c === "USD" ? "US$" : "AR$"} ${NUM.format(n)}`;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: ExpenseInput = { name: "", amount: "", currency: "ARS", frequency: "MONTHLY", since: today(), notes: "" };

export function ExpensesManager({ expenses, rates, summary }: { expenses: Expense[]; rates: Rate[]; summary: Summary }) {
  const router = useRouter();
  const [form, setForm] = useState<ExpenseInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [rate, setRate] = useState({ usdToArs: "", date: today() });
  const [rateError, setRateError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await saveExpenseAction(form);
    setPending(false);
    if (!res.ok) return setError(res.error);
    setForm(EMPTY);
    router.refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Quitar este gasto de la lista?")) return;
    await deleteExpenseAction(id);
    router.refresh();
  };
  const saveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateError(null);
    const res = await addExchangeRateAction(rate);
    if (!res.ok) return setRateError(res.error);
    setRate({ usdToArs: "", date: today() });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#001F58]/12 bg-white p-4">
          <p className={LABEL}>Gastos fijos por mes</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#001F58]">{money(summary.monthlyArs, "ARS")}</p>
          {summary.missingRate && <p className="mt-1 text-xs text-amber-700">Falta el tipo de cambio: los gastos en dólares no se suman.</p>}
        </div>
        <div className="rounded-lg border border-[#001F58]/12 bg-white p-4">
          <p className={LABEL}>Suscripciones cobradas este mes</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#001F58]">{money(summary.revenueThisMonth, "ARS")}</p>
        </div>
        <div className={`rounded-lg border p-4 ${summary.covered ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
          <p className={LABEL}>Cobertura</p>
          <p className={`mt-1 text-2xl font-bold ${summary.covered ? "text-emerald-800" : "text-red-700"}`}>
            {summary.monthlyArs > 0 ? `${Math.round((summary.revenueThisMonth / summary.monthlyArs) * 100)} %` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-600">{summary.covered ? "Los ingresos cubren los gastos fijos." : "Los ingresos todavía no cubren los gastos fijos."}</p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-[#001F58]/12 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-[#001F58]/10 text-left">
            <tr className={LABEL}>
              <th className="px-4 py-3 font-semibold">Gasto</th>
              <th className="px-4 py-3 text-right font-semibold">Monto</th>
              <th className="px-4 py-3 font-semibold">Frecuencia</th>
              <th className="px-4 py-3 font-semibold">Desde</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Todavía no cargaste gastos.</td>
              </tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#001F58]">{e.name}</p>
                  {e.notes && <p className="text-xs text-slate-500">{e.notes}</p>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{money(e.amount, e.currency)}</td>
                <td className="px-4 py-3 text-slate-600">{e.frequency === "YEARLY" ? "Anual" : "Mensual"}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{e.since.split("-").reverse().join("/")}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" aria-label={`Editar ${e.name}`} onClick={() => setForm({ ...e, amount: String(e.amount) })} className="p-1.5 text-slate-500 hover:text-[#001F58] cursor-pointer"><Pencil className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Quitar ${e.name}`} onClick={() => remove(e.id)} className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form onSubmit={save} className="space-y-3 rounded-lg border border-[#001F58]/12 bg-white p-4 sm:p-5">
        <p className={LABEL}>{form.id ? "Editar gasto" : "Agregar gasto"}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Nombre</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Vercel Pro" className={INPUT} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Monto</span>
            <input type="number" min="0" step="0.01" value={String(form.amount ?? "")} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={INPUT} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Moneda</span>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "ARS" | "USD" })} className={INPUT}>
              <option value="ARS">Pesos (ARS)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Frecuencia</span>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as "MONTHLY" | "YEARLY" })} className={INPUT}>
              <option value="MONTHLY">Mensual</option>
              <option value="YEARLY">Anual</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Desde</span>
            <input type="date" value={String(form.since)} onChange={(e) => setForm({ ...form, since: e.target.value })} className={INPUT} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Notas (opcional)</span>
            <input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={INPUT} />
          </label>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="min-h-10 rounded-md bg-[#001F58] px-4 text-sm font-bold text-white hover:bg-[#00133A] disabled:opacity-60 cursor-pointer">
            {form.id ? "Guardar cambios" : "Agregar"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(EMPTY)} className="min-h-10 rounded-md border border-[#001F58]/20 px-4 text-sm font-semibold text-[#001F58] cursor-pointer">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <form onSubmit={saveRate} className="space-y-3 rounded-lg border border-[#001F58]/12 bg-white p-4 sm:p-5">
        <p className={LABEL}>Tipo de cambio (para los gastos en dólares)</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">1 US$ =</span>
            <input type="number" min="0" step="0.01" value={rate.usdToArs} onChange={(e) => setRate({ ...rate, usdToArs: e.target.value })} placeholder="AR$" className={INPUT} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Fecha</span>
            <input type="date" value={rate.date} onChange={(e) => setRate({ ...rate, date: e.target.value })} className={INPUT} />
          </label>
          <button type="submit" className="min-h-10 rounded-md border border-[#001F58]/20 px-4 text-sm font-semibold text-[#001F58] hover:bg-slate-50 cursor-pointer">Guardar</button>
        </div>
        {rateError && <p className="text-sm text-red-700">{rateError}</p>}
        {rates.length > 0 && (
          <ul className="text-sm text-slate-600">
            {rates.map((r, i) => (
              <li key={r.id} className={i === 0 ? "font-semibold text-[#001F58]" : ""}>
                {r.date.split("-").reverse().join("/")}: AR$ {NUM.format(r.usdToArs)} {i === 0 && "(el que se usa)"}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
}
