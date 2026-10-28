"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PlansGridView } from "@/components/plans/PlansGridView";
import { savePlanGridAction } from "@/app/actions/admin-plans-actions";
import {
  formatArs,
  GRID_COLUMN_LABEL,
  METRICS_LABEL,
  VA_PAGE_LABEL,
  type GridCell,
  type GridColumn,
  type GridPlan,
  type GridRow,
  type Metrics,
  type PlansGrid,
  type VaPage,
} from "@/lib/plan-grid";
import type { GridBenefits, GridDraft } from "@/lib/plan-grid-rules";

// VA-166: la grilla de /plans, editable en su lugar. Cada celda se edita donde está (número, ✓ / ✗ o
// texto corto). Las filas de sistema (con candado) mueven la lógica (cupos, republicaciones, métricas,
// verificado, destacadas y Página VA) y no se borran; las propias son de marketing. Antes de guardar se
// listan los cambios ("Pro pasa de 10 a 12 repuestos activos") y se puede ver la vista previa de /plans.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm tabular-nums";
const COLUMNS: GridColumn[] = ["BASE", "PRO", "BROKER"];
const METRICS: Metrics[] = ["BASIC", "PRO", "FULL"];
const VA_PAGES: VaPage[] = ["NONE", "BANNER", "FULL"];

type Ids = { base: string; pro: string | null; brokerAircraft: string | null; brokerParts: string | null; brokerBoth: string | null };

function benefitsOf(p: GridPlan): GridBenefits {
  return { verified: p.verified, featured: p.featured, vaPage: p.vaPage, customDetail: p.customDetail, metrics: p.metrics };
}

/** Del estado de la base al borrador editable. */
export function draftFromGrid(grid: PlansGrid): GridDraft {
  const one = grid.broker.aircraft ?? grid.broker.parts;
  const both = grid.broker.both;
  const anyBroker = one ?? both;
  return {
    base: { aircraft: grid.base.aircraft ?? 0, parts: grid.base.parts ?? 0, republishesPerYear: grid.base.republishesPerYear, ...benefitsOf(grid.base) },
    pro: grid.pro
      ? { price: grid.pro.price, listPrice: grid.pro.listPrice, isActive: grid.pro.isActive, aircraft: grid.pro.aircraft ?? 0, parts: grid.pro.parts ?? 0, republishesPerYear: grid.pro.republishesPerYear, ...benefitsOf(grid.pro) }
      : null,
    broker: anyBroker
      ? {
          priceOne: one?.price ?? 0,
          listOne: one?.listPrice ?? null,
          priceBoth: both?.price ?? 0,
          listBoth: both?.listPrice ?? null,
          isActive: anyBroker.isActive,
          republishAllEveryDays: anyBroker.republishAllEveryDays ?? 30,
          ...benefitsOf(anyBroker),
        }
      : null,
    rows: grid.rows.map((r) => ({ ...r, cells: { ...r.cells } })),
  };
}

/** Del borrador a la grilla que se ve en /plans (vista previa). */
function gridFromDraft(d: GridDraft, ids: Ids): PlansGrid {
  const pick = (b: GridBenefits): GridBenefits => ({ verified: b.verified, featured: b.featured, vaPage: b.vaPage, customDetail: b.customDetail, metrics: b.metrics });
  const base: GridPlan = { id: ids.base, name: "Base", price: 0, listPrice: null, isActive: true, aircraft: d.base.aircraft, parts: d.base.parts, republishesPerYear: d.base.republishesPerYear, republishAllEveryDays: null, ...pick(d.base) };
  const pro: GridPlan | null = d.pro && ids.pro ? { id: ids.pro, name: "Pro", listPrice: d.pro.listPrice, price: d.pro.price, isActive: d.pro.isActive, aircraft: d.pro.aircraft, parts: d.pro.parts, republishesPerYear: d.pro.republishesPerYear, republishAllEveryDays: null, ...pick(d.pro) } : null;
  const broker = (id: string | null, a: boolean, r: boolean): GridPlan | null =>
    d.broker && id
      ? {
          id,
          name: "Broker",
          price: a && r ? d.broker.priceBoth : d.broker.priceOne,
          listPrice: a && r ? d.broker.listBoth : d.broker.listOne,
          isActive: d.broker.isActive,
          aircraft: a ? null : d.base.aircraft,
          parts: r ? null : d.base.parts,
          republishesPerYear: 0,
          republishAllEveryDays: d.broker.republishAllEveryDays,
          ...pick(d.broker),
        }
      : null;
  return { base, pro, broker: { aircraft: broker(ids.brokerAircraft, true, false), parts: broker(ids.brokerParts, false, true), both: broker(ids.brokerBoth, true, true) }, rows: d.rows };
}

