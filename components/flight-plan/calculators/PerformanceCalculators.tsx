"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AVGAS_KG_PER_L,
  HPA_PER_INHG,
  KG_PER_LB,
  KMH_PER_KT,
  KM_PER_NM,
  L_PER_US_GAL,
  MPH_PER_KT,
  M_PER_FT,
  cToF,
  costPerHour,
  densityAltitude,
  fToC,
  fuelNeeded,
  parseDuration,
  weightAndBalance,
} from "@/lib/aero/formulas";
import { PlacePicker } from "@/components/flight-plan/PlacePicker";
import { useWeather } from "@/components/flight-plan/WeatherSummary";
import { BalanceProfiles } from "@/components/flight-plan/calculators/BalanceProfiles";
import { isRecentMetar } from "@/lib/aero/metar";
import { CalcLayout, Facts, NumberField, ResultPanel, Segmented, Warning, fmt, num, useFields, useUnit } from "./shared";

export function DensityAltitudeCalculator() {
  const { fields, set } = useFields(["elev", "qnh", "temp"] as const);
  const [altUnit, setAltUnit] = useUnit("altitude", ["ft", "m"] as const, "ft");
  const [pressureUnit, setPressureUnit] = useUnit("pressure", ["hpa", "inhg"] as const, "hpa");
  const [tempUnit, setTempUnit] = useUnit("temperature", ["c", "f"] as const, "c");
  const [station, setStation] = useState<string | null>(null);
  const weather = useWeather(station);
  const metar = weather.data?.metar && isRecentMetar(weather.data.metar.obsTime) ? weather.data.metar : null;
  const useMetar = () => {
    if (typeof metar?.altim === "number") set("qnh", pressureUnit === "hpa" ? String(Math.round(metar.altim)) : (metar.altim / HPA_PER_INHG).toFixed(2));
    if (typeof metar?.temp === "number") set("temp", String(tempUnit === "c" ? metar.temp : Math.round(cToF(metar.temp))));
  };
  const elev = num(fields.elev);
  const qnh = num(fields.qnh);
  const temp = num(fields.temp);
  const elevationFt = elev === null ? null : altUnit === "ft" ? elev : elev / M_PER_FT;
  const qnhHpa = qnh === null ? null : pressureUnit === "hpa" ? qnh : qnh * HPA_PER_INHG;
  const tempC = temp === null ? null : tempUnit === "c" ? temp : fToC(temp);
  const validRange = qnhHpa !== null && qnhHpa > 800 && qnhHpa < 1100;
  const r = elevationFt !== null && validRange && tempC !== null ? densityAltitude(elevationFt, qnhHpa, tempC) : null;
  const alt = (ft: number) => `${fmt(altUnit === "ft" ? ft : ft * M_PER_FT)} ${altUnit}`;
  return (
    <CalcLayout
      units={
        <>
          <Segmented label="Altura" value={altUnit} options={[{ value: "ft", label: "ft" }, { value: "m", label: "m" }]} onChange={setAltUnit} />
          <Segmented label="Presión" value={pressureUnit} options={[{ value: "hpa", label: "hPa" }, { value: "inhg", label: "inHg" }]} onChange={setPressureUnit} />
          <Segmented label="Temperatura" value={tempUnit} options={[{ value: "c", label: "°C" }, { value: "f", label: "°F" }]} onChange={setTempUnit} />
        </>
      }
      inputs={
        <div className="space-y-3">
          <PlacePicker
            label="Aeródromo (opcional)"
            hint="Completa la elevación con el dato oficial."
            onPick={(p) => {
              if (p.elevationM !== null) set("elev", String(Math.round(altUnit === "ft" ? p.elevationM / M_PER_FT : p.elevationM)));
              setStation(p.icao);
            }}
          />
          {metar && (
            <button type="button" onClick={useMetar} className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-[#00205B]/25 bg-white px-4 text-sm font-bold text-[#00205B] hover:bg-slate-50">
              Usar datos del METAR actual
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Elevación" value={fields.elev} onChange={(v) => set("elev", v)} suffix={altUnit} integer placeholder="2000" />
            <NumberField label="QNH" value={fields.qnh} onChange={(v) => set("qnh", v)} suffix={pressureUnit === "hpa" ? "hPa" : "inHg"} placeholder={pressureUnit === "hpa" ? "1013" : "29,92"} />
            <NumberField label="Temperatura" value={fields.temp} onChange={(v) => set("temp", v)} suffix={tempUnit === "c" ? "°C" : "°F"} placeholder="30" />
          </div>
        </div>
      }
      result={
        <ResultPanel label="Altitud de densidad" empty={qnhHpa !== null && !validRange ? "Revisá el QNH: está fuera de un rango razonable." : "Cargá elevación, QNH y temperatura."} headline={r ? alt(r.densityAltitude) : null}>
          {r && (
            <>
              <Facts
                rows={[
                  { label: "Altitud de presión", value: alt(r.pressureAltitude) },
                  { label: "Temperatura ISA", value: tempUnit === "c" ? `${fmt(r.isaTemp, 1)} °C` : `${fmt(cToF(r.isaTemp), 1)} °F` },
                  { label: "Diferencia con ISA", value: `${r.isaDeviation >= 0 ? "+" : ""}${fmt(r.isaDeviation, 1)} °C` },
                ]}
              />
              <p className="mt-3 text-sm text-slate-700">La performance de tu avión será como si estuvieras a {alt(r.densityAltitude)}. Calculada para aire seco: con humedad, un poco peor.</p>
            </>
          )}
        </ResultPanel>
      }
    />
  );
}

export function FuelCalculator() {
  const { fields, set } = useFields(["time", "burn", "taxi", "reserve"] as const);
  const [unit, setUnit] = useUnit("fuel", ["l", "gal"] as const, "l");
  const [reserveKind, setReserveKind] = useUnit("fuelReserve", ["minutes", "percent"] as const, "minutes");
  const hours = fields.time.trim() ? parseDuration(fields.time) : null;
  const burn = num(fields.burn);
  const taxi = num(fields.taxi) ?? 0;
  const reserve = num(fields.reserve);
  const name = unit === "l" ? "L" : "gal";
  const other = (n: number) => (unit === "l" ? `${fmt(n / L_PER_US_GAL, 1)} gal` : `${fmt(n * L_PER_US_GAL, 1)} L`);
  const r = hours !== null && burn !== null && reserve !== null ? fuelNeeded({ hours, perHour: burn, taxi, reserve: { kind: reserveKind, value: reserve } }) : null;
  return (
    <CalcLayout
      units={<Segmented label="Unidad de combustible" value={unit} options={[{ value: "l", label: "Litros" }, { value: "gal", label: "Galones US" }]} onChange={setUnit} />}
      inputs={
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Tiempo de vuelo" value={fields.time} onChange={(v) => set("time", v)} text placeholder="2:15" hint="Como 2:15, o en minutos." />
            <NumberField label="Consumo" value={fields.burn} onChange={(v) => set("burn", v)} suffix={`${name}/h`} placeholder="40" />
            <NumberField label="Rodaje (opcional)" value={fields.taxi} onChange={(v) => set("taxi", v)} suffix={name} placeholder="5" />
            <NumberField label="Reserva" value={fields.reserve} onChange={(v) => set("reserve", v)} suffix={reserveKind === "minutes" ? "min" : "%"} />
          </div>
          <Segmented label="Tipo de reserva" value={reserveKind} options={[{ value: "minutes", label: "En minutos" }, { value: "percent", label: "En porcentaje" }]} onChange={setReserveKind} />
          <p className="text-xs text-slate-500">Cargá tu reserva y verificá la reglamentación vigente y el manual de tu aeronave: acá no hay valores por defecto.</p>
        </div>
      }
      result={
        <ResultPanel label="Combustible total" empty="Cargá tiempo, consumo y reserva." headline={r ? fmt(r.total, 1) : null} unit={name}>
          {r && (
            <>
              <Facts
                rows={[
                  { label: "Vuelo", value: `${fmt(r.trip, 1)} ${name}` },
                  { label: "Rodaje", value: `${fmt(r.taxi, 1)} ${name}` },
                  { label: "Reserva", value: `${fmt(r.reserve, 1)} ${name}` },
                  { label: "Total en la otra unidad", value: other(r.total) },
                ]}
              />
            </>
          )}
        </ResultPanel>
      }
    />
  );
}

type Row = { id: number; name: string; weight: string; arm: string };

export function WeightBalanceCalculator() {
  const { fields, set } = useFields(["max", "fwd", "aft"] as const);
  const [unit, setUnit] = useUnit("weight", ["kg", "lb"] as const, "kg");
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: "Peso vacío", weight: "", arm: "" },
    { id: 2, name: "Piloto y pasajero", weight: "", arm: "" },
    { id: 3, name: "Combustible", weight: "", arm: "" },
    { id: 4, name: "Equipaje", weight: "", arm: "" },
  ]);
  const update = (id: number, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const load = rows.map((r) => ({ name: r.name, weight: num(r.weight), arm: num(r.arm) }));
  const complete = load.filter((r): r is { name: string; weight: number; arm: number } => r.weight !== null && r.arm !== null);
  const incomplete = load.some((r) => (r.weight === null) !== (r.arm === null));
  const result = complete.length > 0 ? weightAndBalance(complete) : null;
  const max = num(fields.max);
  const fwd = num(fields.fwd);
  const aft = num(fields.aft);
  return (
    <CalcLayout
      units={<Segmented label="Unidad de peso" value={unit} options={[{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]} onChange={setUnit} />}
      inputs={
        <div className="space-y-3">
          <BalanceProfiles
            current={{ unit, stations: rows.map(({ name, weight, arm }) => ({ name, weight, arm })), max: fields.max ?? "", fwd: fields.fwd ?? "", aft: fields.aft ?? "" }}
            onLoad={(b) => {
              setUnit(b.unit);
              setRows(b.stations.map((station, i) => ({ id: i + 1, ...station })));
              set("max", b.max);
              set("fwd", b.fwd);
              set("aft", b.aft);
            }}
          />
          <p className="text-sm text-slate-600">Cargá los pesos y brazos de tu manual de vuelo. Podés sumar o quitar estaciones.</p>
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-md border border-[#00205B]/12 bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input aria-label="Nombre de la estación" value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} className="min-h-11 flex-1 rounded-md border border-slate-300 px-3 text-base text-[#00205B]" />
                  <button type="button" aria-label={`Quitar ${r.name}`} onClick={() => setRows((l) => l.filter((x) => x.id !== r.id))} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#D62828] hover:bg-red-50">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Peso" value={r.weight} onChange={(v) => update(r.id, { weight: v })} suffix={unit} />
                  <NumberField label="Brazo" value={r.arm} onChange={(v) => update(r.id, { arm: v })} />
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setRows((l) => [...l, { id: Math.max(0, ...l.map((x) => x.id)) + 1, name: "Otra estación", weight: "", arm: "" }])} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-[#00205B]/25 px-4 text-sm font-bold text-[#00205B] hover:bg-slate-50">
            <Plus className="h-4 w-4" aria-hidden />
            Sumar estación
          </button>
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Peso máximo" value={fields.max} onChange={(v) => set("max", v)} suffix={unit} />
            <NumberField label="CG adelante" value={fields.fwd} onChange={(v) => set("fwd", v)} />
            <NumberField label="CG atrás" value={fields.aft} onChange={(v) => set("aft", v)} />
          </div>
          <p className="text-xs text-slate-500">Usá las mismas unidades de brazo en todo. Los límites pueden variar según el peso: mirá la envolvente de tu manual.</p>
        </div>
      }
      result={
        <ResultPanel label="Peso total" empty="Cargá peso y brazo de al menos una estación." headline={result ? fmt(result.weight, 1) : null} unit={unit}>
          {result && (
            <>
              <Facts
                rows={[
                  { label: "Momento", value: fmt(result.moment, 1) },
                  { label: "Centro de gravedad", value: result.cg === null ? "Sin dato" : fmt(result.cg, 3) },
                ]}
              />
              {max !== null && result.weight > max && <Warning>Excedido en peso: sobran {fmt(result.weight - max, 1)} {unit}.</Warning>}
              {result.cg !== null && fwd !== null && result.cg < fwd && <Warning>El centro de gravedad está por delante del límite que cargaste.</Warning>}
              {result.cg !== null && aft !== null && result.cg > aft && <Warning>El centro de gravedad está por detrás del límite que cargaste.</Warning>}
              {incomplete && <Warning>Hay estaciones con un solo dato: no se sumaron.</Warning>}
            </>
          )}
        </ResultPanel>
      }
    />
  );
}

const COST_KEYS = ["hangar", "insurance", "inspection", "other", "burn", "price", "oil", "engine", "engineTbo", "prop", "propTbo", "hours"] as const;
const HOURS_SCALE = [50, 100, 150, 200, 300];

/** Una sola serie, un solo tono: el título la nombra y cada punto dice su valor al pasar o tocar. La tabla lo dice en texto. */
function CostLine({ points }: { points: { hours: number; cost: number }[] }) {
  const W = 320;
  const H = 110;
  const pad = { l: 8, r: 8, t: 12, b: 20 };
  const max = Math.max(...points.map((p) => p.cost));
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1);
  const y = (cost: number) => pad.t + (1 - cost / max) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Costo por hora según las horas voladas por año; los valores están en la tabla.">
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#00205B" strokeOpacity="0.2" />
      <polyline fill="none" stroke="#00205B" strokeWidth="2" strokeLinejoin="round" points={points.map((p, i) => `${x(i)},${y(p.cost)}`).join(" ")} />
      {points.map((p, i) => (
        <g key={p.hours}>
          <circle cx={x(i)} cy={y(p.cost)} r="4" fill="#00205B" stroke="#fff" strokeWidth="2">
            <title>{`${p.hours} h por año: ${fmt(p.cost)} por hora`}</title>
          </circle>
          <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#475569">
            {p.hours}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function CostPerHourCalculator() {
  const { fields, set } = useFields(COST_KEYS);
  const n = (k: (typeof COST_KEYS)[number]) => num(fields[k]) ?? 0;
  const fixedPerYear = n("hangar") + n("insurance") + n("inspection") + n("other");
  const c = costPerHour({
    fixedPerYear,
    fuelPerHour: n("burn"),
    fuelPrice: n("price"),
    otherPerHour: n("oil"),
    engineOverhaul: n("engine"),
    engineTbo: n("engineTbo"),
    propOverhaul: n("prop"),
    propTbo: n("propTbo"),
    hoursPerYear: n("hours"),
  });
  const parts = [
    { label: "Fijos", value: c.fixedPerHour ?? 0 },
    { label: "Variables", value: c.variable },
    { label: "Reserva para recorrida", value: c.reserve },
  ];
  const biggest = Math.max(...parts.map((p) => p.value), 1);
  const scale = HOURS_SCALE.map((hours) => ({ hours, cost: c.at(hours) ?? 0 }));
  const field = (k: (typeof COST_KEYS)[number], label: string, suffix?: string, hint?: string) => <NumberField label={label} value={fields[k]} onChange={(v) => set(k, v)} suffix={suffix} hint={hint} />;
  return (
    <CalcLayout
      inputs={
        <div className="space-y-5">
          <p className="text-sm text-slate-600">Usá la misma moneda en todos los campos.</p>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-bold text-[#00205B]">Fijos por año</legend>
            <div className="grid grid-cols-2 gap-3">
              {field("hangar", "Hangar")}
              {field("insurance", "Seguro")}
              {field("inspection", "Anual e inspecciones")}
              {field("other", "Cuota y otros")}
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-bold text-[#00205B]">Variables por hora</legend>
            <div className="grid grid-cols-2 gap-3">
              {field("burn", "Consumo", "L/h")}
              {field("price", "Precio por litro")}
              <div className="col-span-2">{field("oil", "Aceite y mantenimiento por hora")}</div>
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-bold text-[#00205B]">Reserva para la recorrida</legend>
            <div className="grid grid-cols-2 gap-3">
              {field("engine", "Recorrida de motor")}
              {field("engineTbo", "TBO de motor", "h")}
              {field("prop", "Recorrida de hélice")}
              {field("propTbo", "TBO de hélice", "h")}
            </div>
          </fieldset>
          {field("hours", "Horas voladas por año", "h")}
        </div>
      }
      result={
        <ResultPanel label="Costo real por hora" empty="Cargá las horas por año y al menos un costo." headline={c.total !== null && c.total > 0 ? fmt(c.total) : null}>
          {c.total !== null && (
            <>
              <Facts rows={[{ label: "Costo total por año", value: fmt(c.annual) }]} />
              <ul className="mt-3 space-y-2 text-sm">
                {parts.map((p) => (
                  <li key={p.label}>
                    <span className="flex justify-between gap-3">
                      <span className="text-slate-600">{p.label}</span>
                      <span className="font-semibold tabular-nums text-[#00205B]">{fmt(p.value)}</span>
                    </span>
                    <span className="mt-1 block h-1.5 rounded-sm bg-[#00205B]/10">
                      <span className="block h-full rounded-sm bg-[#00205B]" style={{ width: `${(p.value / biggest) * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm font-semibold text-[#00205B]">Costo por hora según horas voladas por año</p>
              <CostLine points={scale} />
              <table className="mt-1 w-full text-sm">
                <thead className="sr-only">
                  <tr>
                    <th>Horas por año</th>
                    <th>Costo por hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00205B]/8">
                  {scale.map((p) => (
                    <tr key={p.hours}>
                      <td className="py-1 tabular-nums text-slate-600">{p.hours} h</td>
                      <td className="py-1 text-right font-semibold tabular-nums text-[#00205B]">{fmt(p.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </ResultPanel>
      }
    />
  );
}

type Magnitude = { key: string; label: string; units: { key: string; label: string; toBase: (v: number) => number; fromBase: (v: number) => number }[] };

const linear = (key: string, label: string, factor: number) => ({ key, label, toBase: (v: number) => v * factor, fromBase: (v: number) => v / factor });

const MAGNITUDES: Magnitude[] = [
  { key: "weight", label: "Peso", units: [linear("kg", "kg", 1), linear("lb", "lb", KG_PER_LB)] },
  { key: "volume", label: "Volumen", units: [linear("l", "litros", 1), linear("gal", "galones US", L_PER_US_GAL)] },
  { key: "speed", label: "Velocidad", units: [linear("kt", "nudos", 1), linear("kmh", "km/h", 1 / KMH_PER_KT), linear("mph", "mph", 1 / MPH_PER_KT)] },
  { key: "height", label: "Altura", units: [linear("ft", "pies", 1), linear("m", "metros", 1 / M_PER_FT)] },
  { key: "distance", label: "Distancia", units: [linear("nm", "millas náuticas", 1), linear("km", "km", 1 / KM_PER_NM)] },
  { key: "pressure", label: "Presión", units: [linear("hpa", "hPa", 1), linear("inhg", "inHg", HPA_PER_INHG)] },
  { key: "temperature", label: "Temperatura", units: [{ key: "c", label: "°C", toBase: (v) => v, fromBase: (v) => v }, { key: "f", label: "°F", toBase: fToC, fromBase: cToF }] },
];

export function UnitConverter() {
  const { fields, set } = useFields(["value", "density"] as const);
  const [magnitudeKey, setMagnitudeKey] = useUnit("converterMagnitude", MAGNITUDES.map((m) => m.key) as readonly string[], "weight");
  const magnitude = MAGNITUDES.find((m) => m.key === magnitudeKey) ?? MAGNITUDES[0];
  const [fromKey, setFromKey] = useState(magnitude.units[0].key);
  const from = magnitude.units.find((u) => u.key === fromKey) ?? magnitude.units[0];
  const value = num(fields.value);
  const base = value === null ? null : from.toBase(value);
  const digits = (n: number) => (Math.abs(n) >= 100 ? 1 : 2);
  const density = num(fields.density) ?? AVGAS_KG_PER_L;
  const liters = value === null ? null : magnitude.key === "volume" ? base : magnitude.key === "weight" ? base! / density : null;
  return (
    <div className="space-y-5">
      <div role="group" aria-label="Magnitud" className="flex flex-wrap gap-2">
        {MAGNITUDES.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={m.key === magnitude.key}
            onClick={() => {
              setMagnitudeKey(m.key);
              setFromKey(m.units[0].key);
            }}
            className={`min-h-11 cursor-pointer rounded-md border px-3 text-sm font-semibold transition-colors ${m.key === magnitude.key ? "border-[#00205B] bg-[#00205B] text-white" : "border-[#00205B]/20 bg-white text-[#00205B] hover:bg-slate-50"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-10">
        <div className="space-y-3">
          <Segmented label="Unidad de origen" value={from.key} options={magnitude.units.map((u) => ({ value: u.key, label: u.label }))} onChange={setFromKey} />
          <NumberField label={`Valor en ${from.label}`} value={fields.value} onChange={(v) => set("value", v)} />
        </div>
        <div className="rounded-lg border border-[#00205B]/15 bg-white p-4 shadow-sm" aria-live="polite">
          {base === null ? (
            <p className="text-sm text-slate-600">Cargá un valor.</p>
          ) : (
            <Facts rows={magnitude.units.filter((u) => u.key !== from.key).map((u) => ({ label: u.label, value: fmt(u.fromBase(base), digits(u.fromBase(base))) }))} />
          )}
        </div>
      </div>
      {(magnitude.key === "volume" || magnitude.key === "weight") && (
        <section aria-label="Combustible por peso" className="rounded-lg border border-[#00205B]/12 bg-white p-4">
          <h2 className="text-sm font-bold text-[#00205B]">Combustible: de litros a peso</h2>
          <div className="mt-3 grid items-end gap-4 sm:grid-cols-2">
            <NumberField label="Densidad" value={fields.density} onChange={(v) => set("density", v)} suffix="kg/L" placeholder={String(AVGAS_KG_PER_L).replace(".", ",")} hint="0,72 es un valor habitual de AVGAS; varía con la temperatura." />
            {liters !== null && liters !== undefined ? (
              <Facts
                rows={[
                  { label: "Litros", value: fmt(liters, 1) },
                  { label: "Kilos", value: fmt(liters * density, 1) },
                  { label: "Libras", value: fmt((liters * density) / KG_PER_LB, 1) },
                ]}
              />
            ) : (
              <p className="text-sm text-slate-600">Cargá un valor arriba.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
