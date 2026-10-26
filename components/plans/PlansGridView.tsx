"use client";

import { useState, type ReactNode } from "react";
import { Check, Minus } from "lucide-react";
import {
  brokerOptionFor,
  cellFor,
  formatArs,
  GRID_COLUMN_LABEL,
  type BrokerOption,
  type GridCell,
  type GridColumn,
  type GridPlan,
  type PlansGrid,
} from "@/lib/plan-grid";

// VA-166: la grilla de planes de los socios. Escritorio: tabla tipo ficha técnica (filas = qué incluye,
// columnas = Base, Pro y Broker / Empresa). Celular: una placa por plan con las mismas filas, sin scroll
// lateral. La columna Broker tiene dos interruptores que eligen su opción y cambian en vivo el precio y
// los cupos. La usan /plans y la vista previa del admin (renderAction arma el botón de cada plan).

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const count = (n: number | null, one: string, many: string) => `${n ?? 0} ${n === 1 ? one : many}`;
const NUMBERS: Record<GridColumn, string> = { BASE: "01", PRO: "02", BROKER: "03" };

export type BrokerPick = { aircraft: boolean; parts: boolean };

type Props = {
  grid: PlansGrid;
  /** Botón de cada columna (null = sin botón). */
  renderAction?: (column: GridColumn, plan: GridPlan) => ReactNode;
  initialBrokerPick?: BrokerPick;
};

function Cell({ cell }: { cell: GridCell | null }) {
  if (!cell) return <span className="text-slate-400">—</span>;
  if (cell.kind === "no") return <Minus className="h-4 w-4 text-slate-300" aria-label="No incluye" />;
  if (cell.kind === "yes")
    return (
      <span className="inline-flex items-start gap-1.5">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D62828]" aria-label="Incluye" />
        {cell.text && <span className="text-slate-700">{cell.text}</span>}
      </span>
    );
  return <span className="font-medium tabular-nums text-[#00205B]">{cell.text}</span>;
}

