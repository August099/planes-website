"use client";

import { useState } from "react";
import {
  ARGENTINA_UTC_OFFSET,
  KMH_PER_KT,
  KM_PER_NM,
  distanceFrom,
  formatDuration,
  parseClock,
  parseDuration,
  runwayToHeading,
  shiftClock,
  speedFrom,
  timeHours,
  topOfDescent,
  trueToMagnetic,
  windComponents,
  windTriangle,
} from "@/lib/aero/formulas";
import { CalcLayout, Facts, NumberField, ResultPanel, Segmented, Warning, fmt, fmtHeading, num, useFields, useUnit } from "./shared";

const SPEED_UNITS = [
  { value: "kt", label: "kt" },
  { value: "kmh", label: "km/h" },
] as const;
const speedLabel = (u: "kt" | "kmh") => (u === "kt" ? "kt" : "km/h");
const toKt = (v: number, u: "kt" | "kmh") => (u === "kt" ? v : v / KMH_PER_KT);
const fromKt = (v: number, u: "kt" | "kmh") => (u === "kt" ? v : v * KMH_PER_KT);

function RunwayDiagram({ runwayHeading, windDirection }: { runwayHeading: number; windDirection: number }) {
  // La pista siempre vertical, con el umbral de la derecha abajo; el viento, relativo a ella.
  const angle = windDirection - runwayHeading;
  return (
    <svg viewBox="0 0 160 160" className="mx-auto h-36 w-36" role="img" aria-label={`Viento a ${fmt(((angle % 360) + 360) % 360)} grados de la pista`}>
      <rect x="66" y="20" width="28" height="120" rx="2" fill="#00205B" />
      <line x1="80" y1="30" x2="80" y2="130" stroke="#fff" strokeWidth="2" strokeDasharray="8 7" />
      <g transform={`rotate(${angle} 80 80)`}>
        <line x1="80" y1="8" x2="80" y2="46" stroke="#D62828" strokeWidth="4" strokeLinecap="round" />
        <path d="M71 37 L80 50 L89 37 Z" fill="#D62828" />
      </g>
    </svg>
  );
}

export function CrosswindCalculator() {
  const { fields, set } = useFields(["dir", "speed", "gust", "rwy", "limit"] as const);
  const [unit, setUnit] = useUnit("speed", ["kt", "kmh"] as const, "kt");
  const dir = num(fields.dir);
  const speed = num(fields.speed);
  const gust = num(fields.gust);
  const rwy = num(fields.rwy);
  const limit = num(fields.limit);
  const valid = dir !== null && speed !== null && rwy !== null && dir >= 0 && dir <= 360 && speed >= 0 && rwy > 0 && rwy <= 360;
  const heading = valid ? runwayToHeading(rwy) : 0;
  const c = valid ? windComponents(dir, speed, heading) : null;
  const g = valid && gust !== null ? windComponents(dir, gust, heading) : null;
  const worst = g ? g.crosswind : c?.crosswind;
  return (
    <CalcLayout
      units={<Segmented label="Unidad de velocidad" value={unit} options={SPEED_UNITS} onChange={setUnit} />}
      inputs={
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Dirección del viento" value={fields.dir} onChange={(v) => set("dir", v)} suffix="°" integer placeholder="210" />
          <NumberField label="Pista o rumbo" value={fields.rwy} onChange={(v) => set("rwy", v)} integer placeholder="18" hint="18 es la pista 18; desde 37, grados" />
          <NumberField label="Velocidad" value={fields.speed} onChange={(v) => set("speed", v)} suffix={speedLabel(unit)} placeholder="15" />
          <NumberField label="Ráfagas (opcional)" value={fields.gust} onChange={(v) => set("gust", v)} suffix={speedLabel(unit)} />
          <div className="col-span-2">
            <NumberField label="Límite demostrado de tu avión (opcional)" value={fields.limit} onChange={(v) => set("limit", v)} suffix={speedLabel(unit)} hint="Figura en el manual de vuelo." />
          </div>
        </div>
      }
      result={
        <ResultPanel label="Viento cruzado" empty="Cargá el viento y la pista." headline={c ? fmt(c.crosswind) : null} unit={c ? `${speedLabel(unit)}${c.crossSide ? `, desde la ${c.crossSide}` : ""}` : undefined}>
          {c && (
            <>
              <Facts
                rows={[
                  { label: c.headwind >= 0 ? "De frente" : "De cola", value: `${fmt(Math.abs(c.headwind))} ${speedLabel(unit)}` },
                  ...(g ? [{ label: "Cruzado con ráfagas", value: `${fmt(g.crosswind)} ${speedLabel(unit)}` }] : []),
                ]}
              />
              <RunwayDiagram runwayHeading={heading} windDirection={dir!} />
              {limit !== null && worst !== undefined && worst > limit && <Warning>Supera el límite demostrado que cargaste ({fmt(limit)} {speedLabel(unit)}).</Warning>}
              {c.headwind < 0 && <Warning>Tenés viento de cola en esta pista.</Warning>}
              <p className="mt-2 text-xs text-slate-500">El METAR da el viento respecto del norte verdadero y la pista es magnética: usá el mismo referente.</p>
            </>
          )}
        </ResultPanel>
      }
    />
  );
}

