import type { LucideIcon } from "lucide-react";

// VA-170: datos clave grandes del detalle de un Broker (4 a 6 tarjetas con ícono). Es un resumen extra:
// la ficha completa sigue abajo igual que en el detalle común. Si un dato no está, su tarjeta no se ve.
export type BigFact = { icon: LucideIcon; label: string; value: string | null | undefined };

export function BigFacts({ facts, accent }: { facts: BigFact[]; accent: string }) {
  const shown = facts.filter((f) => f.value).slice(0, 6);
  if (shown.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-2.5">
      {shown.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-md border-l-2 bg-slate-50 px-3 py-2.5" style={{ borderLeftColor: accent }}>
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden />
            {label}
          </dt>
          <dd className="mt-0.5 text-base font-bold tabular-nums text-[#00205B]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
