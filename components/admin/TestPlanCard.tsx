"use client";

import { useState } from "react";
import { saveTestPlanAction } from "@/app/actions/admin-plans-actions";
import type { TestPlan } from "@/lib/test-plan";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

// 27/10 (socio): plan de prueba aparte de la grilla (lib/test-plan.ts). Publicado: aparece al pie de /plans
// y se puede pagar; borrador: no se ve ni se compra.
export function TestPlanCard({ initial }: { initial: TestPlan | null }) {
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);
  const [price, setPrice] = useState(String(initial?.price ?? 100));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (nextActive: boolean) => {
    setSaving(true);
    setMessage(null);
    const res = await saveTestPlanAction({ isActive: nextActive, price: Number(price) });
    setSaving(false);
    if (!res.ok) return setMessage({ ok: false, text: res.error });
    setIsActive(nextActive);
    setMessage({ ok: true, text: nextActive ? "Publicado: aparece al pie de /plans." : "Guardado como borrador: no se ve en /plans." });
  };

  return (
    <section className="space-y-3 rounded-lg border border-dashed border-[#001F58]/30 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={LABEL}>Plan de prueba</p>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Pago único para probar el cobro y la factura. No da cupo ni beneficios. Está fuera de la grilla.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {isActive ? "Publicado" : "Borrador"}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Precio (AR$)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums"
          />
        </label>

        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-[#001F58]">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            disabled={saving}
            onClick={() => save(!isActive)}
            className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${isActive ? "bg-emerald-600" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isActive ? "left-[22px]" : "left-0.5"}`} />
          </button>
          Mostrar en /plans
        </label>

        <button
          type="button"
          disabled={saving}
          onClick={() => save(isActive)}
          className="min-h-10 rounded-md border border-[#001F58]/20 px-3 text-sm font-semibold text-[#001F58] hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
        >
          Guardar precio
        </button>
      </div>

      {message && <p className={`text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>}
    </section>
  );
}