export function WindTriangleCalculator() {
  const { fields, set } = useFields(["tas", "course", "dir", "speed", "decl"] as const);
  const [unit, setUnit] = useUnit("speed", ["kt", "kmh"] as const, "kt");
  const tas = num(fields.tas);
  const course = num(fields.course);
  const dir = num(fields.dir);
  const speed = num(fields.speed);
  const decl = num(fields.decl);
  const filled = tas !== null && course !== null && dir !== null && speed !== null;
  const r = filled ? windTriangle(toKt(tas, unit), course, dir, toKt(speed, unit)) : null;
  return (
    <CalcLayout
      units={<Segmented label="Unidad de velocidad" value={unit} options={SPEED_UNITS} onChange={setUnit} />}
      inputs={
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Velocidad verdadera (TAS)" value={fields.tas} onChange={(v) => set("tas", v)} suffix={speedLabel(unit)} placeholder="110" />
          <NumberField label="Derrota verdadera" value={fields.course} onChange={(v) => set("course", v)} suffix="°" integer placeholder="090" />
          <NumberField label="Viento: dirección" value={fields.dir} onChange={(v) => set("dir", v)} suffix="°" integer placeholder="360" hint="De donde viene, verdadero." />
          <NumberField label="Viento: velocidad" value={fields.speed} onChange={(v) => set("speed", v)} suffix={speedLabel(unit)} placeholder="20" />
          <div className="col-span-2">
            <NumberField label="Declinación magnética (opcional)" value={fields.decl} onChange={(v) => set("decl", v)} suffix="°" hint="Este en positivo, Oeste en negativo. En Argentina suele ser Oeste." />
          </div>
        </div>
      }
      result={
        <ResultPanel label="Rumbo verdadero" empty={filled ? "Con este viento no se puede mantener la derrota: es más fuerte que tu velocidad." : "Cargá velocidad, derrota y viento."} headline={r ? `${fmtHeading(r.trueHeading)}°` : null}>
          {r && (
            <Facts
              rows={[
                { label: "Velocidad sobre tierra (GS)", value: `${fmt(fromKt(r.groundSpeed, unit))} ${speedLabel(unit)}` },
                { label: "Deriva a corregir", value: `${fmt(Math.abs(r.windCorrection), 1)}° a la ${r.windCorrection >= 0 ? "derecha" : "izquierda"}` },
                { label: r.headwind >= 0 ? "Componente de frente" : "Componente de cola", value: `${fmt(Math.abs(fromKt(r.headwind, unit)))} ${speedLabel(unit)}` },
                ...(decl !== null ? [{ label: "Rumbo magnético", value: `${fmtHeading(trueToMagnetic(r.trueHeading, decl))}°` }] : []),
              ]}
            />
          )}
        </ResultPanel>
      }
    />
  );
}

export function TimeSpeedDistanceCalculator() {
  const { fields, set } = useFields(["dist", "speed", "time"] as const);
  const [unit, setUnit] = useUnit("distance", ["nm", "km"] as const, "nm");
  const distanceUnit = unit === "nm" ? "NM" : "km";
  const speedUnit = unit === "nm" ? "kt" : "km/h";
  const dist = num(fields.dist);
  const speed = num(fields.speed);
  const hours = fields.time.trim() ? parseDuration(fields.time) : null;
  const filled = [dist, speed, hours].filter((v) => v !== null).length;

  let headline: string | null = null;
  let label = "Resultado";
  if (filled === 3) {
    label = "Sobran datos";
  } else if (filled === 2) {
    if (hours === null) {
      const t = timeHours(dist!, speed!);
      label = "Tiempo";
      headline = t === null ? null : formatDuration(t);
    } else if (dist === null) {
      label = `Distancia (${distanceUnit})`;
      headline = fmt(distanceFrom(speed!, hours), 1);
    } else {
      const s = speedFrom(dist, hours);
      label = `Velocidad (${speedUnit})`;
      headline = s === null ? null : fmt(s);
    }
  }
  return (
    <CalcLayout
      units={
        <Segmented
          label="Unidades"
          value={unit}
          options={[
            { value: "nm", label: "NM y kt" },
            { value: "km", label: "km y km/h" },
          ]}
          onChange={setUnit}
        />
      }
      inputs={
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Cargá dos valores y dejá vacío el que querés calcular.</p>
          <NumberField label="Distancia" value={fields.dist} onChange={(v) => set("dist", v)} suffix={distanceUnit} placeholder="150" />
          <NumberField label="Velocidad sobre tierra" value={fields.speed} onChange={(v) => set("speed", v)} suffix={speedUnit} placeholder="110" />
          <NumberField label="Tiempo" value={fields.time} onChange={(v) => set("time", v)} text placeholder="1:30" hint="Como 1:30, o en minutos, como 90." />
        </div>
      }
      result={<ResultPanel label={label} empty={filled === 3 ? "Dejá vacío el valor que querés calcular." : "Faltan datos: cargá dos de los tres."} headline={headline} />}
    />
  );
}