/** "Pro pasa de 10 a 12 repuestos activos", uno por cambio. */
function describeChanges(a: GridDraft, b: GridDraft): string[] {
  const out: string[] = [];
  const num = (who: string, what: string, x: number | null | undefined, y: number | null | undefined, fmt = (n: number) => String(n)) => {
    if ((x ?? null) !== (y ?? null)) out.push(`${who} pasa de ${x == null ? "—" : fmt(x)} a ${y == null ? "—" : fmt(y)} ${what}`);
  };
  const flags = (who: string, x: GridBenefits, y: GridBenefits) => {
    if (x.verified !== y.verified) out.push(`${who}: usuario verificado ${y.verified ? "sí" : "no"}`);
    if (x.featured !== y.featured) out.push(`${who}: destacadas ${y.featured ? "sí" : "no"}`);
    if (x.vaPage !== y.vaPage) out.push(`${who}: ${VA_PAGE_LABEL[x.vaPage]} → ${VA_PAGE_LABEL[y.vaPage]}`);
    if (x.customDetail !== y.customDetail) out.push(`${who}: detalles personalizados ${y.customDetail ? "sí" : "no"}`);
    if (x.metrics !== y.metrics) out.push(`${who}: métricas ${METRICS_LABEL[x.metrics]} → ${METRICS_LABEL[y.metrics]}`);
  };
  num("Base", "aviones activos", a.base.aircraft, b.base.aircraft);
  num("Base", "repuestos activos", a.base.parts, b.base.parts);
  num("Base", "republicaciones por año", a.base.republishesPerYear, b.base.republishesPerYear);
  flags("Base", a.base, b.base);
  if (a.pro && b.pro) {
    num("Pro", "de precio real", a.pro.price, b.pro.price, formatArs);
    num("Pro", "de precio tachado", a.pro.listPrice, b.pro.listPrice, formatArs);
    num("Pro", "aviones activos", a.pro.aircraft, b.pro.aircraft);
    num("Pro", "repuestos activos", a.pro.parts, b.pro.parts);
    num("Pro", "republicaciones por año", a.pro.republishesPerYear, b.pro.republishesPerYear);
    if (a.pro.isActive !== b.pro.isActive) out.push(`Pro ${b.pro.isActive ? "pasa a estar a la venta" : "pasa a \"Muy pronto\""} en /plans`);
    flags("Pro", a.pro, b.pro);
  }
  if (a.broker && b.broker) {
    num("Broker (un rubro)", "de precio real", a.broker.priceOne, b.broker.priceOne, formatArs);
    num("Broker (un rubro)", "de precio tachado", a.broker.listOne, b.broker.listOne, formatArs);
    num("Broker (ambos)", "de precio real", a.broker.priceBoth, b.broker.priceBoth, formatArs);
    num("Broker (ambos)", "de precio tachado", a.broker.listBoth, b.broker.listBoth, formatArs);
    num("Broker", "días entre \"Republicar todas\"", a.broker.republishAllEveryDays, b.broker.republishAllEveryDays);
    if (a.broker.isActive !== b.broker.isActive) out.push(`Broker ${b.broker.isActive ? "pasa a estar a la venta" : "pasa a \"Muy pronto\""} en /plans`);
    flags("Broker", a.broker, b.broker);
  }
  const rowsA = JSON.stringify(a.rows);
  if (rowsA !== JSON.stringify(b.rows)) out.push("Cambian las filas de la grilla (nombres, orden o celdas propias)");
  return out;
}

