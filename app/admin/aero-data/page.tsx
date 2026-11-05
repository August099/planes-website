import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";
import { aeroStatus } from "@/lib/aero/import";
import type { AeroDiff } from "@/lib/aero/records";
import { AeroCheckButton, AeroReportActions } from "./AeroDataControls";

export const metadata: Metadata = { title: "Datos aeronáuticos" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_LABEL = { MADHEL: "Aeródromos y helipuertos (MADHEL)", LAD: "Lugares aptos denunciados (LAD)", NAVAID: "Radioayudas", AIRSPACE: "Espacios aéreos" } as const;
const FIELD_LABEL: Record<string, string> = { kind: "Tipo", icao: "OACI", iata: "IATA", name: "Nombre", fir: "FIR", province: "Provincia", location: "Ubicación", lat: "Latitud", lng: "Longitud", elevationM: "Elevación (m)", condition: "Condición", runways: "Pistas", frequencies: "Frecuencias" };
const MAX_SHOWN = 200;

const date = (iso: string | Date | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "Sin fecha");

function List({ title, items }: { title: string; items: { code: string; name: string }[] }) {
  if (!items.length) return null;
  return (
    <details className="rounded-lg border border-[#001F58]/10 bg-white p-3">
      <summary className="cursor-pointer text-sm font-semibold text-[#001F58]">
        {title} ({items.length})
      </summary>
      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {items.slice(0, MAX_SHOWN).map((i) => (
          <li key={i.code}>
            <span className="font-mono text-xs">{i.code}</span> {i.name}
          </li>
        ))}
      </ul>
      {items.length > MAX_SHOWN && <p className="mt-2 text-xs text-slate-500">Se muestran los primeros {MAX_SHOWN}.</p>}
    </details>
  );
}

export default async function AeroDataPage() {
  if (!flightPlanEnabled()) notFound();
  const [status, reports, failed] = await Promise.all([
    aeroStatus(),
    prisma.aeroImport.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    prisma.aeroImport.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, dataset: true, error: true, createdAt: true } }),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-bold text-[#001F58]">Datos aeronáuticos</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Lo que usa Plan de vuelo. Cada actualización se revisa acá antes de publicarse; si no se aplica o algo falla, sigue vigente la versión anterior.
        </p>
      </header>

      <section aria-label="Fuentes" className="divide-y divide-[#001F58]/10 rounded-lg border border-[#001F58]/10 bg-white">
        {status.map((s) => (
          <div key={s.dataset} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="text-sm font-semibold text-[#001F58]">{SOURCE_LABEL[s.dataset]}</h2>
              <p className="text-sm tabular-nums text-slate-600">
                {s.lastApplied ? `${s.count} registros · vigencia ${date(s.lastApplied.sourceDate)} · aplicado ${date(s.lastApplied.appliedAt)}` : "Todavía no hay datos cargados. Buscá una actualización para traerlos."}
              </p>
            </div>
            <AeroCheckButton dataset={s.dataset} />
          </div>
        ))}
      </section>

      {failed.length > 0 && (
        <section aria-label="Últimas fallas" className="space-y-1 text-sm">
          <h2 className="font-semibold text-[#001F58]">Últimas lecturas fallidas</h2>
          {failed.map((f) => (
            <p key={f.id} className="text-red-800">
              {date(f.createdAt)} · {SOURCE_LABEL[f.dataset]}: {f.error}
            </p>
          ))}
        </section>
      )}

      <section aria-label="Informes pendientes" className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-[#001F58]">Pendientes de revisión</h2>
        {reports.length === 0 && <p className="text-sm text-slate-600">No hay actualizaciones para revisar. Se avisa por mail cuando aparece una.</p>}
        {reports.map((r) => {
          const missing = ((r.payload as { missing?: unknown[] } | null)?.missing ?? []).length;
          const diff = r.diff as unknown as AeroDiff;
          const warnings = (r.warnings ?? []) as string[];
          return (
            <article key={r.id} className="space-y-3 rounded-lg border border-[#001F58]/15 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-[#001F58]">{SOURCE_LABEL[r.dataset]}</h3>
                <p className="text-xs text-slate-500">
                  Fuente del {date(r.sourceDate)} ·{" "}
                  {r.sourceUrl && (
                    <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      ver original
                    </a>
                  )}
                </p>
              </div>
              {missing > 0 ? (
                <p className="text-sm text-slate-700">Lectura a medias: faltan {missing} registros. Tocá &quot;Buscar actualización&quot; para retomarla.</p>
              ) : (
                <>
                  <p className="text-sm tabular-nums text-slate-700">
                    {r.added} altas · {r.changed} cambios · {r.removed} bajas
                  </p>
                  <div className="space-y-2">
                    <List title="Altas" items={diff.added ?? []} />
                    <List title="Bajas" items={diff.removed ?? []} />
                    {(diff.changed?.length ?? 0) > 0 && (
                      <details className="rounded-lg border border-[#001F58]/10 bg-white p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-[#001F58]">Cambios ({diff.changed.length})</summary>
                        <ul className="mt-2 space-y-2 text-sm text-slate-700">
                          {diff.changed.slice(0, MAX_SHOWN).map((c) => (
                            <li key={c.code}>
                              <span className="font-mono text-xs">{c.code}</span> {c.name}
                              <ul className="ml-4 text-xs text-slate-600">
                                {c.fields.map((f) => (
                                  <li key={f.field}>
                                    {FIELD_LABEL[f.field] ?? f.field}: {f.from} → {f.to}
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {warnings.length > 0 && (
                      <details className="rounded-lg border border-amber-300 bg-amber-50 p-3" open={warnings.length <= 10}>
                        <summary className="cursor-pointer text-sm font-semibold text-amber-900">Avisos ({warnings.length})</summary>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                          {warnings.slice(0, MAX_SHOWN).map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <AeroReportActions id={r.id} />
                </>
              )}
            </article>
          );
        })}
      </section>

      <p className="text-xs text-slate-500">Fuentes: ANAC, MADHEL y Listado de Lugares Aptos Denunciados. Los datos del LAD se publican bajo licencia Creative Commons Atribución 4.0.</p>
    </div>
  );
}