export function TopOfDescentCalculator() {
  const { fields, set } = useFields(["from", "to", "gs", "rate"] as const);
  const [unit, setUnit] = useUnit("speed", ["kt", "kmh"] as const, "kt");
  const from = num(fields.from);
  const to = num(fields.to);
  const gs = num(fields.gs);
  const rate = num(fields.rate);
  const d = from !== null && to !== null && gs !== null && rate !== null ? topOfDescent(from, to, toKt(gs, unit), rate) : null;
  return (
    <CalcLayout
      units={<Segmented label="Unidad de velocidad" value={unit} options={SPEED_UNITS} onChange={setUnit} />}
      inputs={
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Altitud de crucero" value={fields.from} onChange={(v) => set("from", v)} suffix="ft" integer placeholder="8000" />
          <NumberField label="Altitud final" value={fields.to} onChange={(v) => set("to", v)} suffix="ft" integer placeholder="2000" hint="Por ejemplo, la de circuito." />
          <NumberField label="Velocidad sobre tierra" value={fields.gs} onChange={(v) => set("gs", v)} suffix={speedLabel(unit)} placeholder="120" />
          <NumberField label="Régimen de descenso" value={fields.rate} onChange={(v) => set("rate", v)} suffix="ft/min" integer placeholder="500" />
        </div>
      }
      result={
        <ResultPanel label="Empezar a bajar a" empty="Cargá altitudes, velocidad y régimen. La altitud final tiene que ser menor." headline={d ? fmt(unit === "kt" ? d.distanceNm : d.distanceNm * KM_PER_NM, 1) : null} unit={unit === "kt" ? "NM" : "km"}>
          {d && (
            <Facts
              rows={[
                { label: "Tiempo de descenso", value: formatDuration(d.minutes / 60) },
                { label: "Altitud a perder", value: `${fmt(d.altitudeToLose)} ft` },
                { label: "Ángulo resultante", value: `${fmt(d.angleDeg, 1)}°` },
                { label: "Para una senda de 3°", value: `${fmt(d.rateFor3Deg)} ft/min, ${fmt(unit === "kt" ? d.distanceFor3Deg : d.distanceFor3Deg * KM_PER_NM, 1)} ${unit === "kt" ? "NM" : "km"}` },
              ]}
            />
          )}
        </ResultPanel>
      }
    />
  );
}

export function LocalUtcCalculator() {
  const { fields, set } = useFields(["time"] as const);
  const [direction, setDirection] = useState<"toUtc" | "toLocal">("toUtc");
  const minutes = parseClock(fields.time);
  const result = minutes === null ? null : shiftClock(minutes, direction === "toUtc" ? -ARGENTINA_UTC_OFFSET : ARGENTINA_UTC_OFFSET);
  const dayText = !result || result.dayShift === 0 ? null : result.dayShift > 0 ? "del día siguiente" : "del día anterior";
  return (
    <CalcLayout
      units={
        <Segmented
          label="Sentido de la conversión"
          value={direction}
          options={[
            { value: "toUtc", label: "Local a UTC" },
            { value: "toLocal", label: "UTC a local" },
          ]}
          onChange={setDirection}
        />
      }
      inputs={<NumberField label={direction === "toUtc" ? "Hora argentina" : "Hora UTC"} value={fields.time} onChange={(v) => set("time", v)} integer placeholder="1430" hint="Con o sin dos puntos: 1430 o 14:30." />}
      result={
        <ResultPanel label={direction === "toUtc" ? "Hora UTC" : "Hora argentina"} empty="Cargá una hora válida, de 0000 a 2359." headline={result ? `${result.hhmm}${direction === "toUtc" ? "Z" : ""}` : null}>
          {result && (
            <>
              {dayText && <p className="text-sm font-semibold text-[#00205B]">{dayText}</p>}
              <p className="mt-1 text-xs text-slate-500">Argentina usa UTC−3 todo el año.</p>
            </>
          )}
        </ResultPanel>
      }
    />
  );
}
