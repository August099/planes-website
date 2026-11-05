import type { Leg } from "@/lib/aero/route";

// VA-191: tramos con rumbos, viento y tiempo. En una lista, para que se lea igual en el celular.
const heading = (n: number | null) => (n === null ? "—" : `${String(Math.round(n) % 360).padStart(3, "0")}°`);
const duration = (hours: number | null) => {
  if (hours === null) return "—";
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")} min`;
};
const legName = (p: Leg["from"]) => p.icao ?? (p.kind === "COORD" ? p.name : p.code);

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="font-semibold tabular-nums text-[#00205B]">{value}</dd>
    </div>
  );
}

export function LegList({ legs, renderWind }: { legs: Leg[]; renderWind?: (index: number) => React.ReactNode }) {
  return (
    <ol className="mt-2 divide-y divide-[#00205B]/10">
      {legs.map((l, i) => (
        <li key={i} className="py-3">
          <p className="text-sm font-bold text-[#00205B]">
            {legName(l.from)} a {legName(l.to)}
          </p>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
            <Fact label="Distancia" value={`${l.distanceNm.toFixed(0)} NM`} />
            <Fact label="Rumbo verdadero" value={heading(l.trueCourse)} />
            <Fact label="Rumbo magnético" value={heading(l.magneticCourse)} />
            <Fact label="Declinación" value={`${Math.abs(l.declination).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}° ${l.declination < 0 ? "W" : "E"}`} />
            <Fact label="Deriva" value={l.windCorrection === null ? "—" : `${l.windCorrection >= 0 ? "+" : ""}${l.windCorrection.toFixed(0)}°`} />
            <Fact label="Proa magnética" value={heading(l.magneticHeading)} />
            <Fact label="Velocidad sobre tierra" value={l.groundSpeed === null ? "—" : `${l.groundSpeed.toFixed(0)} kt`} />
            <Fact label="Tiempo" value={duration(l.hours)} />
          </dl>
          {renderWind?.(i)}
        </li>
      ))}
    </ol>
  );
}
