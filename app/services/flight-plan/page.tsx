import { aeroStatus } from "@/lib/aero/import";

// VA-191: mientras se construye, muestra qué datos hay cargados y su vigencia. El flujo en 5 pasos va acá.
export const dynamic = "force-dynamic";

const LABEL = { MADHEL: "Aeródromos y helipuertos (MADHEL)", LAD: "Lugares aptos denunciados (LAD)" } as const;
const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "sin fecha");

export default async function FlightPlanPage() {
  const status = await aeroStatus();
  return (
    <section aria-labelledby="fp-status" className="max-w-2xl">
      <h2 id="fp-status" className="font-heading text-lg font-bold text-[#00205B]">
        En preparación
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">Acá va a estar el plan de vuelo guiado. Por ahora se pueden revisar los datos aeronáuticos cargados.</p>
      <dl className="mt-5 divide-y divide-[#00205B]/10 rounded-lg border border-[#00205B]/12 bg-white text-sm">
        {status.map((s) => (
          <div key={s.dataset} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
            <dt className="font-medium text-[#00205B]">{LABEL[s.dataset]}</dt>
            <dd className="tabular-nums text-slate-600">{s.lastApplied ? `${s.count} registros · vigencia ${date(s.lastApplied.sourceDate)}` : "Todavía sin cargar"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
