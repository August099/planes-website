"use client";

import { useEffect, useState } from "react";
import { getSalesStatsAction, type SalesPeriod } from "@/app/actions/sale-actions";
import type { SalesStats, SalesTotals } from "@/lib/sales";

// VA-183: ventas del período, en dólares (los repuestos en pesos se convierten con el dólar oficial del día
// de la venta). "Gracias a VA" = el vendedor respondió que sí; "sin respuesta" = cerró la ventana.

const NUM = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const PERIODS: { key: SalesPeriod; label: string }[] = [
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
  { key: "12m", label: "12 meses" },
  { key: "all", label: "Todo" },
];

function Column({ title, t }: { title: string; t: SalesTotals }) {
  return (
    <div className="space-y-2 rounded-lg border border-[#001F58]/12 bg-white p-4">
      <p className="text-sm font-bold text-[#001F58]">{title}</p>
      <p className="text-2xl font-bold tabular-nums text-[#001F58]">
        {NUM.format(t.count)} <span className="text-sm font-semibold text-slate-500">ventas · US$ {NUM.format(t.usd)}</span>
      </p>
      <p className="text-sm tabular-nums text-slate-700">
        Gracias a VA: <strong>{NUM.format(t.viaVA.count)}</strong> · US$ {NUM.format(t.viaVA.usd)}
      </p>
      <p className="text-xs tabular-nums text-slate-500">
        Sin respuesta: {NUM.format(t.unanswered)}
        {t.withoutPrice > 0 && ` · sin precio: ${NUM.format(t.withoutPrice)}`}
      </p>
    </div>
  );
}

export function SalesSummary() {
  const [period, setPeriod] = useState<SalesPeriod>("30d");
  const [data, setData] = useState<SalesStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getSalesStatsAction(period)
      .then((r) => {
        if (!alive) return;
        setData(r);
        setFailed(!r);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [period]);

  return (
    <section className="space-y-3" aria-labelledby="ventas-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ventas-title" className="text-lg font-bold text-[#001F58]">
          Ventas
        </h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Período de las ventas">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={`min-h-9 rounded-md border px-3 text-xs font-semibold cursor-pointer ${period === p.key ? "border-[#001F58] bg-[#001F58] text-white" : "border-[#001F58]/20 text-[#001F58] hover:bg-slate-50"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {failed && <p className="text-sm text-red-700">No se pudieron cargar las ventas.</p>}
      {!data && !failed && <p className="text-sm text-slate-500">Cargando ventas…</p>}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Column title="Aviones" t={data.aircraft} />
            <Column title="Repuestos" t={data.parts} />
          </div>
          {data.aircraft.count + data.parts.count === 0 && <p className="text-sm text-slate-500">No hubo ventas en este período.</p>}
          {data.fallbackRate && <p className="text-xs text-slate-500">Algunas ventas viejas en pesos no tenían cotización guardada: se convirtieron con la de hoy (AR$ {NUM.format(data.fallbackRate)}).</p>}
        </>
      )}
    </section>
  );
}