function PriceBlock({ column, plan }: { column: GridColumn; plan: GridPlan | null }) {
  if (column === "BASE") {
    return (
      <div className="space-y-1">
        <p className="font-heading text-3xl font-bold text-[#00205B]">Gratis</p>
        <p className="text-xs text-slate-500">Para siempre, en todas las cuentas.</p>
      </div>
    );
  }
  if (!plan) return <p className="font-heading text-2xl font-bold text-[#00205B]">Muy pronto</p>;
  return (
    <div className="space-y-1">
      <p className={`${LABEL} !text-[#D62828]`}>Promo de lanzamiento</p>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-heading text-3xl font-bold tabular-nums text-[#00205B]">{formatArs(plan.price)}</span>
        <span className="text-sm text-slate-500">/ mes</span>
      </p>
      {plan.listPrice !== null && plan.listPrice > plan.price && (
        <p className="text-sm tabular-nums text-slate-400 line-through" aria-label={`Antes ${formatArs(plan.listPrice)}`}>
          {formatArs(plan.listPrice)}
        </p>
      )}
    </div>
  );
}

function BrokerSwitches({ pick, onChange, available }: { pick: BrokerPick; onChange: (p: BrokerPick) => void; available: (p: BrokerPick) => boolean }) {
  const items = [
    ["aircraft", "Aviones ilimitados"],
    ["parts", "Repuestos ilimitados"],
  ] as const;
  return (
    <fieldset className="space-y-1.5">
      <legend className="sr-only">Qué querés ilimitado</legend>
      {items.map(([key, label]) => {
        const next = { ...pick, [key]: !pick[key] };
        // Al menos uno prendido, y solo opciones que existen.
        const disabled = !next.aircraft && !next.parts ? true : !available(next);
        return (
          <label key={key} className={`flex min-h-10 items-center justify-between gap-3 text-sm ${disabled ? "opacity-60" : "cursor-pointer"}`}>
            <span className="font-medium text-[#00205B]">{label}</span>
            <span className="relative inline-flex">
              <input
                type="checkbox"
                role="switch"
                checked={pick[key]}
                disabled={disabled}
                onChange={() => onChange(next)}
                className="peer sr-only"
              />
              <span className="h-6 w-10 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#00205B] peer-focus-visible:ring-2 peer-focus-visible:ring-[#00205B]/40" />
              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function PlansGridView({ grid, renderAction, initialBrokerPick }: Props) {
  const firstAvailable: BrokerPick = grid.broker.both
    ? { aircraft: true, parts: true }
    : grid.broker.aircraft
      ? { aircraft: true, parts: false }
      : { aircraft: false, parts: true };
  const [pick, setPick] = useState<BrokerPick>(initialBrokerPick ?? firstAvailable);
  const option: BrokerOption | null = brokerOptionFor(pick);
  const broker = option ? grid.broker[option] : null;
  const hasBroker = !!(grid.broker.aircraft || grid.broker.parts || grid.broker.both);
  const available = (p: BrokerPick) => {
    const o = brokerOptionFor(p);
    return !!o && !!grid.broker[o];
  };

  const plans: Record<GridColumn, GridPlan | null> = { BASE: grid.base, PRO: grid.pro, BROKER: broker };
  const header = (column: GridColumn) => (
    <div className="space-y-4">
      <p className={LABEL}>
        {NUMBERS[column]} <span className="text-[#D62828]">{"//"}</span> {GRID_COLUMN_LABEL[column]}
      </p>
      <PriceBlock column={column} plan={column === "BROKER" && !hasBroker ? null : plans[column]} />
      {column === "BROKER" && hasBroker && <BrokerSwitches pick={pick} onChange={setPick} available={available} />}
    </div>
  );
  const action = (column: GridColumn) => {
    const plan = plans[column];
    return plan && renderAction ? renderAction(column, plan) : null;
  };
  const columns: GridColumn[] = ["BASE", "PRO", "BROKER"];

  return (
    <>
      {/* Escritorio: tabla */}
      <div className="hidden overflow-hidden rounded-lg border border-[#00205B]/12 bg-white md:block">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Planes y qué incluye cada uno</caption>
          <colgroup>
            <col className="w-[28%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr className="align-top">
              <th scope="col" className="border-b border-[#00205B]/10 p-5 text-left">
                <span className={LABEL}>Qué incluye</span>
              </th>
              {columns.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className={`border-b border-l border-[#00205B]/10 p-5 text-left font-normal ${c === "PRO" ? "border-t-2 border-t-[#D62828]" : ""} ${c === "BROKER" ? "bg-[#00205B]/[0.02]" : ""}`}
                >
                  {header(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#00205B]/10">
            {grid.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className="px-5 py-3 text-left font-medium text-slate-600">
                  {row.label}
                </th>
                {columns.map((c) => (
                  <td key={c} className={`border-l border-[#00205B]/10 px-5 py-3 ${c === "BROKER" ? "bg-[#00205B]/[0.02]" : ""}`}>
                    <Cell cell={cellFor(row, c, plans[c])} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {renderAction && (
            <tfoot>
              <tr>
                <td className="border-t border-[#00205B]/10 p-5" />
                {columns.map((c) => (
                  <td key={c} className={`border-l border-t border-[#00205B]/10 p-5 align-top ${c === "BROKER" ? "bg-[#00205B]/[0.02]" : ""}`}>
                    {action(c)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Celular: una placa por plan */}
      <div className="space-y-4 md:hidden">
        {columns.map((c) => (
          <section
            key={c}
            aria-label={GRID_COLUMN_LABEL[c]}
            className={`rounded-lg border border-[#00205B]/12 bg-white ${c === "PRO" ? "border-t-2 border-t-[#D62828]" : ""}`}
          >
            <div className="border-b border-[#00205B]/10 p-5">{header(c)}</div>
            <dl className="divide-y divide-[#00205B]/10 text-sm">
              {grid.rows.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <dt className="text-slate-600">{row.label}</dt>
                  <dd className="max-w-[55%] text-right">
                    <Cell cell={cellFor(row, c, plans[c])} />
                  </dd>
                </div>
              ))}
            </dl>
            {renderAction && plans[c] && <div className="border-t border-[#00205B]/10 p-5">{action(c)}</div>}
          </section>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        * Broker / Empresa: lo que no elegís ilimitado tiene el cupo de Base ({count(grid.base.aircraft, "avión", "aviones")} y {count(grid.base.parts, "repuesto", "repuestos")}).
      </p>
    </>
  );
}