const priceChanged = (a: GridDraft, b: GridDraft) =>
  (a.pro?.price ?? 0) !== (b.pro?.price ?? 0) || (a.broker?.priceOne ?? 0) !== (b.broker?.priceOne ?? 0) || (a.broker?.priceBoth ?? 0) !== (b.broker?.priceBoth ?? 0);

function NumberInput({ value, onChange, label, nullable = false }: { value: number | null; onChange: (n: number | null) => void; label: string; nullable?: boolean }) {
  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      aria-label={label}
      value={value ?? ""}
      placeholder={nullable ? "—" : "0"}
      onChange={(e) => onChange(e.target.value === "" ? (nullable ? null : 0) : Number(e.target.value))}
      className={INPUT}
    />
  );
}

function Toggle({ checked, onChange, label, on = "✓ Sí", off = "✗ No" }: { checked: boolean; onChange: (v: boolean) => void; label: string; on?: string; off?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#001F58]" aria-label={label} />
      <span className={checked ? "font-medium text-[#001F58]" : "text-slate-500"}>{checked ? on : off}</span>
    </label>
  );
}

export function PlanGridEditor({ initial, ids, subscribers }: { initial: PlansGrid; ids: Ids; subscribers: Record<string, number> }) {
  const router = useRouter();
  const original = useMemo(() => draftFromGrid(initial), [initial]);
  const [draft, setDraft] = useState<GridDraft>(original);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const changes = describeChanges(original, draft);
  const affected = (ids.pro ? subscribers[ids.pro] ?? 0 : 0) + [ids.brokerAircraft, ids.brokerParts, ids.brokerBoth].reduce((n, id) => n + (id ? subscribers[id] ?? 0 : 0), 0);

  const set = <K extends keyof GridDraft>(key: K, value: GridDraft[K]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const setBase = (patch: Partial<GridDraft["base"]>) => set("base", { ...draft.base, ...patch });
  const setPro = (patch: Partial<NonNullable<GridDraft["pro"]>>) => draft.pro && set("pro", { ...draft.pro, ...patch });
  const setBroker = (patch: Partial<NonNullable<GridDraft["broker"]>>) => draft.broker && set("broker", { ...draft.broker, ...patch });
  const benefitsSetter = (c: GridColumn) => (c === "BASE" ? setBase : c === "PRO" ? setPro : setBroker) as (p: Partial<GridBenefits>) => void;
  const benefits = (c: GridColumn): GridBenefits | null => (c === "BASE" ? draft.base : c === "PRO" ? draft.pro : draft.broker);

  const setRows = (rows: GridRow[]) => set("rows", rows);
  const moveRow = (i: number, delta: number) => {
    const rows = [...draft.rows];
    const j = i + delta;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    setRows(rows);
  };
  const updateRow = (i: number, patch: Partial<GridRow>) => setRows(draft.rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const updateCell = (i: number, c: GridColumn, cell: GridCell) => updateRow(i, { cells: { ...draft.rows[i].cells, [c]: cell } });
  const addRow = () =>
    setRows([...draft.rows, { id: `new-${Date.now()}`, label: "Fila nueva", systemKey: null, cells: { BASE: { kind: "no" }, PRO: { kind: "yes" }, BROKER: { kind: "yes" } } }]);

  const save = async (confirmPrice = false) => {
    setPending(true);
    setError(null);
    const res = await savePlanGridAction(draft, { confirmPrice });
    setPending(false);
    if (!res.ok) {
      if (res.needsPriceConfirm) setConfirm(true);
      setError(res.error);
      return;
    }
    setConfirm(false);
    setSaved(true);
    router.refresh();
  };

  // Celdas de las filas de sistema.
  const systemCell = (key: NonNullable<GridRow["systemKey"]>, c: GridColumn) => {
    const b = benefits(c);
    if (!b) return <span className="text-slate-400">—</span>;
    const setB = benefitsSetter(c);
    switch (key) {
      case "aircraft":
      case "parts": {
        const field = key === "aircraft" ? "aircraft" : "parts";
        if (c === "BROKER") return <span className="text-xs text-slate-500">Sin límite* o el cupo de Base</span>;
        const value = c === "BASE" ? draft.base[field] : draft.pro![field];
        return <NumberInput label={`${GRID_COLUMN_LABEL[c]}: ${key === "aircraft" ? "aviones" : "repuestos"} activos`} value={value} onChange={(n) => (c === "BASE" ? setBase({ [field]: n ?? 0 }) : setPro({ [field]: n ?? 0 }))} />;
      }
      case "total":
        if (c === "BROKER") return <span className="text-xs text-slate-500">Sin límite*</span>;
        return <span className="tabular-nums text-slate-600">{c === "BASE" ? draft.base.aircraft + draft.base.parts : draft.pro!.aircraft + draft.pro!.parts} (suma)</span>;
      case "republish":
        if (c === "BROKER")
          return (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              Todas, cada
              <div className="w-16"><NumberInput label="Broker: días entre Republicar todas" value={draft.broker!.republishAllEveryDays} onChange={(n) => setBroker({ republishAllEveryDays: n ?? 30 })} /></div>
              días
            </div>
          );
        return (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-16">
              <NumberInput label={`${GRID_COLUMN_LABEL[c]}: republicaciones por año`} value={c === "BASE" ? draft.base.republishesPerYear : draft.pro!.republishesPerYear} onChange={(n) => (c === "BASE" ? setBase({ republishesPerYear: n ?? 0 }) : setPro({ republishesPerYear: n ?? 0 }))} />
            </div>
            por año
          </div>
        );
      case "metrics":
        return (
          <select aria-label={`${GRID_COLUMN_LABEL[c]}: métricas`} value={b.metrics} onChange={(e) => setB({ metrics: e.target.value as Metrics })} className={INPUT}>
            {METRICS.map((m) => <option key={m} value={m}>{METRICS_LABEL[m]}</option>)}
          </select>
        );
      case "verified":
        return <Toggle label={`${GRID_COLUMN_LABEL[c]}: usuario verificado`} checked={b.verified} onChange={(v) => setB({ verified: v })} />;
      case "featured":
        return <Toggle label={`${GRID_COLUMN_LABEL[c]}: destacadas`} checked={b.featured} onChange={(v) => setB({ featured: v })} />;
      case "branding":
        return (
          <div className="space-y-1.5">
            <select aria-label={`${GRID_COLUMN_LABEL[c]}: Página personalizada`} value={b.vaPage} onChange={(e) => setB({ vaPage: e.target.value as VaPage })} className={INPUT}>
              {VA_PAGES.map((v) => <option key={v} value={v}>{VA_PAGE_LABEL[v]}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={b.customDetail} onChange={(e) => setB({ customDetail: e.target.checked })} className="h-3.5 w-3.5 accent-[#001F58]" />
              Detalles personalizados
            </label>
          </div>
        );
    }
  };

  const customCell = (i: number, c: GridColumn) => {
    const cell = draft.rows[i].cells[c] ?? { kind: "no" as const };
    return (
      <div className="space-y-1.5">
        <select aria-label={`${draft.rows[i].label}: ${GRID_COLUMN_LABEL[c]}`} value={cell.kind} onChange={(e) => updateCell(i, c, { ...cell, kind: e.target.value as GridCell["kind"] })} className={INPUT}>
          <option value="yes">✓ Sí</option>
          <option value="no">✗ No</option>
          <option value="text">Texto</option>
        </select>
        {cell.kind !== "no" && (
          <input
            type="text"
            maxLength={60}
            placeholder={cell.kind === "yes" ? "Aclaración (opcional)" : "Texto corto"}
            value={cell.text ?? ""}
            onChange={(e) => updateCell(i, c, { ...cell, text: e.target.value })}
            className={INPUT}
          />
        )}
      </div>
    );
  };

  const priceInputs = (label: string, price: number, list: number | null, onPrice: (n: number) => void, onList: (n: number | null) => void) => (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-0.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Real</span>
          <NumberInput label={`${label}: precio real`} value={price} onChange={(n) => onPrice(n ?? 0)} />
        </label>
        <label className="space-y-0.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Tachado</span>
          <NumberInput label={`${label}: precio tachado`} value={list} nullable onChange={onList} />
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-[#001F58]/12 bg-white">
        <table className="w-full min-w-[860px] table-fixed text-sm">
          <thead>
            <tr className="align-top">
              <th className="w-[24%] border-b border-[#001F58]/10 p-3 text-left">
                <span className={LABEL}>Fila</span>
              </th>
              {COLUMNS.map((c) => (
                <th key={c} className="border-b border-l border-[#001F58]/10 p-3 text-left font-normal">
                  <p className={LABEL}>{GRID_COLUMN_LABEL[c]}</p>
                  {c === "BASE" && <p className="mt-2 text-sm text-slate-600">Gratis · todas las cuentas</p>}
                  {c === "PRO" &&
                    (draft.pro ? (
                      <div className="mt-2 space-y-2">
                        {priceInputs("Precio por mes", draft.pro.price, draft.pro.listPrice, (n) => setPro({ price: n }), (n) => setPro({ listPrice: n }))}
                        <Toggle label="Pro a la venta en /plans" on="A la venta" off="Muy pronto (sin precio ni botón)" checked={draft.pro.isActive} onChange={(v) => setPro({ isActive: v })} />
                        <p className="text-xs text-slate-500">{ids.pro ? subscribers[ids.pro] ?? 0 : 0} suscriptores</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-amber-700">Falta el plan: correr scripts/va166-migrate-data.ts</p>
                    ))}
                  {c === "BROKER" &&
                    (draft.broker ? (
                      <div className="mt-2 space-y-2">
                        {priceInputs("Un rubro ilimitado", draft.broker.priceOne, draft.broker.listOne, (n) => setBroker({ priceOne: n }), (n) => setBroker({ listOne: n }))}
                        {priceInputs("Ambos ilimitados", draft.broker.priceBoth, draft.broker.listBoth, (n) => setBroker({ priceBoth: n }), (n) => setBroker({ listBoth: n }))}
                        <Toggle label="Broker a la venta en /plans" on="A la venta" off="Muy pronto (sin precio ni botón)" checked={draft.broker.isActive} onChange={(v) => setBroker({ isActive: v })} />
                        <p className="text-xs text-slate-500">
                          {[ids.brokerAircraft, ids.brokerParts, ids.brokerBoth].reduce((n, id) => n + (id ? subscribers[id] ?? 0 : 0), 0)} suscriptores
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-amber-700">Faltan los planes: correr scripts/va166-migrate-data.ts</p>
                    ))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#001F58]/10">
            {draft.rows.map((row, i) => (
              <tr key={row.id} className="align-top">
                <td className="p-3">
                  <div className="flex items-start gap-1.5">
                    <div className="flex flex-col">
                      <button type="button" aria-label={`Subir ${row.label}`} disabled={i === 0} onClick={() => moveRow(i, -1)} className="p-1 text-slate-500 hover:text-[#001F58] disabled:opacity-30 cursor-pointer">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" aria-label={`Bajar ${row.label}`} disabled={i === draft.rows.length - 1} onClick={() => moveRow(i, 1)} className="p-1 text-slate-500 hover:text-[#001F58] disabled:opacity-30 cursor-pointer">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input type="text" maxLength={60} aria-label="Nombre de la fila" value={row.label} onChange={(e) => updateRow(i, { label: e.target.value })} className={INPUT} />
                    {row.systemKey ? (
                      <span title="Mueve la lógica del sistema: no se puede quitar" className="p-1.5 text-[#001F58]">
                        <Lock className="h-4 w-4" aria-label="Fila del sistema" />
                      </span>
                    ) : (
                      <button type="button" aria-label={`Quitar ${row.label}`} onClick={() => setRows(draft.rows.filter((_, k) => k !== i))} className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
                {COLUMNS.map((c) => (
                  <td key={c} className="border-l border-[#001F58]/10 p-3">
                    {row.systemKey ? systemCell(row.systemKey, c) : customCell(i, c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={addRow} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#001F58]/20 px-3 text-sm font-semibold text-[#001F58] hover:bg-slate-50 cursor-pointer">
          <Plus className="h-4 w-4" /> Agregar fila de texto
        </button>
        <button type="button" onClick={() => setPreview(!preview)} className="inline-flex min-h-10 items-center rounded-md border border-[#001F58]/20 px-3 text-sm font-semibold text-[#001F58] hover:bg-slate-50 cursor-pointer">
          {preview ? "Ocultar vista previa" : "Vista previa de /plans"}
        </button>
        <p className="text-xs text-slate-500">
          <Lock className="mr-1 inline h-3 w-3" aria-hidden /> Filas del sistema: cambian lo que puede hacer cada cuenta.
        </p>
      </div>

      {changes.length > 0 && (
        <section className="rounded-lg border border-[#001F58]/12 bg-white p-4">
          <p className={LABEL}>Lo que cambia al guardar</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {changes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          {priceChanged(original, draft) && (
            <p className="mt-3 border-l-2 border-[#E70F1F] pl-3 text-sm text-slate-700">
              Cambia un precio real: vale para los cobros siguientes de {affected} suscriptor{affected === 1 ? "" : "es"} y hay que avisarles.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" disabled={pending} onClick={() => (priceChanged(original, draft) && affected > 0 ? setConfirm(true) : save())} className="min-h-10 rounded-md bg-[#001F58] px-4 text-sm font-bold text-white hover:bg-[#00133A] disabled:opacity-60 cursor-pointer">
              {pending ? "Guardando…" : "Guardar la grilla"}
            </button>
            <button type="button" disabled={pending} onClick={() => { setDraft(original); setError(null); }} className="min-h-10 rounded-md border border-[#001F58]/20 px-4 text-sm font-semibold text-[#001F58] hover:bg-slate-50 cursor-pointer">
              Descartar cambios
            </button>
            {error && !confirm && <p className="text-xs text-red-700">{error}</p>}
          </div>
        </section>
      )}
      {saved && changes.length === 0 && <p className="text-sm font-medium text-[#001F58]">Grilla guardada: /plans ya muestra los cambios.</p>}

      {preview && (
        <section className="space-y-2 rounded-lg border border-dashed border-[#001F58]/25 p-4">
          <p className={LABEL}>Vista previa · así se ve en /plans</p>
          <PlansGridView grid={gridFromDraft(draft, ids)} />
        </section>
      )}

      <ConfirmDialog
        open={confirm}
        title="Cambiar un precio"
        eyebrow="Planes"
        confirmLabel="Guardar igual"
        cancelLabel="Volver"
        requireText="CONFIRMAR"
        pending={pending}
        error={error}
        onClose={() => setConfirm(false)}
        onConfirm={() => save(true)}
      >
        <p className="text-sm text-slate-600">
          El precio nuevo vale para los cobros siguientes de <strong>{affected}</strong> suscriptor{affected === 1 ? "" : "es"}. Avisales antes del próximo cobro.
        </p>
      </ConfirmDialog>
    </div>
  );
}
